"""OpenF1 data source for races from 2024 onward.

The F1 live-timing archive that FastF1 reads now requires an F1TV subscription
login, so newer races come from OpenF1 (https://openf1.org), which serves
historical data from 2023 onward for free and without an account.

For each finished race this module saves a compact snapshot of the OpenF1
endpoints the site needs:

    data/openf1/<year>/<round>_<event>.json.gz

and turns a snapshot into
  - lap rows in the same format as data/lap_model_dataset.csv, and
  - the per-race extras the site builder otherwise reads from the FastF1 cache
    (driver info, lap clock, sectors, safety-car spans, weather, final order).

Round numbers and event names come from FastF1's event schedule, which does not
need a login, so names match the 2019-2023 races exactly.
"""

from __future__ import annotations

import gzip
import json
import logging
import re
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import requests

log = logging.getLogger("openf1")

API = "https://api.openf1.org/v1/"
ROOT = Path(__file__).resolve().parents[1]
SNAP_DIR = ROOT / "data" / "openf1"
FIRST_SEASON = 2024  # 2019-2023 come from the FastF1 cache
# wait this long after the chequered flag before importing a race, so that
# OpenF1 has finished processing it
SETTLE = timedelta(hours=6)

# endpoint -> fields kept in the snapshot (the rest is dropped to keep it small)
ENDPOINTS = {
    "laps": ["driver_number", "lap_number", "date_start", "lap_duration", "duration_sector_1",
             "duration_sector_2", "duration_sector_3", "st_speed", "is_pit_out_lap"],
    "stints": ["driver_number", "stint_number", "lap_start", "lap_end", "compound", "tyre_age_at_start"],
    "position": ["driver_number", "date", "position"],
    "pit": ["driver_number", "lap_number", "date"],
    "race_control": ["date", "lap_number", "category", "flag", "message"],
    "weather": ["date", "air_temperature", "track_temperature", "rainfall"],
    "drivers": ["driver_number", "name_acronym", "first_name", "last_name", "full_name", "team_name"],
    "session_result": ["driver_number", "position", "number_of_laps", "dnf", "dns", "dsq"],
}


# --------------------------------------------------------------------------
# download
# --------------------------------------------------------------------------

def _get(endpoint: str, **params) -> list:
    """GET one OpenF1 endpoint politely (free tier: a few requests a second)."""
    for attempt in range(8):
        try:
            r = requests.get(API + endpoint, params=params, timeout=90)
        except requests.RequestException as e:
            log.warning(f"{endpoint}: {e}; retrying")
            time.sleep(5 * (attempt + 1))
            continue
        if r.status_code == 429 or r.status_code >= 500:
            time.sleep(5 * (attempt + 1))
            continue
        time.sleep(0.5)
        if r.status_code == 404:  # OpenF1 answers 404 for "no results"
            return []
        r.raise_for_status()
        return r.json()
    raise RuntimeError(f"OpenF1 {endpoint} {params}: gave up after retries")


def schedule(year: int) -> pd.DataFrame:
    """Race rounds of a season from FastF1's schedule (no login needed)."""
    import fastf1

    fastf1.set_log_level("WARNING")
    # schedule lookups are cached next to the FastF1 race cache (the HTTP cache
    # file itself is git-ignored)
    fastf1.Cache.configure(cache_dir=str(ROOT / "cache"))
    s = fastf1.get_event_schedule(year, include_testing=False)
    s = s[s["RoundNumber"] >= 1]
    out = pd.DataFrame(
        {
            "year": year,
            "round": s["RoundNumber"].astype(int).values,
            "name": s["EventName"].values,
            # .values would drop the timezone
            "race_utc": list(pd.to_datetime(s["Session5DateUtc"]).dt.tz_localize("UTC")),
        }
    )
    return out


def snap_path(year: int, rnd: int, name: str) -> Path:
    slug = re.sub(r"[^A-Za-z0-9]+", "_", name).strip("_")
    return SNAP_DIR / str(year) / f"{rnd:02d}_{slug}.json.gz"


def finished(race_utc: pd.Timestamp, now: datetime | None = None) -> bool:
    now = now or datetime.now(timezone.utc)
    # a race lasts at most ~4 h including suspensions
    return race_utc.to_pydatetime() + timedelta(hours=4) + SETTLE < now


