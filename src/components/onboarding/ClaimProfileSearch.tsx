"use client";

import { useDeferredValue, useEffect, useId, useState } from "react";
import { playerSportLabel } from "@/lib/player-display";
import type { ClaimSearchHit } from "@/types/claim-search";

const STATE_OPTIONS = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL",
  "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
  "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
  "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

export type ClaimProfileSelection = {
  id?: string;
  slug: string;
  displayName: string;
  schoolName: string | null;
  position: string | null;
  classYear: number | null;
  stateCode: string | null;
};

interface ClaimProfileSearchProps {
  selectedSlug: string | null;
  onSelect: (player: ClaimProfileSelection) => void;
  initialQuery?: string;
  className?: string;
}

export default function ClaimProfileSearch({
  selectedSlug,
  onSelect,
  initialQuery = "",
  className = "",
}: ClaimProfileSearchProps) {
  const listId = useId();
  const [query, setQuery] = useState(initialQuery);
  const [stateFilter, setStateFilter] = useState("");
  const [level, setLevel] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [players, setPlayers] = useState<ClaimSearchHit[]>([]);
  const [source, setSource] = useState<"supabase" | "seed" | "none">("none");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (initialQuery && initialQuery.length >= 2) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    const q = deferredQuery;
    if (q.length < 2 && !stateFilter) {
      setPlayers([]);
      setHasSearched(false);
      setSource("none");
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setPlayers([]);
    setSource("none");
    setError(null);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q,
          limit: "50",
          claimable: "1",
        });
        if (stateFilter) params.set("state", stateFilter);
        if (level) params.set("level", level);

        const res = await fetch(`/api/players/search?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Search failed");
        const data = (await res.json()) as {
          players: ClaimSearchHit[];
          source: "supabase" | "seed" | "none";
        };
        if (!controller.signal.aborted) {
          setPlayers(data.players);
          setSource(data.source);
          setHasSearched(true);
          setError(null);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        if (!controller.signal.aborted) {
          setError("Could not search players. Try again.");
          setPlayers([]);
          setHasSearched(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [deferredQuery, stateFilter, level]);

  return (
    <div className={className}>
      <fieldset className="mb-4">
        <legend className="mb-2 text-sm text-text-secondary">Player level</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {[["", "All players"], ["hs", "High school"], ["college", "College"]].map(([value, label]) => (
            <label key={value} className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-text-primary">
              <input type="radio" name={`${listId}-level`} value={value} checked={level === value} onChange={() => setLevel(value)} className="h-4 w-4 accent-accent" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor={`${listId}-search`} className="sr-only">
        Search players to claim
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <span
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            aria-hidden
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
              />
            </svg>
          </span>
          <input
            id={`${listId}-search`}
            type="search"
            autoComplete="off"
            aria-controls={listId}
            placeholder="Search by name or school…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-field py-3 pl-10 pr-4 text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <select
          aria-label="Filter by state"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="rounded-lg border border-border bg-field px-3 py-3 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40 sm:w-28"
        >
          <option value="">All states</option>
          {STATE_OPTIONS.filter(Boolean).map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-text-secondary">
        <span role="status">
          {loading
            ? "Searching…"
            : hasSearched
              ? `${players.length} profile${players.length === 1 ? "" : "s"}`
              : "Type at least 2 letters to search unclaimed profiles"}
        </span>
        {source === "seed" && (
          <span>Offline results</span>
        )}
        {source === "supabase" && (
          <span>Live profiles</span>
        )}
      </div>

      {source === "seed" && (
        <p className="mt-2 text-sm text-text-secondary">
          Live roster search is unavailable. Offline results may not include your profile; try again later.
        </p>
      )}

      <div
        id={listId}
        role="region"
        aria-label="Matching player profiles"
        aria-busy={loading}
        className="mt-3 max-h-72 overflow-y-auto overscroll-contain rounded-xl border border-border bg-field/60 sm:max-h-80"
      >
        {!hasSearched && !loading && (
          <p className="px-4 py-10 text-center text-sm text-text-secondary">
            Search for your name, or choose a state to browse available profiles.
          </p>
        )}

        {loading && <p className="px-4 py-10 text-center text-sm text-text-secondary">Searching profiles…</p>}
        {hasSearched && players.length === 0 && !loading && !error && (
          <p className="px-4 py-10 text-center text-sm text-text-secondary">
            No unclaimed profiles match
            {query ? (
              <>
                {" "}
                &quot;{query}&quot;
              </>
            ) : null}
            . Try another spelling, state, or player level. Only existing roster profiles can be claimed.
          </p>
        )}

        {error && (
          <p role="alert" className="px-4 py-6 text-center text-sm text-red-400">{error}</p>
        )}

        <ul className="divide-y divide-border">
          {players.map((p) => {
            const selected = selectedSlug === p.slug;
            const meta = [
              p.competitionLevel === "hs" ? "High school" : p.competitionLevel === "college" ? "College" : null,
              p.sport ? playerSportLabel(p.sport) : null,
              p.position,
              p.classYear ? `Class of ${p.classYear}` : null,
              p.jerseyNumber != null ? `#${p.jerseyNumber}` : null,
            ]
              .filter(Boolean)
              .join(" · ");
            const schoolLine = p.schoolName || "Team TBD";

            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    onSelect({
                      id: p.id,
                      slug: p.slug,
                      displayName: p.displayName,
                      schoolName: p.schoolName,
                      position: p.position,
                      classYear: p.classYear,
                      stateCode: p.stateCode,
                    })
                  }
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                    selected
                      ? "bg-accent/15 ring-inset ring-1 ring-accent/50"
                      : "hover:bg-bg-card-hover"
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      selected ? "bg-accent" : "bg-border"
                    }`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-[family-name:var(--font-display)] text-lg tracking-wide text-text-primary">
                      {p.displayName}
                    </span>
                    {meta && (
                      <span className="mt-0.5 block text-sm text-text-secondary">{meta}</span>
                    )}
                    {schoolLine && (
                      <span className="block truncate text-sm text-text-muted">
                        {schoolLine}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 rounded-md border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-text-muted">
                    {selected ? "Is this you?" : "Claim"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
