"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { FootballPosition, RankingScope } from "@/types/recruiting";
import {
  DEFAULT_RECRUIT_CLASS,
  RECRUIT_CLASS_YEARS,
} from "@/lib/recruiting/class-years";
import { RANKING_POSITIONS } from "@/lib/scoring/research-rankings";

const SCOPES: { value: RankingScope; label: string }[] = [
  { value: "position", label: "By Position" },
  { value: "national", label: "National" },
  { value: "state", label: "State" },
  { value: "class", label: "Class" },
];

const STATES = ["CA", "TX", "FL", "GA", "OH"];

export default function RankingsFilters() {
  const router = useRouter();
  const params = useSearchParams();

  function update(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.push(`/rankings?${next.toString()}`);
  }

  const selectClass =
    "rounded-lg border border-border bg-field px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none";

  const scope = (params.get("scope") ?? "national") as RankingScope;
  const position = params.get("position") ?? "QB";
  const classYear = params.get("class") ?? "";
  const state = params.get("state") ?? "CA";

  return (
    <div className="flex flex-wrap gap-3">
      {SCOPES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => {
            if (value === "position") {
              update({ scope: value, position, class: classYear || null });
            } else if (value === "state") {
              update({ scope: value, state });
            } else if (value === "class") {
              update({ scope: value, class: classYear || String(DEFAULT_RECRUIT_CLASS) });
            } else {
              update({ scope: value, class: null });
            }
          }}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            scope === value
              ? "bg-accent text-white"
              : "border border-border bg-bg-card text-text-secondary hover:text-text-primary"
          }`}
        >
          {label}
        </button>
      ))}

      {(scope === "position" || scope === "class") && (
        <select
          className={selectClass}
          value={classYear || "all"}
          onChange={(e) =>
            update({
              class: e.target.value === "all" ? null : e.target.value,
              scope,
            })
          }
        >
          <option value="all">All eligibility years</option>
          {RECRUIT_CLASS_YEARS.map((y) => (
            <option key={y} value={y}>
              Class of {y}
            </option>
          ))}
        </select>
      )}

      {scope === "position" && (
        <select
          className={selectClass}
          value={position}
          onChange={(e) =>
            update({ position: e.target.value as FootballPosition, scope: "position" })
          }
        >
          {RANKING_POSITIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      )}

      {scope === "state" && (
        <select
          className={selectClass}
          value={state}
          onChange={(e) => update({ state: e.target.value, scope: "state" })}
        >
          {STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
