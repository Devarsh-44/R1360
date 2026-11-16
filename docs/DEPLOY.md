# Deploying RI360

## Website (Vercel)

1. Sign in at vercel.com with GitHub and choose **Add New → Project**.
2. Import the `R1360` repository.
3. Leave **Root Directory** empty and **Framework Preset** as "Other". The settings come from `vercel.json`:
   - Install: `npm ci --prefix frontend`
   - Build: `npm run build --prefix frontend`
   - Output: `frontend/dist`
4. Click **Deploy**. You get a `*.vercel.app` URL. Add a custom domain under **Settings → Domains**.

No environment variables are needed. Pushes to `main` deploy to production, and other branches get preview URLs.

If you prefer to set it up by hand instead: Root Directory `frontend`, preset **Vite**, build `npm run build`, output `dist`.

## API (optional)

The site is static, so the API is only for your own tools or a future app feature.

Render (free tier works):

- New **Web Service** → this repo → **Root Directory** `backend`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
- Environment: copy keys from `backend/config/config.example.env` (database URL, optional OpenAI key for the AI analysis route).

`api/routes/ai_analysis.py` and `api/routes/strategy.py` load `models/lap_time_model.pkl`, which is not committed. Train it first with `python scripts/train_model.py` (run from `backend/`).
