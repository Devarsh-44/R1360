import { useEffect, useState } from "react";

export interface Route {
  path: string[];
  query: URLSearchParams;
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [p, q = ""] = raw.split("?");
  return { path: p.split("/").filter(Boolean), query: new URLSearchParams(q) };
}

/** Tiny hash router: static-host friendly, deep-linkable, no server rewrites. */
export function useRoute(): Route {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export function href(path: string, query?: Record<string, string | number | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) if (v != null && v !== "") q.set(k, String(v));
  const s = q.toString();
  return `#/${path}${s ? `?${s}` : ""}`;
}

/** Open a race story on top of the current page, so closing it returns here. */
export function openStory(raceId: number) {
  history.pushState({ ri360Story: true }, "", href(`race/${raceId}/story`));
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

/** Close a story: back to where it was opened from, or to its race page when it was opened by link. */
export function closeStory(raceId: number) {
  if ((history.state as { ri360Story?: boolean } | null)?.ri360Story) history.back();
  else replace(`race/${raceId}`);
}

/** Update the URL without adding a history entry (for selectors inside a page). */
export function replace(path: string, query?: Record<string, string | number | null | undefined>) {
  const url = href(path, query);
  history.replaceState(null, "", url);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}
