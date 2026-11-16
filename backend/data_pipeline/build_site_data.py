"""Build the static data bundle that powers the RI360 website (frontend/public/data).

Inputs
  data/lap_model_dataset.csv   lap table exported from the RaceIntel360 DB
  cache/<year>/<event>/<race>  raw FastF1 timing cache (driver info, sectors,
                               session clock, track status, weather)

Outputs
  frontend/public/data/index.json        seasons, race summaries, drivers, QA report
  frontend/public/data/races/<id>.json   one file per race: laps, stints, model

Run from the repository root:  python data_pipeline/build_site_data.py
Only pandas and numpy are required.
"""

from __future__ import annotations

import glob
import json
import pickle
import unicodedata
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / "data" / "lap_model_dataset.csv"
CACHE = ROOT / "cache"
OUT = ROOT.parent / "frontend" / "public" / "data"

DRY = ["SOFT", "MEDIUM", "HARD"]
SHORT = {"SOFT": "S", "MEDIUM": "M", "HARD": "H", "INTERMEDIATE": "I", "WET": "W"}
KEY = ["race_id", "driver_code", "lap_number"]
# FastF1 track status codes
NEUTRAL = {"4": "SC", "5": "RED", "6": "VSC", "7": "VSC"}
PIT_LOSS_DEFAULT = 22.0  # the constant the API's simulator uses
# the timing feed names some venues two ways across seasons
LOCATION_ALIAS = {"Marina Bay": "Singapore", "Monte Carlo": "Monaco", "Spa-Francorchamps": "Spa", "Yas Island": "Yas Marina"}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return s.lower().replace("_", " ").strip()


def load_pkl(path: Path, default=None):
    """Read one FastF1 cache file; a few race folders are incomplete."""
    if not path.exists():
        alt = path.with_suffix(".pkl")
        if not alt.exists():
            return default
        path = alt
    with open(path, "rb") as f:
        obj = pickle.load(f)
    return obj["data"] if isinstance(obj, dict) and "data" in obj else obj


def secs(td) -> float | None:
    if td is None or pd.isna(td):
        return None
    return float(td.total_seconds())


def r3(x):
    return None if x is None or (isinstance(x, float) and np.isnan(x)) else round(float(x), 3)


# --------------------------------------------------------------------------
# cache readers
# --------------------------------------------------------------------------

def cache_dirs() -> dict[tuple[int, str], Path]:
    out = {}
    for d in glob.glob(str(CACHE / "*" / "*" / "*_Race")):
        p = Path(d)
        year = int(p.parts[-3])
        event = p.parts[-2].split("_", 1)[1]
        out[(year, norm(event))] = p
    return out


def read_cache(p: Path) -> dict:
    """Everything the site needs from one race's FastF1 cache folder."""
    info = load_pkl(p / "session_info.ff1pkl", {})
    meeting = info.get("Meeting", {})
    res = {
        "location": LOCATION_ALIAS.get(meeting.get("Location"), meeting.get("Location")),
        "country": (meeting.get("Country") or {}).get("Name"),
        "date": info["StartDate"].date().isoformat() if info.get("StartDate") else None,
        "drivers": {},
        "ext": pd.DataFrame(columns=["driver_code", "lap_number", "end", "raw_time", "s1", "s2", "s3", "trap"]),
        "neutral_times": [],
        "weather": None,
        "final": {},
    }

    for num, d in load_pkl(p / "driver_info.ff1pkl", {}).items():
        if not d.get("Tla"):
            continue
        first, last = d.get("FirstName") or "", d.get("LastName") or ""
        name = f"{first} {last}".strip() or (d.get("FullName") or d["Tla"]).title()
        res["drivers"][d["Tla"]] = {
            "num": str(d.get("RacingNumber") or num),
            "name": name,
            "team": d.get("TeamName") or "",
        }

    ext = load_pkl(p / "_extended_timing_data.ff1pkl")
    if ext is None or not res["drivers"]:
        return res
    ext, stream = ext[0], ext[1]
    num_to_tla = {v["num"]: k for k, v in res["drivers"].items()}
    ext = ext.assign(code=ext["Driver"].map(num_to_tla)).dropna(subset=["code"])
    ext = ext.drop_duplicates(["code", "NumberOfLaps"], keep="last")
    # last value of the live position stream = classification on the road
    last_pos = stream.dropna(subset=["Position"]).groupby("Driver")["Position"].last()
    res["final"] = {num_to_tla[n]: int(p) for n, p in last_pos.items() if n in num_to_tla}
    res["ext"] = pd.DataFrame(
        {
            "driver_code": ext["code"].values,
            "lap_number": ext["NumberOfLaps"].astype(int).values,
            "end": ext["Time"].dt.total_seconds().values,
            "raw_time": ext["LapTime"].dt.total_seconds().values,
            "s1": ext["Sector1Time"].dt.total_seconds().values,
            "s2": ext["Sector2Time"].dt.total_seconds().values,
            "s3": ext["Sector3Time"].dt.total_seconds().values,
            "trap": ext["SpeedST"].values,
        }
    )

    ts = load_pkl(p / "track_status_data.ff1pkl", {"Time": [], "Status": []})
    times = [t.total_seconds() for t in ts["Time"]]
    for i, status in enumerate(ts["Status"]):
        kind = NEUTRAL.get(str(status))
        if kind:
            end = times[i + 1] if i + 1 < len(times) else float("inf")
            res["neutral_times"].append((kind, times[i], end))

    w = load_pkl(p / "weather_data.ff1pkl", {})
    if w.get("AirTemp"):
        res["weather"] = {
            "air": round(float(np.mean(w["AirTemp"])), 1),
            "track": round(float(np.mean(w["TrackTemp"])), 1),
            "rain": bool(np.mean(w["Rainfall"]) > 0.05),
        }
    return res


