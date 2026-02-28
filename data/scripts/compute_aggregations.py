"""Compute election aggregations, partisan lean, and ward trends.

Usage:
    python data/scripts/compute_aggregations.py

Tasks:
1. County-level aggregations (GROUP BY county, year, race_type)
2. Statewide aggregations (GROUP BY year, race_type)
3. Ward partisan lean (avg margin across 3 most recent presidential elections)
4. Ward trends (linear regression on presidential margins over time)

Uses sync psycopg2 driver, matching load_database.py pattern.
"""

import os
import sys
from datetime import datetime

import numpy as np
import psycopg2
from psycopg2.extras import execute_values

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/wivote",
)
DATABASE_URL = DATABASE_URL.replace("+asyncpg", "").replace("+psycopg2", "")


def get_connection():
    return psycopg2.connect(DATABASE_URL)


def compute_county_aggregations(conn) -> int:
    """Aggregate election results by county, year, race_type."""
    print("Computing county aggregations...")
    cur = conn.cursor()

    # Clear existing county aggregations
    cur.execute("DELETE FROM election_aggregations WHERE aggregation_level = 'county'")

    cur.execute("""
        INSERT INTO election_aggregations
            (aggregation_level, aggregation_key, election_year, race_type,
             dem_votes, rep_votes, other_votes, total_votes,
             dem_pct, rep_pct, margin, ward_count, created_at)
        SELECT
            'county',
            w.county,
            er.election_year,
            er.race_type,
            SUM(er.dem_votes),
            SUM(er.rep_votes),
            SUM(er.other_votes),
            SUM(er.total_votes),
            CASE WHEN SUM(er.total_votes) > 0
                THEN SUM(er.dem_votes)::float / SUM(er.total_votes) * 100
                ELSE 0 END,
            CASE WHEN SUM(er.total_votes) > 0
                THEN SUM(er.rep_votes)::float / SUM(er.total_votes) * 100
                ELSE 0 END,
            CASE WHEN SUM(er.total_votes) > 0
                THEN (SUM(er.dem_votes) - SUM(er.rep_votes))::float / SUM(er.total_votes) * 100
                ELSE 0 END,
            COUNT(DISTINCT er.ward_id),
            NOW()
        FROM election_results er
        JOIN wards w ON er.ward_id = w.ward_id AND er.ward_vintage = w.ward_vintage
        GROUP BY w.county, er.election_year, er.race_type
    """)

    count = cur.rowcount
    conn.commit()
    print(f"  Inserted {count} county aggregation rows")
    return count


def compute_statewide_aggregations(conn) -> int:
    """Aggregate election results statewide by year, race_type."""
    print("Computing statewide aggregations...")
    cur = conn.cursor()

    # Clear existing statewide aggregations
    cur.execute("DELETE FROM election_aggregations WHERE aggregation_level = 'statewide'")

    cur.execute("""
        INSERT INTO election_aggregations
            (aggregation_level, aggregation_key, election_year, race_type,
             dem_votes, rep_votes, other_votes, total_votes,
             dem_pct, rep_pct, margin, ward_count, created_at)
        SELECT
            'statewide',
            'WI',
            er.election_year,
            er.race_type,
            SUM(er.dem_votes),
            SUM(er.rep_votes),
            SUM(er.other_votes),
            SUM(er.total_votes),
            CASE WHEN SUM(er.total_votes) > 0
                THEN SUM(er.dem_votes)::float / SUM(er.total_votes) * 100
                ELSE 0 END,
            CASE WHEN SUM(er.total_votes) > 0
                THEN SUM(er.rep_votes)::float / SUM(er.total_votes) * 100
                ELSE 0 END,
            CASE WHEN SUM(er.total_votes) > 0
                THEN (SUM(er.dem_votes) - SUM(er.rep_votes))::float / SUM(er.total_votes) * 100
                ELSE 0 END,
            COUNT(DISTINCT er.ward_id),
            NOW()
        FROM election_results er
        GROUP BY er.election_year, er.race_type
    """)

    count = cur.rowcount
    conn.commit()
    print(f"  Inserted {count} statewide aggregation rows")
    return count