def fetch_race(year: int, rnd: int, name: str, race_utc: pd.Timestamp, sessions: list[dict]) -> Path | None:
    """Download one race into a snapshot. Returns its path, or None if OpenF1
    has no complete data for it yet."""
    day = race_utc.date()
    match = [
        s for s in sessions
        if abs((datetime.fromisoformat(s["date_start"]).date() - day).days) <= 1 and not s.get("is_cancelled")
    ]
    if not match:
        log.warning(f"{year} R{rnd} {name}: no OpenF1 race session found")
        return None
    sess = match[0]
    key = sess["session_key"]
    snap = {"year": year, "round": rnd, "name": name, "session": sess}
    for ep, fields in ENDPOINTS.items():
        rows = _get(ep, session_key=key)
        snap[ep] = [{f: row.get(f) for f in fields} for row in rows]
    if len(snap["laps"]) < 100 or not snap["drivers"] or not snap["stints"]:
        log.warning(f"{year} R{rnd} {name}: OpenF1 data incomplete "
                    f"(laps={len(snap['laps'])}, drivers={len(snap['drivers'])}); will retry next run")
        return None
    path = snap_path(year, rnd, name)
    path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(path, "wt", encoding="utf-8") as f:
        json.dump(snap, f, separators=(",", ":"))
    log.info(f"{year} R{rnd} {name}: saved {len(snap['laps'])} laps -> {path.name}")
    return path


def fetch_missing(first: int = FIRST_SEASON, last: int | None = None) -> list[Path]:
    """Download every finished race from `first` to `last` that has no snapshot yet."""
    last = last or datetime.now(timezone.utc).year
    new = []
    for year in range(first, last + 1):
        sched = schedule(year)
        todo = [r for r in sched.itertuples() if finished(r.race_utc) and not snap_path(year, r.round, r.name).exists()]
        if not todo:
            log.info(f"{year}: up to date")
            continue
        sessions = _get("sessions", year=year, session_name="Race")
        for r in todo:
            p = fetch_race(year, r.round, r.name, r.race_utc, sessions)
            if p:
                new.append(p)
    return new


def load(path: Path) -> dict:
    with gzip.open(path, "rt", encoding="utf-8") as f:
        return json.load(f)


def all_snapshots() -> list[Path]:
    return sorted(SNAP_DIR.glob("*/*.json.gz"))


# --------------------------------------------------------------------------
# convert
# --------------------------------------------------------------------------

def _t(s: str | None) -> float:
    """ISO timestamp -> epoch seconds (NaN when missing)."""
    if not s:
        return np.nan
    return datetime.fromisoformat(s).timestamp()


def _laps_frame(snap: dict) -> pd.DataFrame:
    """One row per driver lap with tyre, position and lap-end clock attached."""
    tla = {d["driver_number"]: d["name_acronym"] for d in snap["drivers"] if d.get("name_acronym")}
    laps = pd.DataFrame(snap["laps"])
    laps = laps[laps["driver_number"].isin(tla)].copy()
    laps["driver_code"] = laps["driver_number"].map(tla)
    laps = laps.drop_duplicates(["driver_number", "lap_number"], keep="last")
    laps = laps.sort_values(["driver_number", "lap_number"])
    laps["start"] = laps["date_start"].map(_t)
    laps["duration"] = laps["lap_duration"].astype(float)
    # lap end: the next lap's start, else start + duration
    nxt = laps.groupby("driver_number")["start"].shift(-1)
    laps["end"] = nxt.where(nxt.notna(), laps["start"] + laps["duration"])
    # a missing lap time can be recovered from the lap clock
    laps["duration"] = laps["duration"].fillna(laps["end"] - laps["start"])

    # tyres
    st = pd.DataFrame(snap["stints"])
    st = st[st["driver_number"].isin(tla)]
    laps["stint"] = np.nan
    laps["compound"] = None
    laps["tyre_life"] = np.nan
    for s in st.itertuples():
        if pd.isna(s.lap_start) or pd.isna(s.lap_end):
            continue
        m = (laps["driver_number"] == s.driver_number) & laps["lap_number"].between(s.lap_start, s.lap_end)
        laps.loc[m, "stint"] = s.stint_number
        laps.loc[m, "compound"] = (s.compound or "UNKNOWN").upper()
        age = 0 if pd.isna(s.tyre_age_at_start) else s.tyre_age_at_start
        laps.loc[m, "tyre_life"] = age + (laps.loc[m, "lap_number"] - s.lap_start) + 1

    # position at the end of each lap, from the live position stream
    pos = pd.DataFrame(snap["position"])
    pos["t"] = pos["date"].map(_t)
    laps["position"] = np.nan
    for num, g in pos.sort_values("t").groupby("driver_number"):
        m = laps["driver_number"] == num
        if not m.any():
            continue
        idx = np.searchsorted(g["t"].values, laps.loc[m, "end"].fillna(np.inf).values, side="right") - 1
        vals = np.where(idx >= 0, g["position"].values[np.clip(idx, 0, None)], np.nan)
        laps.loc[m, "position"] = vals

    # in-laps: the lap before a pit-out lap (OpenF1's pit table misses stops
    # made under a red flag, as does FastF1's PitInTime)
    out_laps = laps.loc[laps["is_pit_out_lap"].fillna(False).astype(bool) & (laps["lap_number"] > 1)]
    in_keys = set(zip(out_laps["driver_number"], out_laps["lap_number"] - 1))
    laps["pit_stop"] = [int((n, l) in in_keys) for n, l in zip(laps["driver_number"], laps["lap_number"])]
    return laps


