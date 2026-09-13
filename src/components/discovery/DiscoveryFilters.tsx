"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { FootballPosition } from "@/types/recruiting";
import { RECRUIT_CLASS_YEARS } from "@/lib/recruiting/class-years";

const STATES = ["CA", "TX", "FL", "GA", "OH"];
const POSITIONS: FootballPosition[] = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P", "ATH"];

export default function DiscoveryFilters() {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`/discover?${next.toString()}`);
  }

  const selectClass =
    "w-full rounded-lg border border-border bg-field px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wider text-text-muted">Search</label>
        <input
          type="search"
          defaultValue={params.get("q") ?? ""}
          placeholder="Name, school, city..."
          className={selectClass}
          onKeyDown={(e) => {
            if (e.key === "Enter") update("q", (e.target as HTMLInputElement).value);
          }}
          onBlur={(e) => update("q", e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wider text-text-muted">State</label>
        <select
          className={selectClass}
          value={params.get("state") ?? ""}
          onChange={(e) => update("state", e.target.value)}
        >
          <option value="">All states</option>
          {STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wider text-text-muted">Position</label>
        <select
          className={selectClass}
          value={params.get("position") ?? ""}
          onChange={(e) => update("position", e.target.value)}
        >
          <option value="">All positions</option>
          {POSITIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wider text-text-muted">Class</label>
        <select
          className={selectClass}
          value={params.get("class") ?? ""}
          onChange={(e) => update("class", e.target.value)}
        >
          <option value="">2027–2031</option>
          {RECRUIT_CLASS_YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wider text-text-muted">Min Score</label>
        <select
          className={selectClass}
          value={params.get("minScore") ?? ""}
          onChange={(e) => update("minScore", e.target.value)}
        >
          <option value="">Any</option>
          {[5, 6, 7, 8, 9].map((s) => (
            <option key={s} value={s}>{s}.0+</option>
          ))}
        </select>
      </div>
    </div>
  );
}
