"use client";

import { useDeferredValue, useEffect, useId, useState, useTransition } from "react";
import type { ClaimSearchHit } from "@/types/claim-search";

const STATE_OPTIONS = [
  "",
  "CA",
  "TX",
  "FL",
  "GA",
  "OH",
  "AL",
  "AZ",
  "NC",
  "PA",
  "NY",
  "IL",
  "MI",
  "LA",
  "MS",
  "TN",
  "SC",
  "VA",
  "WA",
  "OR",
] as const;

export type ClaimProfileSelection = {
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
  const deferredQuery = useDeferredValue(query.trim());
  const [players, setPlayers] = useState<ClaimSearchHit[]>([]);
  const [source, setSource] = useState<"supabase" | "seed" | "none">("none");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (initialQuery && initialQuery.length >= 2) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    const q = deferredQuery;
    if (q.length < 2 && !stateFilter) {
      startTransition(() => {
        setPlayers([]);
        setHasSearched(false);
        setSource("none");
        setError(null);
      });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q,
          limit: "50",
          claimable: "1",
        });
        if (stateFilter) params.set("state", stateFilter);

        const res = await fetch(`/api/players/search?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Search failed");
        const data = (await res.json()) as {
          players: ClaimSearchHit[];
          source: "supabase" | "seed" | "none";
        };
        startTransition(() => {
          setPlayers(data.players);
          setSource(data.source);
          setHasSearched(true);
          setError(null);
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        startTransition(() => {
          setError("Could not search players. Try again.");
          setPlayers([]);
          setHasSearched(true);
        });
      }
    }, 220);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [deferredQuery, stateFilter]);

  return (
    <div className={className}>
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
            role="combobox"
            aria-expanded={players.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
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

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-text-muted">
        <span>
          {isPending
            ? "Searching…"
            : hasSearched
              ? `${players.length} profile${players.length === 1 ? "" : "s"}`
              : "Type at least 2 letters to search unclaimed profiles"}
        </span>
        {source === "seed" && (
          <span className="text-amber-500/90">Demo seed results</span>
        )}
        {source === "supabase" && (
          <span className="text-turf">Live database</span>
        )}
      </div>

      <div
        id={listId}
        role="listbox"
        aria-label="Matching player profiles"
        className="mt-3 max-h-72 overflow-y-auto overscroll-contain rounded-xl border border-border bg-field/60 sm:max-h-80"
      >
        {!hasSearched && (
          <p className="px-4 py-10 text-center text-sm text-text-muted">
            Results will scroll here. Pick the profile that is you.
          </p>
        )}

        {hasSearched && players.length === 0 && !isPending && (
          <p className="px-4 py-10 text-center text-sm text-text-muted">
            No unclaimed profiles match
            {query ? (
              <>
                {" "}
                &quot;{query}&quot;
              </>
            ) : null}
            . Try another spelling or state.
          </p>
        )}

        {error && (
          <p className="px-4 py-6 text-center text-sm text-red-400">{error}</p>
        )}

        <ul className="divide-y divide-border">
          {players.map((p) => {
            const selected = selectedSlug === p.slug;
            const meta = [
              p.position,
              p.classYear ? `Class of ${p.classYear}` : null,
              p.jerseyNumber != null ? `#${p.jerseyNumber}` : null,
            ]
              .filter(Boolean)
              .join(" · ");
            const schoolLine = p.schoolName || "College TBD";

            return (
              <li key={p.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() =>
                    onSelect({
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