def lap_rows(snap: dict, race_id: int, driver_ids: dict[str, int]) -> pd.DataFrame:
    """Lap rows in the format of data/lap_model_dataset.csv, cleaned the same way
    as data_pipeline/build_dataset.py."""
    laps = _laps_frame(snap)
    df = pd.DataFrame(
        {
            "race_id": race_id,
            "driver_id": laps["driver_code"].map(driver_ids),
            "driver_code": laps["driver_code"],
            "year": snap["year"],
            "round": snap["round"],
            "race_name": snap["name"],
            "lap_number": laps["lap_number"].astype(int),
            "stint": laps["stint"],
            "compound": laps["compound"].fillna("UNKNOWN"),
            "tyre_life": laps["tyre_life"],
            "position": laps["position"],
            "pit_stop": laps["pit_stop"],
            "lap_time_secs": laps["duration"].round(3),
        }
    )
    df = df[df["lap_time_secs"].notna() & (df["lap_time_secs"] > 0) & df["stint"].notna() & df["position"].notna()]
    med = df.groupby("driver_code")["lap_time_secs"].transform("median")
    df = df[df["lap_time_secs"] / med < 2.0].copy()
    df = df.sort_values(["driver_code", "stint", "lap_number"])
    df["lap_in_stint"] = df.groupby(["driver_code", "stint"]).cumcount() + 1
    df["fuel_lap_from_end"] = df["lap_number"].max() - df["lap_number"]
    df["stint"] = df["stint"].astype(int)
    df["position"] = df["position"].astype(int)
    cols = ["race_id", "driver_id", "driver_code", "year", "round", "race_name", "lap_number", "lap_in_stint",
            "fuel_lap_from_end", "stint", "compound", "tyre_life", "position", "pit_stop", "lap_time_secs"]
    return df[cols]