def neutral_laps(ext: pd.DataFrame, spans) -> dict[int, str]:
    """Map SC / VSC / red-flag time spans onto lap numbers via the leader's clock."""
    lead_end = ext.groupby("lap_number")["end"].min().dropna().sort_index()
    out: dict[int, str] = {}
    prev = None
    rank = {"VSC": 1, "SC": 2, "RED": 3}
    for lap, end in lead_end.items():
        start = prev if prev is not None else end - 120
        for kind, a, b in spans:
            if a < end and b > start and rank[kind] > rank.get(out.get(lap, ""), 0):
                out[int(lap)] = kind
        prev = end
    return out


# --------------------------------------------------------------------------
# pace model
# --------------------------------------------------------------------------

def fit_pace_model(laps: pd.DataFrame, rng: np.random.Generator) -> dict | None:
    """lap = driver_base + fuel * laps_remaining + compound_offset + deg[compound] * tyre_age

    Ordinary least squares on clean, green-flag, dry-tyre laps of one race.
    """
    d = laps[laps["clean"]].copy()
    counts = d["compound"].value_counts()
    comps = [c for c in DRY if counts.get(c, 0) >= 40]
    d = d[d["compound"].isin(comps)]
    if len(d) < 200 or not comps:
        return None
    drivers = sorted(d["driver_code"].unique())
    ref = max(comps, key=lambda c: counts[c])
    others = [c for c in comps if c != ref]

    def design(frame: pd.DataFrame, per_compound_deg: bool) -> np.ndarray:
        cols = [(frame["driver_code"] == drv).astype(float).values for drv in drivers]
        cols.append(frame["fuel_lap_from_end"].astype(float).values)
        cols += [(frame["compound"] == c).astype(float).values for c in others]
        age = frame["tyre_life"].astype(float).values
        if per_compound_deg:
            cols += [age * (frame["compound"] == c).values for c in comps]
        else:
            cols.append(age)
        return np.column_stack(cols)

    def solve(frame: pd.DataFrame, per_compound_deg: bool):
        X = design(frame, per_compound_deg)
        beta, *_ = np.linalg.lstsq(X, frame["lap_time_secs"].values, rcond=None)
        return beta

    def unpack(beta, per_compound_deg):
        n = len(drivers)
        base = dict(zip(drivers, beta[:n]))
        fuel = beta[n]
        offset = {ref: 0.0, **dict(zip(others, beta[n + 1 : n + 1 + len(others)]))}
        rest = beta[n + 1 + len(others) :]
        deg = dict(zip(comps, rest)) if per_compound_deg else {c: rest[0] for c in comps}
        return base, fuel, offset, deg

    per = True
    beta = solve(d, per)
    base, fuel, offset, deg = unpack(beta, per)
    quality = "per-compound"
    if min(deg.values()) < 0 or fuel < 0:
        per = False
        beta = solve(d, per)
        base, fuel, offset, deg = unpack(beta, per)
        quality = "pooled"
    if min(deg.values()) < 0 or fuel < 0:
        # degradation cannot be separated from fuel burn and track evolution here
        quality = "weak"
        deg = {c: max(0.0, v) for c, v in deg.items()}
        fuel = max(0.0, fuel)

    resid = d["lap_time_secs"].values - design(d, per) @ beta
    ss_res = float((resid**2).sum())
    centred = d["lap_time_secs"] - d.groupby("driver_code")["lap_time_secs"].transform("mean")
    ss_tot = float((centred**2).sum())

    # hold-out check: refit on 80 % of laps, score the unseen 20 %
    mask = rng.random(len(d)) < 0.8
    mae_out = None
    if mask.sum() > 150 and (~mask).sum() > 30 and set(d[mask]["driver_code"]) == set(drivers):
        b2 = solve(d[mask], per)
        test = d[~mask]
        mae_out = float(np.abs(test["lap_time_secs"].values - design(test, per) @ b2).mean())

    return {
        "ref": SHORT[ref],
        "fuel": round(float(fuel), 4),
        "offset": {SHORT[c]: round(float(v), 3) for c, v in offset.items()},
        "deg": {SHORT[c]: round(float(v), 4) for c, v in deg.items()},
        "base": {k: round(float(v), 3) for k, v in base.items()},
        "n": int(len(d)),
        "mae": round(float(np.abs(resid).mean()), 3),
        "maeHoldout": None if mae_out is None else round(mae_out, 3),
        # share of within-driver lap-time variance explained
        "r2": round(1 - ss_res / ss_tot, 3) if ss_tot > 0 else None,
        "quality": quality,
    }


