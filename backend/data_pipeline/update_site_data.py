"""Bring the website data up to date. This is what the scheduled GitHub Action runs.

  1. download every finished race from 2024 on that is not saved yet (OpenF1)
  2. fetch the official starting grid of races that lack one (Jolpica)
  3. rebuild the 2024+ rows of data/lap_model_dataset.csv from the saved races
     (2019-2023 rows, which came from FastF1, are kept as they are)
  4. rebuild frontend/public/data with build_site_data.py
  5. check that no finished race is missing (exits with an error if one is)

Usage (from backend/):
    python data_pipeline/update_site_data.py            # fetch new races + rebuild
    python data_pipeline/update_site_data.py --offline  # rebuild from saved data only
    python data_pipeline/update_site_data.py --train    # also retrain the API's lap-time model
"""

from __future__ import annotations

import argparse
import json
import logging
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
import openf1_source as of1  # noqa: E402
import starting_grid  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / "data" / "lap_model_dataset.csv"
RACE_IDS = ROOT / "data" / "race_ids.json"

log = logging.getLogger("update")


def load_race_ids(csv: pd.DataFrame) -> dict[str, int]:
    """Stable race ids ("year-round" -> id). They are the race URLs on the site
    (#/race/<id>), so an id never changes once given out."""
    ids = json.loads(RACE_IDS.read_text()) if RACE_IDS.exists() else {}
    for (y, r), rid in csv.groupby(["year", "round"])["race_id"].first().items():
        ids.setdefault(f"{y}-{r}", int(rid))
    return ids


def merge_openf1_rows(csv: pd.DataFrame) -> pd.DataFrame:
    base = csv[csv["year"] < of1.FIRST_SEASON]
    race_ids = load_race_ids(base)
    driver_ids = dict(zip(base["driver_code"], base["driver_id"]))
    parts = [base]
    for path in of1.all_snapshots():
        snap = of1.load(path)
        key = f"{snap['year']}-{snap['round']}"
        if key not in race_ids:
            race_ids[key] = max(race_ids.values(), default=0) + 1
        for d in snap["drivers"]:
            code = d.get("name_acronym")
            if code and code not in driver_ids:
                driver_ids[code] = max(driver_ids.values(), default=0) + 1
        parts.append(of1.lap_rows(snap, race_ids[key], driver_ids))
    RACE_IDS.write_text(json.dumps(dict(sorted(race_ids.items(), key=lambda kv: kv[1])), indent=0))
    out = pd.concat(parts, ignore_index=True)
    out["driver_id"] = out["driver_id"].astype(int)
    return out


def check_complete() -> list[str]:
    """Every finished race since 2019 must be on the site. Returns what is missing."""
    index = json.loads((ROOT.parent / "frontend" / "public" / "data" / "index.json").read_text())
    have = {(r["year"], r["round"]) for r in index["races"]}
    gaps_file = ROOT / "data" / "known_gaps.json"
    known_gaps = {tuple(g) for g in json.loads(gaps_file.read_text())["races"]} if gaps_file.exists() else set()

    missing = []
    for year in range(2019, datetime.now(timezone.utc).year + 1):
        for r in of1.schedule(year).itertuples():
            if of1.finished(r.race_utc) and (year, r.round) not in have | known_gaps:
                missing.append(f"{year} R{r.round} {r.name}")
    return missing


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true", help="do not download, rebuild from saved data")
    ap.add_argument("--train", action="store_true", help="also retrain models/lap_time_model.pkl")
    ap.add_argument("--no-check", action="store_true", help="skip the missing-race check")
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    if not args.offline:
        new = of1.fetch_missing()
        log.info(f"downloaded {len(new)} new race(s)")

    csv = merge_openf1_rows(pd.read_csv(CSV))
    csv.to_csv(CSV, index=False)
    log.info(f"lap table: {len(csv)} rows, {csv['race_id'].nunique()} races -> {CSV.relative_to(ROOT)}")
    if not args.offline:
        races = csv[["year", "round"]].drop_duplicates().astype(int).values.tolist()
        starting_grid.update(sorted(map(tuple, races)))

    subprocess.run([sys.executable, str(ROOT / "data_pipeline" / "build_site_data.py")], check=True, cwd=ROOT)
    if args.train:
        subprocess.run([sys.executable, str(ROOT / "scripts" / "train_model.py")], check=True, cwd=ROOT)

    if not args.no_check:
        missing = check_complete()
        if missing:
            log.error("finished races missing from the site:\n  " + "\n  ".join(missing))
            sys.exit(1)
        log.info("every finished race since 2019 is on the site (apart from data/known_gaps.json)")


if __name__ == "__main__":
    main()
