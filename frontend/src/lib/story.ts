import { COMPOUND_NAME, type Compound, type Index, type Race, type RaceDriver, type Stint } from "./data";
import { lapTime, median, stopsLabel } from "./format";

/** One full-screen card in a race story. Every card is computed from the race file; nothing is hand-written. */
export interface StoryCard {
  id: "winner" | "climb" | "strategy" | "pace" | "conditions" | "full";
  /** colour treatment: dark pit-wall card, petrol tint, plain paper or red tint */
  tone: "inverse" | "petrol" | "paper" | "red";
  kicker: string;
  big: string;
  sub: string;
  body: string;
  viz?:
    | { kind: "stints"; stints: Stint[]; total: number }
    | { kind: "move"; from: number; to: number }
    | { kind: "rows"; unit: string; rows: { label: string; value: string; share: number; focus: boolean; stints?: Stint[] }[]; total?: number };
}

const DRY: Compound[] = ["S", "M", "H"];
const WET: Compound[] = ["I", "W"];

export function surname(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(" ") : name;
}

function compounds(stints: Stint[]): string {
  return stints.map((s) => COMPOUND_NAME[s.c].toLowerCase()).join(" → ");
}

function listLaps(laps: number[]): string {
  if (laps.length <= 1) return laps.join("");
  return `${laps.slice(0, -1).join(", ")} and ${laps[laps.length - 1]}`;
}

/** Laps where the winner switched between wet and dry tyres, e.g. ["Slicks on lap 16", "Inters on lap 62"]. */
function crossovers(stints: Stint[]): string[] {
  const out: string[] = [];
  for (let i = 1; i < stints.length; i++) {
    const a = stints[i - 1].c;
    const b = stints[i].c;
    if (WET.includes(a) && DRY.includes(b)) out.push(`slicks on lap ${stints[i - 1].to}`);
    if (DRY.includes(a) && WET.includes(b)) out.push(`${b === "W" ? "full wets" : "inters"} on lap ${stints[i - 1].to}`);
  }
  return out;
}

const seq = (d: RaceDriver) => d.stints.map((s) => s.c).join("");

