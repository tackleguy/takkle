"use client";

import { useState } from "react";
import { states, getStatusColor, type StateData } from "@/data/states";

interface StateSelectorProps {
  onSelect: (state: StateData) => void;
  selectedSlug?: string;
}

export default function StateSelector({
  onSelect,
  selectedSlug,
}: StateSelectorProps) {
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
          <button
            key={state.slug}
            onClick={() => onSelect(state)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all text-left text-sm ${
              selectedSlug === state.slug
                ? "border-accent bg-accent/10 text-text-primary"
                : "border-border bg-bg-card hover:bg-bg-card-hover text-text-secondary hover:text-text-primary"
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: getStatusColor(state.status) }}
            />
            <span className="truncate">{state.name}</span>
          </button>
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
