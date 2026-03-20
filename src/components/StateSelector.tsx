"use client";

import { useState } from "react";
import Link from "next/link";
import { states, getStatusColor, getStatusLabel } from "@/data/states";

export default function StateSelector() {
  const [search, setSearch] = useState("");

  const filtered = states.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.abbreviation.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by state name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md mx-auto block px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filtered.map((state) => (
          <Link
            key={state.slug}
            href={`/nil-rules/${state.slug}`}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-bg-card hover:bg-bg-card-hover hover:border-accent/40 text-text-secondary hover:text-text-primary transition-all text-left text-sm group"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: getStatusColor(state.status) }}
            />
            <span className="truncate flex-1">{state.name}</span>
            <span
              className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              style={{ color: getStatusColor(state.status) }}
            >
              {getStatusLabel(state.status)}
            </span>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-text-muted py-8">
          No states found matching &quot;{search}&quot;
        </p>
      )}
    </div>
  );
}
