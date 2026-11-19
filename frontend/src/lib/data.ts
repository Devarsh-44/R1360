import { Capacitor } from "@capacitor/core";
import { useEffect, useState, useSyncExternalStore } from "react";

export type Compound = "S" | "M" | "H" | "I" | "W" | "?";

export interface ModelSummary {
  fuel: number;
  deg: Partial<Record<Compound, number>>;
  mae: number;
  maeHoldout: number | null;
  r2: number | null;
  quality: "per-compound" | "pooled" | "weak" | "mixed";
  n: number;
}

export interface PaceModel extends ModelSummary {
  ref: Compound;
  offset: Partial<Record<Compound, number>>;
  base: Record<string, number>;
}

export interface RaceSummary {
  id: number;
  year: number;
  round: number;
  name: string;
  location: string | null;
  country: string | null;
  date: string | null;
  laps: number;
  winner: string;
  winnerStrategy: string;
  fastest: { code: string; time: number; lap: number };
  weather: { air: number; track: number; rain: boolean } | null;
  wetShare: number;
  neutralLaps: number;
  pitLoss: number;
  pitStops: number;
  model: ModelSummary | null;
}

export interface Stint {
  c: Compound;
  from: number;
  to: number;
  age: number;
}

export interface RaceDriver {
  code: string;
  name: string;
  team: string;
  num: string;
  pos: number;
  grid: number;
  laps: number;
  best: number;
  bestLap: number;
  pace: number | null;
  n: number[];
  t: (number | null)[];
  p: number[];
  s1: (number | null)[];
  s2: (number | null)[];
  s3: (number | null)[];
  g: (number | null)[] | null;
  stints: Stint[];
  pits: number[];
}

export interface Race extends Omit<RaceSummary, "model"> {
  pitLossSamples: number;
  neutral: { type: "SC" | "VSC" | "RED"; from: number; to: number }[];
  bestSectors: { s1: number | null; s2: number | null; s3: number | null };
  model: PaceModel | null;
  drivers: RaceDriver[];
}

export interface SeasonDriver {
  code: string;
  team: string;
  races: number;
  wins: number;
  podiums: number;
  avgPos: number;
  led: number;
  fastest: number;
  pacePct: number | null;
  byRace: ({ pos: number; pace: number | null; pct: number | null } | null)[];
}

export interface Season {
  year: number;
  races: number[];
  drivers: SeasonDriver[];
}

export interface Index {
  generated: string;
  totals: { laps: number; races: number; seasons: number; drivers: number; modelled: number };
  qa: {
    rawRows: number;
    duplicateRows: number;
    duplicatesByYear: Record<string, number>;
    unknownCompoundRows: number;
    missingTyreLife: number;
    rows: number;
    lapTimeAgreement: number;
    lapsCrossChecked: number;
    /** races per timing source: FastF1 cache (2019–2023) or OpenF1 (2024 on) */
    sources?: { fastf1: number; openf1: number };
    /** finished races that are knowingly not on the site, and why */
    knownGaps?: { races: [number, number][]; reason: string };
  };
  races: RaceSummary[];
  seasons: Season[];
  people: Record<string, { name: string; seasons: Record<string, { team: string; num: string }> }>;
}

const base = import.meta.env.BASE_URL;
const cache = new Map<string, Promise<unknown>>();

/**
 * Inside the app the data bundled at build time goes stale after the next race, so the app asks the
 * live site for the race list (revalidating with its ETag) and falls back to the bundled copy when
 * offline or slow; race files come from the bundle unless the race is newer than the build.
 * The website just reads its own files.
 */
const NATIVE = Capacitor.isNativePlatform();
const LIVE = "https://ri360.vercel.app/";
const LIVE_TIMEOUT_MS = 5000;

async function fetchJson(url: string, init?: RequestInit, timeoutMs?: number): Promise<unknown> {
  const ctl = new AbortController();
  const timer = timeoutMs ? window.setTimeout(() => ctl.abort(), timeoutMs) : 0;
  try {
    const r = await fetch(url, { ...init, signal: ctl.signal });
    if (!r.ok) throw new Error(`${r.status}`);
    return await r.json();
  } finally {
    window.clearTimeout(timer);
  }
}

function load<T>(path: string): Promise<T> {
  let p = cache.get(path);
  if (!p) {
    const local = () =>
      fetchJson(`${base}data/${path}`).catch((e: Error) => {
        throw new Error(`Could not load ${path} (${e.message})`);
      });
    const live = () => fetchJson(`${LIVE}data/${path}`, { cache: "no-cache" }, LIVE_TIMEOUT_MS);
    // A finished race never changes, so the bundled copy opens instantly; only races newer than the
    // app's build come from the live site. The index (the list of races) always checks live first.
    p = !NATIVE ? local() : path.startsWith("races/") ? local().catch(live) : live().catch(local);
    p.catch(() => cache.delete(path));
    cache.set(path, p);
  }
  return p as Promise<T>;
}

// refreshData() bumps this, and every mounted data hook fetches again (keeping what it shows until the new data lands)
let version = 0;
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** Drop cached data and fetch everything on screen again (the app's pull-to-refresh). Resolves when the index is back. */
export function refreshData(): Promise<unknown> {
  cache.clear();
  version++;
  listeners.forEach((fn) => fn());
  return load("index.json").catch(() => null);
}

type State<T> = { data: T | null; error: string | null };

function useJson<T>(path: string | null): State<T> {
  const [state, setState] = useState<State<T> & { path: string | null }>({ data: null, error: null, path });
  const v = useSyncExternalStore(subscribe, () => version);
  useEffect(() => {
    if (!path) return;
    let live = true;
    load<T>(path)
      .then((data) => live && setState({ data, error: null, path }))
      .catch((e: Error) => live && setState({ data: null, error: e.message, path }));
    return () => {
      live = false;
    };
  }, [path, v]);
  // never hand back the previous race while the next one is loading
  return state.path === path ? state : { data: null, error: null };
}

export const useIndex = () => useJson<Index>("index.json");
export const useRace = (id: number | null) => useJson<Race>(id == null ? null : `races/${id}.json`);

export const COMPOUND_NAME: Record<Compound, string> = {
  S: "Soft",
  M: "Medium",
  H: "Hard",
  I: "Intermediate",
  W: "Wet",
  "?": "Unknown",
};

export function compoundAt(d: RaceDriver, lap: number): Stint | undefined {
  return d.stints.find((s) => lap >= s.from && lap <= s.to);
}

export function shortName(name: string): string {
  return name.replace(" Grand Prix", "");
}
