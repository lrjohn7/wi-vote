"""Parse WEC Spring Election Excel files and load Supreme Court results into the database.

Usage:
    python data/scripts/load_spring_elections.py

Reads Excel files from data/raw/spring/ and inserts into spring_election_results table.
"""

import os
from datetime import date
from pathlib import Path

import openpyxl
import psycopg2
from psycopg2.extras import execute_values

RAW_DIR = Path(__file__).resolve().parent.parent / "raw" / "spring"

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/wivote",
)
DATABASE_URL = DATABASE_URL.replace("+asyncpg", "").replace("+psycopg2", "")

# Each entry: (filename, year, election_date, sheet_index_for_supreme_court)
# Candidate ordering in the Excel varies by year, so we parse names from row 10.
SPRING_FILES = [
    ("2023_spring_statewide.xlsx", 2023, date(2023, 4, 4), 2),
    ("2025_spring_statewide.xlsx", 2025, date(2025, 4, 1), 2),
]

# Known partisan leanings for Supreme Court candidates (for consistent display)
# We normalize so candidate_1 is always the more conservative candidate
# and candidate_2 is always the more liberal candidate.
# This makes margin interpretation consistent: negative = conservative leads.
LIBERAL_CANDIDATES = {
    "Janet C. Protasiewicz",
    "Susan Crawford",
}

CONSERVATIVE_CANDIDATES = {
    "Daniel  Kelly",
    "Daniel Kelly",
    "Brad  Schimel",
    "Brad Schimel",
}


def parse_supreme_court_sheet(filepath: Path, sheet_index: int) -> list[dict]:
    """Parse a Supreme Court results sheet from a WEC Excel file."""
    wb = openpyxl.load_workbook(filepath, read_only=True, data_only=True)
    ws = wb.worksheets[sheet_index]

    rows_iter = ws.iter_rows(values_only=True)

    # Skip header rows (1-10)
    for i, row in enumerate(rows_iter, 1):
        if i == 7:
            contest_name = str(row[0]).strip() if row[0] else "JUSTICE OF THE SUPREME COURT"
        if i == 10:
            # Candidate names are in columns D and E (index 3 and 4)
            raw_cand_1 = str(row[3]).strip() if row[3] else "Candidate 1"
            raw_cand_2 = str(row[4]).strip() if row[4] else "Candidate 2"
            break

    # Normalize: ensure consistent ordering (conservative=cand1, liberal=cand2)
    # so that margin is always: negative=conservative leads, positive=liberal leads
    if raw_cand_1 in LIBERAL_CANDIDATES or raw_cand_2 in CONSERVATIVE_CANDIDATES:
        # Swap: Excel has liberal first, we want conservative first
        cand_1_name = raw_cand_2  # conservative
        cand_2_name = raw_cand_1  # liberal
        swap = True
    else:
        cand_1_name = raw_cand_1
        cand_2_name = raw_cand_2
        swap = False

    # Clean up double spaces in names
    cand_1_name = " ".join(cand_1_name.split())
    cand_2_name = " ".join(cand_2_name.split())

    results = []
    current_county = None

    for row in rows_iter:
        # Row structure: (county_or_none, reporting_unit, total_votes, cand1_votes, cand2_votes, scattering)
        # Some rows may be short
        if len(row) < 6:
            continue

        county_cell = row[0]
        ru_cell = row[1]
        total = row[2]
        votes_d = row[3]  # Column D in Excel
        votes_e = row[4]  # Column E in Excel
        scatter = row[5]

        # Update current county
        if county_cell and str(county_cell).strip():
            current_county = str(county_cell).strip()

        # Skip non-data rows
        if not ru_cell:
            continue
        ru_name = str(ru_cell).strip()
        if ru_name in ("County Totals:", ""):
            continue
        if current_county and current_county.startswith("Office Totals"):
            continue
        # Also skip if this row IS the office totals
        if county_cell and str(county_cell).strip().startswith("Office Totals"):
            continue

        # Parse vote counts
        try:
            total_votes = int(total) if total else 0
            d_votes = int(votes_d) if votes_d else 0
            e_votes = int(votes_e) if votes_e else 0
            scat_votes = int(scatter) if scatter else 0
        except (ValueError, TypeError):
            continue

        # Apply swap if needed
        if swap:
            c1_votes = e_votes  # conservative was in column E
            c2_votes = d_votes  # liberal was in column D
        else:
            c1_votes = d_votes
            c2_votes = e_votes

        results.append({
            "county": current_county,
            "reporting_unit": ru_name,
            "contest_name": contest_name,
            "candidate_1_name": cand_1_name,
            "candidate_1_votes": c1_votes,
            "candidate_2_name": cand_2_name,
            "candidate_2_votes": c2_votes,
            "scattering_votes": scat_votes,
            "total_votes": total_votes,
        })

    wb.close()
    return results


