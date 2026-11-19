"""Send the app's "race analysed" push notification for a newly added race.

Run by .github/workflows/update-data.yml after a new race has been committed:

    python data_pipeline/notify_new_races.py 158 [159 ...]

Only the newest race is announced (a catch-up run that adds several races sends one alert).
The message goes to the Firebase Cloud Messaging topic "race-analysed", which the app
subscribes to when a user turns alerts on; nothing on our side knows who receives it.

It first waits until the live site serves the race, so tapping the alert finds it.
Without FIREBASE_SERVICE_ACCOUNT (the service-account JSON, as a GitHub secret) it only
prints the message, so the workflow keeps working before Firebase is set up.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RACES = ROOT / "frontend" / "public" / "data" / "races"
LIVE = "https://ri360.vercel.app/data/races/{}.json"
TOPIC = "race-analysed"
COMPOUND = {"S": "softs", "M": "mediums", "H": "hards", "I": "inters", "W": "wets"}


def surname(name: str) -> str:
    parts = name.split()
    return " ".join(parts[1:]) if len(parts) > 1 else name


def compose(race: dict) -> tuple[str, str]:
    """Title and body in the stories' voice, e.g. 'Norris won from P3 on inters, softs, softs and inters.'"""
    drivers = race["drivers"]
    w = drivers[0]
    start = "from pole" if w["grid"] == 1 else f"from P{w['grid']}" if w["grid"] > 0 else "from the pit lane"
    tyres = [COMPOUND.get(s["c"], "unknown tyres") for s in w["stints"]]
    if len(tyres) <= 1:
        how = "without stopping"
    elif len(tyres) <= 4:
        how = f"on {', '.join(tyres[:-1])} and {tyres[-1]}"
    else:
        how = f"with {len(tyres) - 1} stops"
    body = f"{surname(w['name'])} won {start} {how}."

    finishers = [d for d in drivers if d["laps"] >= w["laps"] * 0.9 and d["grid"] > 0 and d["code"] != w["code"]]
    climber = max(finishers, key=lambda d: (d["grid"] - d["pos"], -d["pos"]), default=None)
    if climber and climber["grid"] - climber["pos"] >= 3:
        body += f" {surname(climber['name'])} climbed {climber['grid'] - climber['pos']} places."
    body += " Tap for the story."

    title = f"🏁 {race['name'].replace(' Grand Prix', ' GP')} · analysed"
    return title, body


def wait_until_live(race_id: int, timeout_s: int = 1200) -> bool:
    """Vercel redeploys after the data commit; poll until the race file is served."""
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(LIVE.format(race_id), timeout=20) as r:
                if r.status == 200:
                    return True
        except urllib.error.URLError:
            pass
        time.sleep(30)
    return False


def send(title: str, body: str, race_id: int, service_account: dict) -> None:
    from google.auth.transport.requests import Request
    from google.oauth2 import service_account as sa

    creds = sa.Credentials.from_service_account_info(service_account, scopes=["https://www.googleapis.com/auth/firebase.messaging"])
    creds.refresh(Request())
    message = {
        "message": {
            "topic": TOPIC,
            "notification": {"title": title, "body": body},
            "data": {"raceId": str(race_id)},
            "android": {
                "priority": "high",
                "notification": {"channel_id": TOPIC, "icon": "ic_stat_ri360", "color": "#D7261E", "tag": f"race-{race_id}"},
            },
            "apns": {"payload": {"aps": {"sound": "default"}}},
        }
    }
    req = urllib.request.Request(
        f"https://fcm.googleapis.com/v1/projects/{service_account['project_id']}/messages:send",
        data=json.dumps(message).encode(),
        headers={"Authorization": f"Bearer {creds.token}", "Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        print("Sent:", r.read().decode())


def main(argv: list[str]) -> int:
    ids = sorted(int(a) for a in argv if a.isdigit())
    if not ids:
        print("No new races to announce.")
        return 0
    race_id = ids[-1]
    race = json.loads((RACES / f"{race_id}.json").read_text(encoding="utf-8"))
    title, body = compose(race)
    print(f"{title}\n{body}")

    raw = os.environ.get("FIREBASE_SERVICE_ACCOUNT", "").strip()
    if not raw:
        print("FIREBASE_SERVICE_ACCOUNT is not set: not sending (set the secret to turn alerts on).")
        return 0
    if not wait_until_live(race_id):
        print(f"Race {race_id} was not live on the site after 20 minutes: not sending.", file=sys.stderr)
        return 1
    send(title, body, race_id, json.loads(raw))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
