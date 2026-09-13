"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { FootballPosition, RankingScope } from "@/types/recruiting";

const SCOPES: { value: RankingScope; label: string }[] = [
  { value: "national", label: "National" },
  { value: "state", label: "State" },
  { value: "position", label: "Position" },
  { value: "class", label: "Class" },
];

const STATES = ["CA", "TX", "FL", "GA", "OH"];
const POSITIONS: FootballPosition[] = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P", "ATH"];
const CLASS_YEARS = [2025, 2026, 2027, 2028, 2029];

export default function RankingsFilters() {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/rankings?${next.toString()}`);
  }

  const selectClass =
    "rounded-lg border border-border bg-field px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none";

  const scope = (params.get("scope") ?? "national") as RankingScope;

  return (
    <div className="flex flex-wrap gap-3">
      {SCOPES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => update("scope", value)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            scope === value
              ? "bg-accent text-white"
              : "border border-border bg-bg-card text-text-secondary hover:text-text-primary"
          }`}
        >
          {label}
        </button>
      ))}
      {scope === "state" && (
        <select className={selectClass} value={params.get("state") ?? "FL"} onChange={(e) => update("state", e.target.value)}>
          {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      )}
      {scope === "position" && (
        <select className={selectClass} value={params.get("position") ?? "QB"} onChange={(e) => update("position", e.target.value)}>
          {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      )}
      {scope === "class" && (
        <select className={selectClass} value={params.get("class") ?? "2028"} onChange={(e) => update("class", e.target.value)}>
          {CLASS_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      )}
    </div>
  );
}