def compute_partisan_lean(conn) -> int:
    """Compute partisan lean for each ward.

    Partisan lean = average margin across the 3 most recent presidential elections.
    Positive = more Democratic, negative = more Republican.
    """
    print("Computing ward partisan lean...")
    cur = conn.cursor()

    # Get all wards with presidential elections
    cur.execute("""
        SELECT ward_id, election_year,
            CASE WHEN total_votes > 0
                THEN (dem_votes - rep_votes)::float / total_votes * 100
                ELSE 0 END AS margin
        FROM election_results
        WHERE race_type = 'president'
        ORDER BY ward_id, election_year DESC
    """)

    rows = cur.fetchall()

    # Group by ward, take 3 most recent
    ward_margins: dict[str, list[float]] = {}
    for ward_id, year, margin in rows:
        if ward_id not in ward_margins:
            ward_margins[ward_id] = []
        if len(ward_margins[ward_id]) < 3:
            ward_margins[ward_id].append(margin)

    # Update wards table
    updated = 0
    for ward_id, margins in ward_margins.items():
        if margins:
            lean = sum(margins) / len(margins)
            cur.execute(
                "UPDATE wards SET partisan_lean = %s WHERE ward_id = %s",
                (round(lean, 2), ward_id),
            )
            updated += 1

    conn.commit()
    print(f"  Updated partisan lean for {updated} wards")
    return updated


def compute_ward_trends(conn) -> int:
    """Compute linear trends for each ward's presidential elections.

    Uses numpy polyfit for linear regression on margins over time.
    Classification:
    - p < 0.05 and slope > 0: 'more_democratic'
    - p < 0.05 and slope < 0: 'more_republican'
    - otherwise: 'inconclusive'
    """
    print("Computing ward trends...")
    cur = conn.cursor()

    # Clear existing presidential trends
    cur.execute("DELETE FROM ward_trends WHERE race_type = 'president'")

    # Get all ward presidential results
    cur.execute("""
        SELECT er.ward_id, er.election_year,
            CASE WHEN er.total_votes > 0
                THEN (er.dem_votes - er.rep_votes)::float / er.total_votes * 100
                ELSE 0 END AS margin,
            er.ward_vintage
        FROM election_results er
        WHERE er.race_type = 'president'
        ORDER BY er.ward_id, er.election_year
    """)

    rows = cur.fetchall()

    # Group by ward
    ward_data: dict[str, list[tuple[int, float, int]]] = {}
    for ward_id, year, margin, vintage in rows:
        if ward_id not in ward_data:
            ward_data[ward_id] = []
        ward_data[ward_id].append((year, margin, vintage))

    # Compute trends for wards with 3+ elections
    trend_rows = []
    now = datetime.now()

    for ward_id, data in ward_data.items():
        if len(data) < 3:
            continue

        years = np.array([d[0] for d in data], dtype=float)
        margins = np.array([d[1] for d in data], dtype=float)
        vintage = data[0][2]

        # Linear regression using numpy
        n = len(years)
        x_mean = years.mean()
        y_mean = margins.mean()
        ss_xx = ((years - x_mean) ** 2).sum()
        ss_yy = ((margins - y_mean) ** 2).sum()
        ss_xy = ((years - x_mean) * (margins - y_mean)).sum()

        if ss_xx == 0:
            continue

        slope = ss_xy / ss_xx
        r_squared = (ss_xy ** 2) / (ss_xx * ss_yy) if ss_yy > 0 else 0.0

        # Compute t-statistic and p-value for slope
        residuals = margins - (slope * years + (y_mean - slope * x_mean))
        mse = (residuals ** 2).sum() / (n - 2) if n > 2 else 0
        se_slope = np.sqrt(mse / ss_xx) if ss_xx > 0 and mse > 0 else 0

        if se_slope > 0:
            t_stat = slope / se_slope
            # Approximate two-tailed p-value using normal distribution for simplicity
            # (adequate for n >= 5, conservative for smaller n)
            p_value = float(2 * (1 - _normal_cdf(abs(t_stat))))
        else:
            p_value = 1.0

        # Classify
        if p_value < 0.05 and slope > 0:
            direction = "more_democratic"
        elif p_value < 0.05 and slope < 0:
            direction = "more_republican"
        else:
            direction = "inconclusive"

        trend_rows.append((
            ward_id,
            "president",
            direction,
            round(float(slope), 4),
            round(float(r_squared), 4),
            round(p_value, 6),
            n,
            int(years.min()),
            int(years.max()),
            vintage,
            now,
        ))

    if trend_rows:
        execute_values(
            cur,
            """INSERT INTO ward_trends
                (ward_id, race_type, trend_direction, trend_slope, trend_r_squared,
                 trend_p_value, elections_analyzed, start_year, end_year,
                 ward_vintage, computed_at)
            VALUES %s""",
            trend_rows,
        )

    conn.commit()
    count = len(trend_rows)
    print(f"  Inserted {count} ward trend rows")
    return count