def extras(snap: dict, location_alias: dict[str, str]) -> dict:
    """Same shape as build_site_data.read_cache() for a FastF1 race."""
    sess = snap["session"]
    t0 = _t(sess["date_start"])
    res = {
        "location": location_alias.get(sess.get("location"), sess.get("location")),
        "country": sess.get("country_name"),
        "date": sess["date_start"][:10],
        "drivers": {},
        "ext": None,
        "neutral_times": [],
        "weather": None,
        "final": {},
        "start": {},
        # lap times here are the timing feed itself, so there is nothing to cross-check
        "source": "openf1",
    }
    for d in snap["drivers"]:
        if not d.get("name_acronym"):
            continue
        name = f"{d.get('first_name') or ''} {d.get('last_name') or ''}".strip() or (d.get("full_name") or "").title()
        res["drivers"][d["name_acronym"]] = {"num": str(d["driver_number"]), "name": name, "team": d.get("team_name") or ""}

    laps = _laps_frame(snap)
    res["ext"] = pd.DataFrame(
        {
            "driver_code": laps["driver_code"].values,
            "lap_number": laps["lap_number"].astype(int).values,
            "end": (laps["end"] - t0).values,
            "raw_time": np.nan,
            "s1": laps["duration_sector_1"].astype(float).values,
            "s2": laps["duration_sector_2"].astype(float).values,
            "s3": laps["duration_sector_3"].astype(float).values,
            "trap": laps["st_speed"].astype(float).values,
        }
    )

    # safety car / VSC / red flag spans on the session clock
    lead_ends = np.sort(laps.groupby("lap_number")["end"].min().dropna().values)
    lap_starts = np.sort(laps["start"].dropna().values)

    def next_after(arr, t):
        i = np.searchsorted(arr, t, side="right")
        return arr[i] if i < len(arr) else np.inf

    # Race-control wording varies by season: "VIRTUAL SAFETY CAR" became "VSC",
    # and from 2026 a red flag is a text message rather than a RED flag entry.
    msgs = sorted(snap["race_control"], key=lambda m: m["date"])
    chequered = next((_t(m["date"]) for m in msgs if m.get("flag") == "CHEQUERED"), np.inf)
    open_sc = open_vsc = None
    spans = res["neutral_times"]
    for m in msgs:
        t = _t(m["date"])
        if t > chequered:
            break
        text = (m.get("message") or "").upper()
        is_red = m.get("flag") == "RED" or text.startswith("RED FLAG")
        if m.get("category") == "SafetyCar":
            if text.startswith(("VIRTUAL SAFETY CAR DEPLOYED", "VSC DEPLOYED")):
                open_vsc = t
            elif text.startswith(("VIRTUAL SAFETY CAR ENDING", "VSC ENDING")) and open_vsc is not None:
                spans.append(("VSC", open_vsc - t0, t + 10 - t0))
                open_vsc = None
            elif text.startswith("SAFETY CAR DEPLOYED"):
                open_sc = open_sc if open_sc is not None else t
                if open_vsc is not None:  # VSC upgraded to a full safety car
                    spans.append(("VSC", open_vsc - t0, t - t0))
                    open_vsc = None
            elif text.startswith("SAFETY CAR IN THIS LAP") and open_sc is not None:
                # neutralised until the leader completes the in-lap
                spans.append(("SC", open_sc - t0, next_after(lead_ends, t) - t0))
                open_sc = None
        elif is_red:
            # suspended until racing laps resume (no lap starts during a suspension)
            spans.append(("RED", t - t0, next_after(lap_starts, t) - t0))
            # a red flag ends the SC / VSC period that preceded it
            if open_sc is not None:
                spans.append(("SC", open_sc - t0, t - t0))
                open_sc = None
            if open_vsc is not None:
                spans.append(("VSC", open_vsc - t0, t - t0))
                open_vsc = None
        elif open_sc is not None and text.startswith(("DRS ENABLED", "OVERTAKE ENABLED")):
            # no "IN THIS LAP" message: DRS / overtake mode returns two racing
            # laps after the restart, so the SC ended two leader laps earlier
            i = np.searchsorted(lead_ends, t)
            spans.append(("SC", open_sc - t0, lead_ends[max(i - 2, 0)] - t0))
            open_sc = None
    for kind, start in (("SC", open_sc), ("VSC", open_vsc)):
        if start is not None:  # still neutralised at the flag
            spans.append((kind, start - t0, chequered - t0))

    # Formation laps. After a red flag, and on a start behind the safety car,
    # the timing counts formation laps as laps, and the messages that announce
    # them are worded too differently to parse. They are easy to see in the
    # lap times, though: the whole field runs far slower than racing pace.
    field = laps.groupby("lap_number").agg(med=("duration", "median"), a=("start", "min"), b=("end", "min"))
    field = field.dropna()
    if len(field) > 5:
        ratio = field["med"] / field["med"].median()
        slow = ratio > 1.25

        def extend(n: int) -> float | None:
            """End time of the run of slow laps starting at lap n, if any. A
            safety-car lap just before a formation lap can be only ~1.2x slow,
            so one moderately slow lap is bridged when a slow lap follows."""
            end = None
            while n in field.index:
                if slow[n] or (ratio[n] > 1.1 and slow.get(n + 1, False)):
                    end = field.at[n, "b"]
                    n += 1
                else:
                    break
            return end

        for i, (kind, a, b) in enumerate(list(spans)):
            if kind == "RED":
                n = int(field.index[np.searchsorted(field["a"].values, b + t0 - 1)]) if b + t0 - 1 < field["a"].max() else None
                end = extend(n) if n is not None else None
                if end is not None:
                    spans[i] = ("RED", a, end - t0)
        first = int(field.index.min())
        if (field.at[first, "med"] > 1.4 * field["med"].median()) and (end := extend(first)) is not None:
            spans.append(("SC", field.at[first, "a"] - t0, end - t0))

    w = pd.DataFrame(snap["weather"])
    if not w.empty:
        res["weather"] = {
            "air": round(float(w["air_temperature"].mean()), 1),
            "track": round(float(w["track_temperature"].mean()), 1),
            "rain": bool(w["rainfall"].astype(float).mean() > 0.05),
        }

    # official classification, with post-race penalties and disqualifications.
    # Unclassified drivers get no position here, so the site orders them by laps
    # completed; disqualified drivers go to the very bottom.
    tla = {d["driver_number"]: d["name_acronym"] for d in snap["drivers"]}
    result = [r for r in snap["session_result"] if r["driver_number"] in tla]
    if any(r.get("position") for r in result):
        for r in result:
            if r.get("dsq"):
                res["final"][tla[r["driver_number"]]] = 999
            elif r.get("position"):
                res["final"][tla[r["driver_number"]]] = int(r["position"])
    else:  # no official result published: last value of the live position stream
        pos = pd.DataFrame(snap["position"]).sort_values("date")
        for num, p in pos.groupby("driver_number")["position"].last().items():
            if num in tla:
                res["final"][tla[num]] = int(p)
    # order before the start, a fallback for the official grid (starting_grid.py);
    # it cannot tell a pit-lane start from the back row
    pos = pd.DataFrame(snap["position"]).sort_values("date")
    for num, p in pos.groupby("driver_number")["position"].first().items():
        if num in tla:
            res["start"][tla[num]] = int(p)
    return res