def estimate_pit_loss(laps: pd.DataFrame) -> tuple[float, int]:
    """Median of (in-lap + out-lap) minus two typical laps, green-flag stops only."""
    typical = laps[laps["clean"]].groupby("driver_code")["lap_time_secs"].median()
    by = laps.set_index(["driver_code", "lap_number"])
    losses = []
    for (drv, lap), row in by[by["pit_stop"] == 1].iterrows():
        nxt = (drv, lap + 1)
        if nxt not in by.index or drv not in typical.index:
            continue
        out = by.loc[nxt]
        if row["neutral"] or out["neutral"]:
            continue
        loss = row["lap_time_secs"] + out["lap_time_secs"] - 2 * typical[drv]
        if 10 < loss < 45:
            losses.append(loss)
    if len(losses) < 4:
        return PIT_LOSS_DEFAULT, len(losses)
    return round(float(np.median(losses)), 1), len(losses)


# --------------------------------------------------------------------------
# build
# --------------------------------------------------------------------------

def main() -> None:
    rng = np.random.default_rng(360)
    raw = pd.read_csv(CSV)
    qa = {"rawRows": int(len(raw))}

    dup = raw.duplicated(KEY)
    qa["duplicateRows"] = int(dup.sum())
    qa["duplicatesByYear"] = {int(y): int(n) for y, n in raw[dup].groupby("year").size().items()}
    df = raw[~dup].copy()
    df["compound"] = df["compound"].str.upper()
    qa["unknownCompoundRows"] = int((~df["compound"].isin(SHORT)).sum())
    qa["missingTyreLife"] = int(df["tyre_life"].isna().sum())
    # the duplicated rows also inflated lap_in_stint in the export; rebuild it
    df = df.sort_values(["race_id", "driver_code", "lap_number"])
    df["lap_in_stint"] = df.groupby(["race_id", "driver_code", "stint"]).cumcount() + 1
    df["tyre_life"] = df["tyre_life"].fillna(df["lap_in_stint"])
    qa["rows"] = int(len(df))

    dirs = cache_dirs()
    (OUT / "races").mkdir(parents=True, exist_ok=True)
    for old in (OUT / "races").glob("*.json"):
        old.unlink()

    races, people, pace_rows = [], {}, []
    sector_checked = sector_matched = 0

    for race_id, laps in df.groupby("race_id"):
        year, rnd, name = int(laps["year"].iat[0]), int(laps["round"].iat[0]), laps["race_name"].iat[0]
        cache = read_cache(dirs[(year, norm(name))])
        laps = laps.merge(cache["ext"], on=["driver_code", "lap_number"], how="left")

        both = laps.dropna(subset=["raw_time"])
        sector_checked += len(both)
        sector_matched += int((np.abs(both["raw_time"] - both["lap_time_secs"]) < 0.002).sum())

        nl = neutral_laps(cache["ext"], cache["neutral_times"])
        laps["neutral"] = laps["lap_number"].map(nl).notna()
        total_laps = int(laps["lap_number"].max())

        # clean = representative racing lap
        out_lap = (laps["lap_in_stint"] == 1) & (laps["stint"] > 1)
        cand = (
            (laps["lap_number"] > 1)
            & (laps["pit_stop"] == 0)
            & ~out_lap
            & ~laps["neutral"]
            & laps["compound"].isin(DRY)
        )
        med = laps[cand].groupby("driver_code")["lap_time_secs"].median()
        laps["clean"] = cand & (laps["lap_time_secs"] <= 1.07 * laps["driver_code"].map(med))

        model = fit_pace_model(laps, rng)
        if model and (~laps["compound"].isin(DRY)).mean() > 0.1:
            model["quality"] = "mixed"  # wet-to-dry race: track evolution dominates
        pit_loss, pit_n = estimate_pit_loss(laps)
        wet_share = float((~laps["compound"].isin(DRY)).mean())

        # classification on the road: final value of the timing position stream,
        # falling back to laps completed then last recorded position
        last = laps.sort_values("lap_number").groupby("driver_code").tail(1)
        last = last.assign(final=last["driver_code"].map(cache["final"]).fillna(99), neg=-last["lap_number"])
        order = last.sort_values(["final", "neg", "position"])["driver_code"].tolist()
        winner = order[0]

        # reference clock for the race trace: the winner's average pace
        wl = laps[(laps["driver_code"] == winner)].dropna(subset=["end"]).sort_values("lap_number")
        ref = None
        if len(wl) > 5:
            l0, e0 = int(wl["lap_number"].iat[0]), float(wl["end"].iat[0])
            l1, e1 = int(wl["lap_number"].iat[-1]), float(wl["end"].iat[-1])
            ref = (l0, e0, (e1 - e0) / (l1 - l0))

        best_s = {k: laps.loc[laps["clean"], k].min() for k in ("s1", "s2", "s3")}
        fastest = laps.loc[laps["lap_time_secs"].idxmin()]
        clean_med = laps[laps["clean"]].groupby("driver_code")["lap_time_secs"].agg(["median", "size"])
        best_med = clean_med.loc[clean_med["size"] >= 8, "median"].min() if len(clean_med) else np.nan

        drivers_out = []
        for pos, code in enumerate(order, start=1):
            dl = laps[laps["driver_code"] == code].sort_values("lap_number")
            meta = cache["drivers"].get(code, {"num": "", "name": code, "team": ""})
            people.setdefault(code, {"name": meta["name"], "seasons": {}})
            people[code]["name"] = meta["name"]
            people[code]["seasons"][str(year)] = {"team": meta["team"], "num": meta["num"]}

            stints = []
            for _, s in dl.groupby("stint"):
                stints.append(
                    {
                        "c": SHORT.get(s["compound"].iat[0], "?"),
                        "from": int(s["lap_number"].min()),
                        "to": int(s["lap_number"].max()),
                        "age": int(s["tyre_life"].iat[0]),
                    }
                )
            gap = None
            if ref:
                gap = [
                    None if pd.isna(e) else round(ref[1] + (n - ref[0]) * ref[2] - e, 2)
                    for n, e in zip(dl["lap_number"], dl["end"])
                ]
            cm = clean_med.loc[code] if code in clean_med.index else None
            pace = float(cm["median"]) if cm is not None and cm["size"] >= 8 else None
            best = dl.loc[dl["lap_time_secs"].idxmin()]
            drivers_out.append(
                {
                    "code": code,
                    "name": meta["name"],
                    "team": meta["team"],
                    "num": meta["num"],
                    "pos": pos,
                    "grid": int(dl["position"].iat[0]),
                    "laps": int(dl["lap_number"].max()),
                    "best": r3(best["lap_time_secs"]),
                    "bestLap": int(best["lap_number"]),
                    "pace": r3(pace),
                    "n": dl["lap_number"].astype(int).tolist(),
                    "t": [r3(x) for x in dl["lap_time_secs"]],
                    "p": dl["position"].astype(int).tolist(),
                    "s1": [r3(x) for x in dl["s1"]],
                    "s2": [r3(x) for x in dl["s2"]],
                    "s3": [r3(x) for x in dl["s3"]],
                    "g": gap,
                    "stints": stints,
                    "pits": dl.loc[dl["pit_stop"] == 1, "lap_number"].astype(int).tolist(),
                }
            )
            pace_rows.append(
                {
                    "year": year, "race": int(race_id), "code": code, "team": meta["team"],
                    "pos": pos, "pace": pace,
                    "pacePct": None if pace is None or pd.isna(best_med) else round((pace / best_med - 1) * 100, 3),
                    "led": int((dl["position"] == 1).sum()),
                    "fastest": code == fastest["driver_code"],
                    "laps": int(len(dl)),
                }
            )

        neutral_spans = []
        for lap in sorted(nl):
            if neutral_spans and neutral_spans[-1]["type"] == nl[lap] and neutral_spans[-1]["to"] == lap - 1:
                neutral_spans[-1]["to"] = lap
            else:
                neutral_spans.append({"type": nl[lap], "from": lap, "to": lap})

        w_stints = next(d["stints"] for d in drivers_out if d["code"] == winner)
        summary = {
            "id": int(race_id),
            "year": year,
            "round": rnd,
            "name": name,
            "location": cache["location"],
            "country": cache["country"],
            "date": cache["date"],
            "laps": total_laps,
            "winner": winner,
            "winnerStrategy": "-".join(s["c"] for s in w_stints),
            "fastest": {"code": fastest["driver_code"], "time": r3(fastest["lap_time_secs"]), "lap": int(fastest["lap_number"])},
            "weather": cache["weather"],
            "wetShare": round(wet_share, 3),
            "neutralLaps": len(nl),
            "pitLoss": pit_loss,
            "pitStops": int((laps["pit_stop"] == 1).sum()),
            "model": None if model is None else {k: model[k] for k in ("fuel", "deg", "mae", "maeHoldout", "r2", "quality", "n")},
        }
        races.append(summary)

        race_json = {
            **summary,
            "pitLossSamples": pit_n,
            "neutral": neutral_spans,
            "bestSectors": {k: r3(v) for k, v in best_s.items()},
            "model": model,
            "drivers": drivers_out,
        }
        with open(OUT / "races" / f"{race_id}.json", "w") as f:
            json.dump(race_json, f, separators=(",", ":"))

    qa["lapTimeAgreement"] = round(sector_matched / max(sector_checked, 1), 4)
    qa["lapsCrossChecked"] = int(sector_checked)

    # ---------------- season tables ----------------
    pr = pd.DataFrame(pace_rows)
    seasons = []
    for year, g in pr.groupby("year"):
        rs = sorted([r for r in races if r["year"] == year], key=lambda r: r["round"])
        table = []
        for code, dg in g.groupby("code"):
            by_race = dg.set_index("race")
            table.append(
                {
                    "code": code,
                    "team": dg["team"].mode().iat[0],
                    "races": int(len(dg)),
                    "wins": int((dg["pos"] == 1).sum()),
                    "podiums": int((dg["pos"] <= 3).sum()),
                    "avgPos": round(float(dg["pos"].mean()), 2),
                    "led": int(dg["led"].sum()),
                    "fastest": int(dg["fastest"].sum()),
                    "pacePct": None if dg["pacePct"].isna().all() else round(float(dg["pacePct"].median()), 3),
                    "byRace": [
                        None if r["id"] not in by_race.index else {
                            "pos": int(by_race.loc[r["id"], "pos"]),
                            "pace": r3(by_race.loc[r["id"], "pace"]),
                            "pct": r3(by_race.loc[r["id"], "pacePct"]),
                        }
                        for r in rs
                    ],
                }
            )
        table.sort(key=lambda d: (-d["wins"], d["avgPos"]))
        seasons.append({"year": int(year), "races": [r["id"] for r in rs], "drivers": table})

    index = {
        "generated": pd.Timestamp.now("UTC").strftime("%Y-%m-%d"),
        "totals": {
            "laps": qa["rows"],
            "races": len(races),
            "seasons": len(seasons),
            "drivers": int(df["driver_code"].nunique()),
            "modelled": sum(1 for r in races if r["model"]),
        },
        "qa": qa,
        "races": sorted(races, key=lambda r: (r["year"], r["round"])),
        "seasons": seasons,
        "people": people,
    }
    with open(OUT / "index.json", "w") as f:
        json.dump(index, f, separators=(",", ":"))

    size = sum(p.stat().st_size for p in OUT.rglob("*.json"))
    print(f"races={len(races)} laps={qa['rows']} duplicates_removed={qa['duplicateRows']}")
    print(f"lap-time agreement with raw timing: {qa['lapTimeAgreement']:.2%} of {sector_checked}")
    print(f"wrote {OUT} ({size/1e6:.1f} MB)")


if __name__ == "__main__":
    main()
