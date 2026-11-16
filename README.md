# RI360 · RaceIntel360

Formula 1 race intelligence built from five seasons of real timing data (2019–2023, 96,223 clean laps). It has race traces, tyre strategies, a fitted pace model for each race, and a strategy lab.

| Folder | What it is | Runs on |
|---|---|---|
| [`frontend/`](frontend) | The RI360 website: React 18, TypeScript, Vite and hand-built SVG charts. It is fully static and reads a JSON data bundle. | Vercel (any static host) |
| [`backend/`](backend) | FastAPI service, FastF1 data pipeline, strategy simulator, model training scripts, the lap dataset and the FastF1 cache. | Render, Fly or any Python host |
| [`docs/`](docs) | Deployment and mobile-app notes. | |

```
ri360/
├── frontend/              # website (deployed to Vercel)
│   ├── public/data/       # generated data bundle (index.json + one file per race)
│   └── src/               # pages, charts, design tokens
├── backend/
│   ├── api/               # FastAPI app (uvicorn api.main:app)
│   ├── data_pipeline/     # fetch_f1_data.py, build_dataset.py, build_site_data.py
│   ├── strategy/          # strategy simulator
│   ├── scripts/           # train_model.py, install/run helpers
│   ├── data/              # lap_model_dataset.csv
│   ├── cache/             # FastF1 timing cache used to build the site data
│   ├── models/            # model feature list (trained .pkl is not committed)
│   └── config/            # env example + SQL schema
├── docs/
└── vercel.json            # tells Vercel to build frontend/
```

## Run locally

Website:

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

Backend API:

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000    # http://localhost:8000/docs
```

Rebuild the website's data bundle after changing the dataset or cache:

```bash
cd backend
python data_pipeline/build_site_data.py      # writes ../frontend/public/data
```

## Deploy

**Website on Vercel.** Import this repository in Vercel and leave *Root Directory* empty. The root `vercel.json` installs and builds `frontend/` and serves `frontend/dist`. Every push to `main` redeploys. See [docs/DEPLOY.md](docs/DEPLOY.md).

**API.** The website does not call the API. Host `backend/` separately when you need it; details are in [docs/DEPLOY.md](docs/DEPLOY.md).

## Mobile app

The website already works inside a native wrapper: it uses relative asset paths, hash routing, no server, and layouts that fit phones. [docs/MOBILE.md](docs/MOBILE.md) shows how to package it for iOS and Android with Capacitor.
