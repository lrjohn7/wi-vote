"""Backfill district assignments for 2025 vintage wards.

LTSB's 2024 dataset lacks ASM/SEN/CON columns, so all 7,086 wards in the
2025 vintage have null congressional_district, state_senate_district, and
assembly_district.

This script fills them in two passes:
1. ward_id match: copy districts from the 2022 vintage where ward_ids match
2. spatial fallback: for remaining nulls, find the 2022 ward whose geometry
   contains the 2025 ward's centroid

Usage:
    python data/scripts/backfill_districts.py
"""

import os
import sys

import psycopg2

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/wivote",
)
DATABASE_URL = DATABASE_URL.replace("+asyncpg", "").replace("+psycopg2", "")


def get_connection():
    return psycopg2.connect(DATABASE_URL)


def count_nulls(cur) -> int:
    """Count 2025 wards with any null district field."""
    cur.execute("""
        SELECT COUNT(*) FROM wards
        WHERE ward_vintage = 2025
          AND (congressional_district IS NULL
               OR state_senate_district IS NULL
               OR assembly_district IS NULL)
    """)
    return cur.fetchone()[0]


def backfill_by_ward_id(conn) -> int:
    """Pass 1: Copy districts from 2022 vintage where ward_ids match."""
    print("Pass 1: Backfilling by ward_id match...")
    cur = conn.cursor()

    cur.execute("""
        UPDATE wards w25
        SET congressional_district = w22.congressional_district,
            state_senate_district = w22.state_senate_district,
            assembly_district = w22.assembly_district
        FROM wards w22
        WHERE w25.ward_vintage = 2025
          AND w22.ward_vintage = 2022
          AND w25.ward_id = w22.ward_id
          AND w22.congressional_district IS NOT NULL
          AND (w25.congressional_district IS NULL
               OR w25.state_senate_district IS NULL
               OR w25.assembly_district IS NULL)
    """)

    matched = cur.rowcount
    conn.commit()
    print(f"  Updated {matched} wards by ward_id match")
    return matched


def backfill_by_spatial_join(conn) -> int:
    """Pass 2: For remaining nulls, use spatial join with 2022 wards."""
    print("Pass 2: Backfilling by spatial join (centroid containment)...")
    cur = conn.cursor()

    cur.execute("""
        UPDATE wards w25
        SET congressional_district = sub.congressional_district,
            state_senate_district = sub.state_senate_district,
            assembly_district = sub.assembly_district
        FROM (
            SELECT DISTINCT ON (w25_inner.ward_id)
                w25_inner.ward_id AS target_ward_id,
                w22.congressional_district,
                w22.state_senate_district,
                w22.assembly_district
            FROM wards w25_inner
            JOIN wards w22
              ON w22.ward_vintage = 2022
              AND w22.congressional_district IS NOT NULL
              AND ST_Contains(w22.geom, ST_Centroid(w25_inner.geom))
            WHERE w25_inner.ward_vintage = 2025
              AND (w25_inner.congressional_district IS NULL
                   OR w25_inner.state_senate_district IS NULL
                   OR w25_inner.assembly_district IS NULL)
            ORDER BY w25_inner.ward_id
        ) sub
        WHERE w25.ward_vintage = 2025
          AND w25.ward_id = sub.target_ward_id
    """)

    matched = cur.rowcount
    conn.commit()
    print(f"  Updated {matched} wards by spatial join")
    return matched


def main():
    print("=== Backfilling 2025 ward district assignments ===")
    conn = get_connection()

    try:
        cur = conn.cursor()

        # Check if there are 2025 wards at all
        cur.execute("SELECT COUNT(*) FROM wards WHERE ward_vintage = 2025")
        total_2025 = cur.fetchone()[0]
        if total_2025 == 0:
            print("No 2025 vintage wards found. Skipping.")
            return

        # Check if there are 2022 wards with districts
        cur.execute("""
            SELECT COUNT(*) FROM wards
            WHERE ward_vintage = 2022
              AND congressional_district IS NOT NULL
        """)
        source_count = cur.fetchone()[0]
        if source_count == 0:
            print("No 2022 vintage wards with districts found. Cannot backfill.")
            return

        nulls_before = count_nulls(cur)
        print(f"  Total 2025 wards: {total_2025}")
        print(f"  2022 wards with districts: {source_count}")
        print(f"  2025 wards needing districts: {nulls_before}")

        if nulls_before == 0:
            print("  All 2025 wards already have districts. Nothing to do.")
            return

        id_matched = backfill_by_ward_id(conn)

        nulls_after_pass1 = count_nulls(cur)
        if nulls_after_pass1 > 0:
            spatial_matched = backfill_by_spatial_join(conn)
        else:
            spatial_matched = 0

        nulls_after = count_nulls(cur)

        print("\n=== Summary ===")
        print(f"  Matched by ward_id:    {id_matched}")
        print(f"  Matched by spatial:    {spatial_matched}")
        print(f"  Still null:            {nulls_after}")
        print(f"  Total filled:          {nulls_before - nulls_after} / {nulls_before}")

    finally:
        conn.close()

    print("\nDone!")


if __name__ == "__main__":
    main()