def load_results(conn, year: int, election_date: date, results: list[dict]) -> int:
    """Bulk insert spring election results into the database."""
    cur = conn.cursor()

    # Clear existing data for this year + contest
    if results:
        contest = results[0]["contest_name"]
        cur.execute(
            "DELETE FROM spring_election_results WHERE election_year = %s AND contest_name = %s",
            (year, contest),
        )
        conn.commit()

    rows = [
        (
            r["county"],
            r["reporting_unit"],
            year,
            election_date,
            r["contest_name"],
            r["candidate_1_name"],
            r["candidate_1_votes"],
            r["candidate_2_name"],
            r["candidate_2_votes"],
            r["scattering_votes"],
            r["total_votes"],
        )
        for r in results
    ]

    sql = """
        INSERT INTO spring_election_results (
            county, reporting_unit, election_year, election_date,
            contest_name, candidate_1_name, candidate_1_votes,
            candidate_2_name, candidate_2_votes, scattering_votes,
            total_votes, created_at
        ) VALUES %s
        ON CONFLICT ON CONSTRAINT idx_spring_unique DO UPDATE SET
            candidate_1_votes = EXCLUDED.candidate_1_votes,
            candidate_2_votes = EXCLUDED.candidate_2_votes,
            scattering_votes = EXCLUDED.scattering_votes,
            total_votes = EXCLUDED.total_votes
    """
    template = "(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())"

    execute_values(cur, sql, rows, template=template, page_size=500)
    conn.commit()
    cur.close()
    return len(rows)


def main() -> None:
    print("Spring Election Data Loading")
    print("=" * 60)

    conn = psycopg2.connect(DATABASE_URL)

    for filename, year, election_date, sheet_idx in SPRING_FILES:
        filepath = RAW_DIR / filename
        if not filepath.exists():
            print(f"  SKIP: {filepath} not found")
            continue

        print(f"\n[{year} Spring Election — {filename}]")
        results = parse_supreme_court_sheet(filepath, sheet_idx)
        print(f"  Parsed {len(results)} reporting units")

        if results:
            print(f"  Candidates: {results[0]['candidate_1_name']} vs {results[0]['candidate_2_name']}")
            total_c1 = sum(r["candidate_1_votes"] for r in results)
            total_c2 = sum(r["candidate_2_votes"] for r in results)
            print(f"  Totals: {results[0]['candidate_1_name']}={total_c1:,} | {results[0]['candidate_2_name']}={total_c2:,}")

            loaded = load_results(conn, year, election_date, results)
            print(f"  Loaded {loaded} rows into database")

    # Verify
    print("\nVerification:")
    cur = conn.cursor()
    cur.execute("""
        SELECT election_year, contest_name, candidate_1_name, candidate_2_name,
               COUNT(*), SUM(candidate_1_votes), SUM(candidate_2_votes), SUM(total_votes)
        FROM spring_election_results
        GROUP BY election_year, contest_name, candidate_1_name, candidate_2_name
        ORDER BY election_year
    """)
    for row in cur.fetchall():
        print(f"  {row[0]} {row[1]}")
        print(f"    {row[2]}: {row[5]:,}")
        print(f"    {row[3]}: {row[6]:,}")
        print(f"    Reporting units: {row[4]}, Total votes: {row[7]:,}")

    cur.execute("SELECT COUNT(DISTINCT county) FROM spring_election_results")
    print(f"  Counties: {cur.fetchone()[0]}")

    cur.close()
    conn.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
