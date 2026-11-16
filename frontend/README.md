# RI360 website

The public site for RaceIntel360: race traces, tyre strategies, a fitted pace model per race and a strategy lab, built from five seasons of real F1 timing data.

- **Overview**: headline findings computed from the data (pit-lane cost by circuit, tyre degradation by compound, season dominance, data-quality audit).
- **Races**: all 89 races, 2019–2023. Each race page has a race trace, lap-time and running-order charts, every driver's tyre stints, a sortable classification with clean-air pace, best sectors and the race's pace model checked against real laps.
- **Strategy lab**: build a plan stint by stint; the race's model predicts every lap and searches every one- and two-stop plan for the fastest.
- **Seasons**: results and pace for every driver and round as a heat map.
- **Method**: how the data is cleaned, cross-checked and modelled, and the limits.

## Run it

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
npm run build      # static site in frontend/dist
```

The site needs no server: it reads the JSON bundle in `public/data/`. Rebuild that bundle from the lap table and FastF1 cache with:

```bash
cd ../backend && python data_pipeline/build_site_data.py
```

## Deploy on Vercel

The repository root has a `vercel.json` that builds this folder, so import the repo on Vercel and leave **Root Directory** empty. See the root README for details. Routing uses the URL hash, so no rewrites are needed.

## Design

Styled only from the RI360 design system tokens (`src/styles/tokens.css`): Barlow Condensed for headlines, Space Grotesk for interface text, JetBrains Mono for every timing value; race-red for the focus driver, petrol for the comparison, podium gold for bests. Two themes: **paper** (light, editorial) and **pit wall** (dark). Charts are hand-built SVG with d3 scales; tyre colours were checked with a colour-blind palette validator and every stint also carries its compound letter.
