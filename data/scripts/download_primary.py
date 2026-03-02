"""Download Wisconsin primary election data from OpenElections GitHub repository.

Usage:
    python data/scripts/download_primary.py             # Download all years
    python data/scripts/download_primary.py --year 2018  # Download only 2018
    python data/scripts/download_primary.py --force       # Re-download even if files exist

Downloads ward-level partisan primary CSV files containing gubernatorial primary
results at the reporting-unit level. Data comes from the OpenElections project:
https://github.com/openelections/openelections-data-wi

Output: data/raw/primary/primary_{year}_ward.csv
"""

import argparse
import csv
import io
import sys
import time
from pathlib import Path

import httpx

RAW_DIR = Path(__file__).resolve().parent.parent / "raw" / "primary"
RAW_DIR.mkdir(parents=True, exist_ok=True)

# OpenElections GitHub raw content base URL
GITHUB_RAW_BASE = (
    "https://raw.githubusercontent.com/openelections/openelections-data-wi/master"
)

# Primary election files: year -> path within the repository
PRIMARY_FILES: dict[int, str] = {
    2002: "2002/20020910__wi__primary__ward.csv",
    2006: "2006/20060912__wi__primary__ward.csv",
    2010: "2010/20100914__wi__primary__ward.csv",
    2014: "2014/20140812__wi__primary__ward.csv",
    2018: "2018/20180814__wi__primary__ward.csv",
}

# Expected columns in the OpenElections CSV format (lowercase, underscored)
EXPECTED_COLUMNS = {"county", "ward", "office", "district", "party", "candidate", "votes"}

MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 2  # seconds


def build_url(repo_path: str) -> str:
    """Build the raw GitHub content URL for a file path."""
    return f"{GITHUB_RAW_BASE}/{repo_path}"


def validate_csv(content: str, year: int) -> tuple[bool, int, list[str]]:
    """Validate that content is a valid CSV with expected columns.

    Returns (is_valid, row_count, list of error messages).
    """
    errors: list[str] = []
    row_count = 0

    try:
        reader = csv.DictReader(io.StringIO(content))
        if reader.fieldnames is None:
            errors.append("No header row found")
            return False, 0, errors

        # Normalize column names for comparison (lowercase, stripped)
        actual_cols = {c.strip().lower().replace(" ", "_") for c in reader.fieldnames}

        # Normalize expected columns the same way
        normalized_expected = {col.replace(" ", "_") for col in EXPECTED_COLUMNS}

        missing = normalized_expected - actual_cols
        if missing:
            errors.append(f"Missing expected columns: {missing}")

        # Count rows
        for _row in reader:
            row_count += 1

        if row_count == 0:
            errors.append("CSV has header but no data rows")

    except csv.Error as e:
        errors.append(f"CSV parse error: {e}")
        return False, 0, errors

    is_valid = len(errors) == 0
    return is_valid, row_count, errors


