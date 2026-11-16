import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { useMemo, useState, type ReactNode } from "react";
import { useWidth } from "./useWidth";

export type SeriesKind = "focus" | "compare" | "third" | "muted";

export interface Series {
  id: string;
  label: string;
  kind: SeriesKind;
  points: { x: number; y: number | null }[];
  /** points to mark with a dot of the series colour (e.g. pit stops) */
  marks?: number[];
}

export interface Band {
  from: number;
  to: number;
  label: string;
}

interface Props {
  series: Series[];
  height?: number;
  yFormat: (v: number) => string;
  xLabel?: string;
  yLabel?: string;
  yDomain?: [number, number];
  invertY?: boolean;
  zeroLine?: boolean;
  bands?: Band[];
  best?: { x: number; y: number; label: string };
  ariaLabel: string;
  /** label the end of each highlighted line (≤ 4 lines) */
  directLabels?: boolean;
  tipTitle?: (x: number) => string;
  yTicks?: number;
}

const M = { top: 16, right: 56, bottom: 34, left: 56 };

export function LineChart({ series, height = 300, yFormat, xLabel, yLabel, yDomain, invertY, zeroLine, bands = [], best, ariaLabel, directLabels = true, tipTitle, yTicks = 5 }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hoverX, setHoverX] = useState<number | null>(null);
  const narrow = width < 520;
  const m = { ...M, right: directLabels ? (narrow ? 40 : M.right) : 12, left: narrow ? 46 : M.left };

  const { x, y, xs } = useMemo(() => {
    const all = series.flatMap((s) => s.points);
    const xsSet = new Set<number>();
    let ylo = Infinity, yhi = -Infinity, xlo = Infinity, xhi = -Infinity;
    for (const p of all) {
      xsSet.add(p.x);
      xlo = Math.min(xlo, p.x);
      xhi = Math.max(xhi, p.x);
      if (p.y != null) {
        ylo = Math.min(ylo, p.y);
        yhi = Math.max(yhi, p.y);
      }
    }
    if (!isFinite(xlo)) { xlo = 0; xhi = 1; }
    if (!isFinite(ylo)) { ylo = 0; yhi = 1; }
    const pad = (yhi - ylo) * 0.06 || 1;
    const dom = yDomain ?? [ylo - pad, yhi + pad];
    const yScale = scaleLinear().domain(dom).range(invertY ? [m.top, height - m.bottom] : [height - m.bottom, m.top]);
    if (!yDomain) yScale.nice(yTicks);
    const xScale = scaleLinear().domain([xlo, xhi]).range([m.left, width - m.right]);
    return { x: xScale, y: yScale, xs: [...xsSet].sort((a, b) => a - b) };
  }, [series, width, height, yDomain, invertY, m.left, m.right, m.top, m.bottom, yTicks]);

  const path = line<{ x: number; y: number | null }>()
    .defined((p) => p.y != null && isFinite(p.y))
    .x((p) => x(p.x))
    .y((p) => y(p.y as number));

  // draw muted first so highlighted series sit on top
  const order = [...series].sort((a, b) => rank(a.kind) - rank(b.kind));
  const highlighted = series.filter((s) => s.kind !== "muted");

  const onMove = (clientX: number, rect: DOMRect) => {
    const px = ((clientX - rect.left) / rect.width) * width;
    const xv = x.invert(px);
    let nearest = xs[0];
    for (const v of xs) if (Math.abs(v - xv) < Math.abs(nearest - xv)) nearest = v;
    setHoverX(nearest);
  };

  const hoverVals = hoverX == null ? [] : highlighted.map((s) => ({ s, p: s.points.find((p) => p.x === hoverX) })).filter((v) => v.p && v.p.y != null);

  // end labels, nudged apart so they never collide
  const ends = directLabels && highlighted.length <= 4
    ? spread(
        highlighted
          .map((s) => {
            const last = [...s.points].reverse().find((p) => p.y != null);
            return last ? { s, x: x(last.x), y: y(last.y as number) } : null;
          })
          .filter((e): e is { s: Series; x: number; y: number } => e != null),
        13,
      )
    : [];

  const xTicks = x.ticks(narrow ? 5 : 10).filter((t) => Number.isInteger(t));

  return (
    <div className="chart" ref={ref}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel}
        onMouseMove={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setHoverX(null)}
        onTouchStart={(e) => onMove(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}
        onTouchMove={(e) => onMove(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}
        onTouchEnd={() => setHoverX(null)}
      >
        <rect className="plot-bg" x={m.left} y={m.top} width={Math.max(0, width - m.left - m.right)} height={height - m.top - m.bottom} rx={4} />
        {bands.map((b, i) => (
          <g key={i}>
            <rect className="band-sc" x={x(b.from - 0.5)} y={m.top} width={Math.max(2, x(b.to + 0.5) - x(b.from - 0.5))} height={height - m.top - m.bottom} />
            <text className="band-label" x={x(b.from - 0.5) + 3} y={m.top + 11}>{b.label}</text>
          </g>
        ))}
        <g className="axis">
          {y.ticks(yTicks).map((t) => (
            <g key={t}>
              <line className="grid-line" x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} />
              <text x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end">{yFormat(t)}</text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text key={t} x={x(t)} y={height - m.bottom + 16} textAnchor="middle">{t}</text>
          ))}
          {xLabel && <text className="axis-title" x={width - m.right} y={height - 2} textAnchor="end">{xLabel}</text>}
          {yLabel && <text className="axis-title" x={m.left} y={10}>{yLabel}</text>}
        </g>
        {zeroLine && y.domain()[0] < 0 && y.domain()[1] > 0 && <line className="zero-line" x1={m.left} x2={width - m.right} y1={y(0)} y2={y(0)} />}
        {order.map((s) => (
          <path key={s.id} className={`s-${s.kind}`} d={path(s.points) ?? ""}>
            <title>{s.label}</title>
          </path>
        ))}
        {highlighted.flatMap((s) =>
          (s.marks ?? []).map((mx) => {
            const p = s.points.find((q) => q.x === mx);
            return p && p.y != null ? <circle key={`${s.id}-${mx}`} className={`dot-${s.kind}`} cx={x(p.x)} cy={y(p.y)} r={4} /> : null;
          }),
        )}
        {best && <circle className="s-best" cx={x(best.x)} cy={y(best.y)} r={5.5}><title>{best.label}</title></circle>}
        {ends.map((e) => (
          <text key={e.s.id} className="direct-label" x={e.x + 6} y={e.ly} dy="0.32em">{e.s.label}</text>
        ))}
        {hoverX != null && (
          <g>
            <line className="crosshair" x1={x(hoverX)} x2={x(hoverX)} y1={m.top} y2={height - m.bottom} />
            {hoverVals.map(({ s, p }) => (
              <circle key={s.id} className={`dot-${s.kind}`} cx={x(hoverX)} cy={y(p!.y as number)} r={4.5} />
            ))}
          </g>
        )}
      </svg>
      {hoverX != null && hoverVals.length > 0 && (
        <div className="tip" style={{ left: `${(clamp(x(hoverX), 90, width - 90) / width) * 100}%`, top: m.top + 4 }}>
          <div className="caption" style={{ color: "inherit", opacity: 0.75 }}>{tipTitle ? tipTitle(hoverX) : `Lap ${hoverX}`}</div>
          {hoverVals.map(({ s, p }) => (
            <div key={s.id}>
              {s.label} <b>{yFormat(p!.y as number)}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Legend({ items }: { items: { kind: SeriesKind | "best" | "sc"; label: ReactNode }[] }) {
  return (
    <div className="legend">
      {items.map((it, i) => (
        <span key={i}>
          <i className={`k-${it.kind}`} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function rank(k: SeriesKind) {
  return k === "muted" ? 0 : k === "third" ? 1 : k === "compare" ? 2 : 3;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function spread<T extends { y: number }>(items: T[], gap: number): (T & { ly: number })[] {
  const sorted = [...items].sort((a, b) => a.y - b.y).map((it) => ({ ...it, ly: it.y }));
  for (let i = 1; i < sorted.length; i++) if (sorted[i].ly - sorted[i - 1].ly < gap) sorted[i].ly = sorted[i - 1].ly + gap;
  return sorted;
}
