"""Official starting grid of each race, from the Jolpica F1 API (the Ergast successor).

Neither source the site builds from holds the starting grid: the FastF1 race
cache only has timing data, and OpenF1's position stream puts pit-lane starters
at the back with no marker. Jolpica's race results carry `grid`, the actual
starting slot after grid penalties, with 0 for a pit-lane start. It is the same
field FastF1 exposes as `GridPosition`.

The grids are saved in data/starting_grid.json ("year-round" -> {code: grid}),
so the site can be rebuilt offline. Races not in the file yet are fetched on
each update run; Jolpica usually publishes a result within a few hours.

Backfill or refresh by hand (from backend/):
    python data_pipeline/starting_grid.py            # fetch races missing from the file
    python data_pipeline/starting_grid.py --refresh  # re-fetch every race
"""

from __future__ import annotations

import argparse
import json
import logging
import time
from pathlib import Path

import requests

log = logging.getLogger("grid")

API = "https://api.jolpi.ca/ergast/f1/{year}/{rnd}/results.json"
ROOT = Path(__file__).resolve().parents[1]
GRID_FILE = ROOT / "data" / "starting_grid.json"


def load() -> dict[str, dict[str, int]]:
    return json.loads(GRID_FILE.read_text()) if GRID_FILE.exists() else {}


def save(grids: dict[str, dict[str, int]]) -> None:
    def order(k: str) -> tuple[int, int]:
        y, r = k.split("-")
        return int(y), int(r)

    out = {k: dict(sorted(grids[k].items(), key=lambda kv: (kv[1] == 0, kv[1]))) for k in sorted(grids, key=order)}
    GRID_FILE.write_text(json.dumps(out, indent=0) + "\n")


def fetch(year: int, rnd: int) -> dict[str, int] | None:
    """{driver code: starting slot} for one race, 0 = pit lane. None if Jolpica
    has no result for it yet."""
    for attempt in range(6):
        try:
            r = requests.get(API.format(year=year, rnd=rnd), params={"limit": 100}, timeout=60)
        except requests.RequestException as e:
            log.warning(f"{year} R{rnd}: {e}; retrying")
            time.sleep(5 * (attempt + 1))
            continue
        if r.status_code == 429 or r.status_code >= 500:
            time.sleep(5 * (attempt + 1))
            continue
        time.sleep(0.4)  # free tier: 4 requests a second
        r.raise_for_status()
        races = r.json()["MRData"]["RaceTable"]["Races"]
        if not races or not races[0].get("Results"):
            return None
        return {res["Driver"]["code"]: int(res["grid"]) for res in races[0]["Results"] if res["Driver"].get("code")}
    log.warning(f"{year} R{rnd}: Jolpica unreachable, grid not updated")
    return None


def update(races: list[tuple[int, int]], refresh: bool = False) -> int:
    """Fetch the grid of every race in `races` that the file does not hold yet.
    Returns the number of races added or changed. Network errors are logged, not
    raised, so a Jolpica outage never blocks a data update."""
    grids = load()
    changed = 0
    for year, rnd in races:
        key = f"{year}-{rnd}"
        if key in grids and not refresh:
            continue
        try:
            g = fetch(year, rnd)
        except requests.RequestException as e:
            log.warning(f"{year} R{rnd}: {e}")
            g = None
        if g is None:
            log.info(f"{year} R{rnd}: no starting grid published yet")
            continue
        if grids.get(key) != g:
            grids[key] = g
            changed += 1
    if changed:
        save(grids)
    log.info(f"starting grid: {changed} race(s) added or changed, {len(grids)} in {GRID_FILE.name}")
    return changed


def main() -> None:
    import pandas as pd

    ap = argparse.ArgumentParser()
    ap.add_argument("--refresh", action="store_true", help="re-fetch races already in the file")
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    csv = pd.read_csv(ROOT / "data" / "lap_model_dataset.csv", usecols=["year", "round"]).drop_duplicates()
    update(sorted(map(tuple, csv.astype(int).values.tolist())), refresh=args.refresh)


if __name__ == "__main__":
    main()