def download_file(
    year: int,
    repo_path: str,
    client: httpx.Client,
    force: bool = False,
) -> dict[str, object]:
    """Download a single primary election CSV file.

    Returns a status dict with keys: year, status, message, rows, size_kb.
    """
    output_path = RAW_DIR / f"primary_{year}_ward.csv"
    result: dict[str, object] = {"year": year, "status": "UNKNOWN", "message": ""}

    # Skip if already downloaded (unless --force)
    if output_path.exists() and not force:
        size_kb = output_path.stat().st_size / 1024
        # Quick row count of existing file
        with open(output_path, "r", encoding="utf-8") as f:
            existing_rows = sum(1 for _ in f) - 1  # minus header
        print(f"  SKIP: {output_path.name} already exists ({existing_rows} rows, {size_kb:.1f} KB)")
        result["status"] = "SKIPPED"
        result["message"] = "Already exists"
        result["rows"] = existing_rows
        result["size_kb"] = int(size_kb)
        return result

    url = build_url(repo_path)
    print(f"  Downloading from: {url}")

    # Retry loop with exponential backoff
    last_error: str = ""
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = client.get(url, timeout=60)
            response.raise_for_status()

            content = response.text

            # Validate CSV
            is_valid, row_count, errors = validate_csv(content, year)
            if not is_valid:
                error_msg = "; ".join(errors)
                print(f"  WARNING: CSV validation failed: {error_msg}")
                result["status"] = "INVALID"
                result["message"] = error_msg
                result["rows"] = row_count
                return result

            # Save to file
            with open(output_path, "w", encoding="utf-8", newline="") as f:
                f.write(content)

            size_kb = output_path.stat().st_size / 1024
            print(f"  Saved: {output_path.name} ({row_count} rows, {size_kb:.1f} KB)")

            result["status"] = "OK"
            result["message"] = f"{row_count} rows"
            result["rows"] = row_count
            result["size_kb"] = int(size_kb)
            return result

        except httpx.HTTPStatusError as e:
            last_error = f"HTTP {e.response.status_code}: {e.response.reason_phrase}"
            if e.response.status_code == 404:
                print(f"  ERROR: File not found (404) -- {repo_path}")
                result["status"] = "FAILED"
                result["message"] = "File not found (404)"
                return result
        except httpx.ConnectError as e:
            last_error = f"Connection error: {e}"
        except httpx.TimeoutException:
            last_error = "Request timed out"
        except httpx.HTTPError as e:
            last_error = str(e)

        if attempt < MAX_RETRIES:
            wait = RETRY_BACKOFF_BASE ** attempt
            print(f"  Attempt {attempt}/{MAX_RETRIES} failed: {last_error}")
            print(f"  Retrying in {wait}s...")
            time.sleep(wait)

    print(f"  FAILED after {MAX_RETRIES} attempts: {last_error}")
    result["status"] = "FAILED"
    result["message"] = last_error
    return result


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download Wisconsin primary election data from OpenElections GitHub."
    )
    parser.add_argument(
        "--year",
        type=int,
        choices=sorted(PRIMARY_FILES.keys()),
        help="Download only a specific year (default: all years)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download even if files already exist",
    )
    args = parser.parse_args()

    print("OpenElections Primary Data Download")
    print("=" * 60)
    print(f"Output directory: {RAW_DIR}")
    print()

    # Determine which years to download
    if args.year:
        years_to_download = {args.year: PRIMARY_FILES[args.year]}
    else:
        years_to_download = PRIMARY_FILES

    results: list[dict[str, object]] = []

    with httpx.Client() as client:
        for year, repo_path in sorted(years_to_download.items()):
            print(f"[{year} Primary]")
            print(f"  File: {repo_path}")
            result = download_file(year, repo_path, client, force=args.force)
            results.append(result)
            print()

    # -- Summary --
    print("=" * 60)
    print("Summary:")
    fmt = "  {:<6} {:<10} {:<8} {:<10} {}"
    print(fmt.format("Year", "Status", "Rows", "Size", "Details"))
    print("  {} {} {} {} {}".format("-" * 6, "-" * 10, "-" * 8, "-" * 10, "-" * 20))
    for r in results:
        year_str = str(r["year"])
        status = str(r["status"])
        rows = str(r.get("rows", "-"))
        size = "{} KB".format(r["size_kb"]) if "size_kb" in r else "-"
        msg = str(r.get("message", ""))
        print(fmt.format(year_str, status, rows, size, msg))

    ok_count = sum(1 for r in results if r["status"] in ("OK", "SKIPPED"))
    fail_count = sum(1 for r in results if r["status"] == "FAILED")
    print()
    print(f"  Downloaded: {ok_count}/{len(results)} files")
    if fail_count:
        print(f"  Failed: {fail_count} files")

    # List all files in output directory
    existing = sorted(RAW_DIR.glob("*.csv"))
    if existing:
        print(f"\nFiles in {RAW_DIR}:")
        for f in existing:
            size_kb = f.stat().st_size / 1024
            print(f"  {f.name} ({size_kb:.1f} KB)")

    if fail_count:
        sys.exit(1)


if __name__ == "__main__":
    main()