def _normal_cdf(x: float) -> float:
    """Approximate standard normal CDF using Abramowitz & Stegun formula."""
    import math
    if x < 0:
        return 1 - _normal_cdf(-x)
    t = 1.0 / (1.0 + 0.2316419 * x)
    d = 0.3989422804014327  # 1/sqrt(2*pi)
    poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
    return 1.0 - d * math.exp(-0.5 * x * x) * poly


def main():
    print("=== Computing aggregations and trends ===")
    conn = get_connection()

    try:
        # Ensure the election_aggregations table exists
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS election_aggregations (
                id SERIAL PRIMARY KEY,
                aggregation_level VARCHAR(20) NOT NULL,
                aggregation_key VARCHAR(100) NOT NULL,
                election_year INTEGER NOT NULL,
                race_type VARCHAR(50) NOT NULL,
                dem_votes INTEGER NOT NULL DEFAULT 0,
                rep_votes INTEGER NOT NULL DEFAULT 0,
                other_votes INTEGER NOT NULL DEFAULT 0,
                total_votes INTEGER NOT NULL DEFAULT 0,
                dem_pct FLOAT,
                rep_pct FLOAT,
                margin FLOAT,
                ward_count INTEGER,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                UNIQUE (aggregation_level, aggregation_key, election_year, race_type)
            )
        """)
        conn.commit()

        # Ensure partisan_lean column exists on wards table
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'wards' AND column_name = 'partisan_lean'
                ) THEN
                    ALTER TABLE wards ADD COLUMN partisan_lean FLOAT;
                END IF;
            END $$;
        """)
        conn.commit()

        county_count = compute_county_aggregations(conn)
        state_count = compute_statewide_aggregations(conn)
        lean_count = compute_partisan_lean(conn)
        trend_count = compute_ward_trends(conn)

        print("\n=== Summary ===")
        print(f"  County aggregation rows:  {county_count}")
        print(f"  Statewide aggregation rows: {state_count}")
        print(f"  Wards with partisan lean: {lean_count}")
        print(f"  Ward trend rows:          {trend_count}")

        # Verification queries
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM election_aggregations")
        total_agg = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM wards WHERE partisan_lean IS NOT NULL")
        lean_total = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM ward_trends WHERE race_type = 'president'")
        trend_total = cur.fetchone()[0]

        print(f"\n=== Verification ===")
        print(f"  election_aggregations total: {total_agg}")
        print(f"  wards with partisan_lean:    {lean_total}")
        print(f"  ward_trends (president):     {trend_total}")

    finally:
        conn.close()

    print("\nDone!")


if __name__ == "__main__":
    main()
