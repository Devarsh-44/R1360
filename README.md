<div align="center">

<img src="frontend/public/ri360-wordmark.svg" alt="RI360" height="64" />

# RI360 · RaceIntel360

**Five seasons of Formula 1, read like a pit wall.**

Race traces, tyre strategies, a fitted pace model for every race, and a strategy lab where you can re-run a Grand Prix on different tyres. All of it is built from 96,223 real timing laps (2019–2023).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDevarsh-44%2FR1360)

</div>

![RI360 overview page](docs/screenshots/overview.png)

## What you can do

| Page | What it shows |
|---|---|
| **Overview** | Headline findings from the data: what a pit stop costs at each circuit, how fast each tyre compound wears, and who dominated each season. |
| **Races** | All 89 races. Each one has a race trace, lap times, running order, every driver's tyre stints, the results with clean-air pace, best sectors, and a pace model checked against the real laps. |
| **Strategy lab** | Choose a race and a driver, plan the stints yourself, and see the predicted race time lap by lap. It also finds the fastest one-stop and two-stop plans. |
| **Seasons** | A heat map of every driver's result, or pace, in every round. |
| **Method** | How the data was cleaned and checked, how the model works, and its limits. |

It works on desktop and phone, in a light **paper** theme and a dark **pit wall** theme.

<table>
  <tr>
    <td width="66%"><img src="docs/screenshots/race.png" alt="Race page with race trace and lap times" /></td>
    <td><img src="docs/screenshots/mobile.png" alt="Race page on a phone, dark theme" /></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/strategy-lab.png" alt="Strategy lab in the dark theme" /></td>
    <td><img src="docs/screenshots/seasons.png" alt="Seasons heat map" /></td>
  </tr>
</table>

## Quick start

You need [Node.js 20.19 or newer](https://nodejs.org) for the website. Python 3.10 or 3.11 is only needed for the API and the data scripts.

```bash
git clone https://github.com/Devarsh-44/R1360.git
cd R1360/frontend
npm install
npm run dev
```

Open http://localhost:3000. The website needs no server or database, because all its data ships with it in `frontend/public/data`.

### Run the API (optional)

```bash
cd R1360/backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

Interactive API docs are then at http://localhost:8000/docs. Settings live in `backend/config/config.example.env`: copy it to `.env` if you need to change the database or add an OpenAI key. Never commit `.env`.

## Put it online (Vercel)

1. Click **Deploy with Vercel** above, or go to [vercel.com/new](https://vercel.com/new) and import this repository.
2. Leave **Root Directory** empty and click **Deploy**. The included `vercel.json` already tells Vercel how to build the site.
3. You get a live `*.vercel.app` link in about a minute. Every push to `main` updates it.

To add your own domain, open the project on Vercel and go to **Settings → Domains**. More detail, including hosting the API, is in [docs/DEPLOY.md](docs/DEPLOY.md).

## Project structure

```
R1360/
├── frontend/                 The website (React + TypeScript + Vite)
│   ├── public/data/          Race data the site reads (generated, see below)
│   └── src/
│       ├── pages/            Overview, Races, Race, Strategy lab, Seasons, Method
│       ├── charts/           Hand-built SVG charts
│       ├── lib/              Data loading, formatting, pace model, routing
│       └── styles/           RI360 design tokens and styles
├── backend/                  Python: API, data pipeline, models
│   ├── api/                  FastAPI app and routes
│   ├── data_pipeline/        Fetch F1 data, build the dataset and the site data
│   ├── strategy/             Strategy simulator
│   ├── scripts/              Model training and helper scripts
│   ├── data/                 lap_model_dataset.csv
│   ├── cache/                FastF1 timing cache (source for the site data)
│   ├── models/               Model feature list
│   └── config/               Example settings and database schema
├── docs/                     Deploy guide, mobile-app guide, screenshots
├── .github/workflows/ci.yml  Checks that the site builds and the API starts
└── vercel.json               Vercel build settings
```

## How the data is made

1. `backend/data_pipeline/fetch_f1_data.py` downloads race timing with [FastF1](https://github.com/theOehrly/Fast-F1) into `backend/cache/`.
2. `backend/data_pipeline/build_dataset.py` turns it into the lap table `backend/data/lap_model_dataset.csv`.
3. `backend/data_pipeline/build_site_data.py` cleans that table and writes the website's data into `frontend/public/data/`:
   - removes duplicate laps
   - rebuilds tyre ages
   - cross-checks every lap against the raw timing feed
   - fits a pace model for each race

To rebuild the site data after changing the dataset:

```bash
cd backend
python data_pipeline/build_site_data.py
```

## Turn it into a mobile app

The website already runs inside an app wrapper with no code changes: it uses relative paths, hash-based page URLs, offline data, and phone-sized layouts. [docs/MOBILE.md](docs/MOBILE.md) has step-by-step instructions to package it for iOS and Android with Capacitor.

## Built with

- **Website:** React 18, TypeScript, Vite, d3-scale and d3-shape
- **Fonts:** Barlow Condensed, Space Grotesk and JetBrains Mono, from the RI360 design system
- **Backend:** Python, FastAPI, SQLAlchemy, FastF1, pandas, scikit-learn
- **Hosting:** Vercel (website), any Python host (API)

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm run dev` fails with a Node version error | Install Node 20.19+ (the repo includes `frontend/.nvmrc`, so with nvm just run `nvm use`). |
| Port 3000 is busy | `npm run dev -- --port 3001` |
| API routes say the model file is missing | Train it first: `cd backend && python scripts/train_model.py` |
| `pip install` fails on Python 3.12+ | Use Python 3.10 or 3.11 (pinned in `backend/runtime.txt`). |

## Credits

Timing data comes from the FastF1 library (Formula 1 live-timing archive). RI360 is an independent project and is not affiliated with Formula 1, the FIA or any team. Formula 1 and related marks are trademarks of their owners.