export function buildStory(race: Race, index: Index): StoryCard[] {
  const cards: StoryCard[] = [];
  const w = race.drivers[0];
  if (!w) return cards;
  const classified = race.drivers.filter((d) => d.laps >= w.laps * 0.9);
  const stops = Math.max(0, w.stints.length - 1);

  // 1 · the winner
  const p2 = race.drivers[1];
  const gapP2 = p2?.g && w.g && p2.laps === w.laps ? (w.g[w.g.length - 1] ?? 0) - (p2.g[p2.g.length - 1] ?? 0) : null;
  const flips = crossovers(w.stints);
  cards.push({
    id: "winner",
    tone: "inverse",
    kicker: `Race result · Round ${race.round}`,
    big: surname(w.name),
    sub: w.grid === 1 ? "wins from pole" : w.grid > 0 ? `wins from P${w.grid}` : "wins from the pit lane",
    body:
      (flips.length
        ? `${w.team}. ${flips.length > 1 ? "Two" : "One"} tyre call${flips.length > 1 ? "s" : ""} in changing weather: ${flips.join(", then ")}.`
        : `${w.team}, on a ${stopsLabel(stops)} ${compounds(w.stints)} plan.`) +
      (gapP2 != null && gapP2 > 0 ? ` ${gapP2.toFixed(1)}s clear of ${p2.code} at the flag.` : ""),
    viz: w.stints.length ? { kind: "stints", stints: w.stints, total: race.laps } : undefined,
  });

  // 2 · the biggest climb among classified finishers
  const climber = classified
    .filter((d) => d.grid > 0 && d.code !== w.code)
    .map((d) => ({ d, gain: d.grid - d.pos }))
    .sort((a, b) => b.gain - a.gain || a.d.pos - b.d.pos)[0];
  if (climber && climber.gain >= 3) {
    const d = climber.d;
    const same = seq(d) === seq(w);
    cards.push({
      id: "climb",
      tone: "petrol",
      kicker: "Biggest climb",
      big: `+${climber.gain}`,
      sub: `${surname(d.name)}, P${d.grid} to P${d.pos}`,
      body: `${d.team}. ${same ? "Same tyre plan as the winner" : `A ${stopsLabel(d.stints.length - 1)} ${compounds(d.stints)} plan`}, from row ${Math.ceil(d.grid / 2)} of the grid.`,
      viz: { kind: "move", from: d.grid, to: d.pos },
    });
  }

  // 3 · the strategy call
  const top10 = classified.slice(0, 10);
  const copies = top10.filter((d) => seq(d) === seq(w)).length;
  const pitLaps = w.stints.slice(0, -1).map((s) => s.to);
  cards.push({
    id: "strategy",
    tone: "paper",
    kicker: "The strategy call",
    big: stops === 0 ? "No stop" : `${stops} stop${stops > 1 ? "s" : ""}`,
    sub: flips.length ? "for the weather" : stops === 0 ? "tyres to the flag" : `lap${pitLaps.length > 1 ? "s" : ""} ${listLaps(pitLaps)}`,
    body:
      `${w.code} ran ${compounds(w.stints)}${flips.length ? `, stopping on lap${pitLaps.length > 1 ? "s" : ""} ${listLaps(pitLaps)}` : ""}. ` +
      (copies > 1 ? `${copies} of the top ${top10.length} used the same compounds.` : `Nobody else in the top ${top10.length} copied it.`),
    viz: {
      kind: "rows",
      unit: "",
      total: race.laps,
      rows: classified.slice(0, 5).map((d) => ({ label: `P${d.pos} ${d.code}`, value: `${d.stints.length - 1}`, share: 1, focus: d.code === w.code, stints: d.stints })),
    },
  });

  // 4 · the fastest car vs the result (median clean-air lap)
  const paced = classified.filter((d) => d.pace != null).sort((a, b) => a.pace! - b.pace!);
  if (paced.length >= 3) {
    const best = paced[0];
    const next = paced[1];
    const lo = paced[0].pace!;
    const shown = paced.slice(0, 4);
    const span = Math.max(0.05, shown[shown.length - 1].pace! - lo);
    const rows = shown.map((d) => ({
      label: `${d.code} · P${d.pos}`,
      value: d === best ? lapTime(d.pace) : `+${(d.pace! - lo).toFixed(3)}`,
      share: 1 - ((d.pace! - lo) / span) * 0.7,
      focus: d === best,
    }));
    if (best.code !== w.code) {
      const diff = w.pace != null ? w.pace - best.pace! : null;
      cards.push({
        id: "pace",
        tone: "inverse",
        kicker: "Fastest car",
        big: surname(best.name),
        sub: `was quickest, finished P${best.pos}`,
        body: `Median clean-air lap ${lapTime(best.pace)}${diff != null ? `, ${diff.toFixed(3)}s a lap faster than ${w.code}` : ""}. Pace alone didn't decide this one.`,
        viz: { kind: "rows", unit: "s", rows },
      });
    } else {
      cards.push({
        id: "pace",
        tone: "inverse",
        kicker: "Fastest car",
        big: surname(w.name),
        sub: "quickest and first",
        body: `Median clean-air lap ${lapTime(w.pace)}, ${(next.pace! - w.pace!).toFixed(3)}s a lap clear of ${next.code}.`,
        viz: { kind: "rows", unit: "s", rows },
      });
    }
  }

  // 5 · what kind of race it was
  if (race.wetShare > 0.1) {
    cards.push({
      id: "conditions",
      tone: "petrol",
      kicker: "Conditions",
      big: `${Math.round(race.wetShare * 100)}%`,
      sub: "of laps on inters or wets",
      body: `${race.weather ? `Air ${race.weather.air}°C, track ${race.weather.track}°C. ` : ""}Wet races are the hardest to model: grip changes from one lap to the next.`,
    });
  } else if (race.neutral.length) {
    const laps = race.neutral.reduce((a, n) => a + n.to - n.from + 1, 0);
    const kinds = [...new Set(race.neutral.map((n) => (n.type === "RED" ? "red flag" : n.type)))].join(" and ");
    cards.push({
      id: "conditions",
      tone: "red",
      kicker: "Neutralised",
      big: String(laps),
      sub: `lap${laps > 1 ? "s" : ""} under ${kinds}`,
      body: `${race.neutral.map((n) => `${n.type === "RED" ? "Red flag" : n.type} ${n.to > n.from ? `laps ${n.from}–${n.to}` : `lap ${n.from}`}`).join(", ")}. A cheap pit stop under caution can rewrite the order.`,
    });
  } else {
    const all = index.races.filter((r) => r.pitLoss > 0).map((r) => r.pitLoss);
    const med = all.length ? median(all) : null;
    cards.push({
      id: "conditions",
      tone: "red",
      kicker: "Pit lane",
      big: `${race.pitLoss.toFixed(1)}s`,
      sub: "lost per stop",
      body:
        med != null
          ? `${Math.abs(race.pitLoss - med) < 0.5 ? "Right on" : race.pitLoss > med ? "Dearer than" : "Cheaper than"} the ${med.toFixed(1)}s median across all ${all.length} races, with no safety car to soften a stop.`
          : "No safety car to soften a stop.",
    });
  }

  // 6 · hand-off to the full analysis
  cards.push({
    id: "full",
    tone: "inverse",
    kicker: `${race.year} · ${race.location ?? race.country ?? ""}`.replace(/ · $/, ""),
    big: race.name.replace(" Grand Prix", " GP"),
    sub: "the full analysis",
    body: "Race trace, lap times, positions, every tyre strategy, sectors and the pace model behind each lap.",
  });

  return cards;
}
