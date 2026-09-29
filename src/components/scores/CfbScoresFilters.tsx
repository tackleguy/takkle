"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  CFB_ESPN_CONFERENCES,
  COLLEGE_SCORE_SPORTS,
  collegeScoreSport,
  resolveCfbConference,
  resolveCfbDay,
  resolveCfbSort,
  resolveCollegeSport,
  type CfbScoreDay,
  type CfbScoreSort,
  type CollegeScoreSport,
} from "@/lib/cfb-scores";

const SORTS: { value: CfbScoreSort; label: string }[] = [
  { value: "status", label: "By status" },
  { value: "recent", label: "Recent games" },
];

const DAYS: { value: CfbScoreDay; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "recent", label: "Last 3 days" },
];

export default function CfbScoresFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const sport: CollegeScoreSport = resolveCollegeSport(params.get("sport"));
  const sportMeta = collegeScoreSport(sport);
  const conference = resolveCfbConference(params.get("conference"));
  const sort = resolveCfbSort(params.get("sort"));
  const day = resolveCfbDay(params.get("day"));

  function update(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const qs = next.toString();
    router.push(qs ? `/cfb/scores?${qs}` : "/cfb/scores");
  }

  const selectClass =
    "rounded-lg border border-border bg-field px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none";

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="College sport">
        {COLLEGE_SCORE_SPORTS.map((item) => {
          const active = sport === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() =>
                update({
                  sport: item.value === "football" ? null : item.value,
                  conference: item.hasConferences ? (conference === "all" ? null : conference) : null,
                })
              }
              className={`rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-accent ${
                active
                  ? "bg-accent text-white"
                  : "border border-border bg-field text-text-secondary hover:text-text-primary"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Sort scores">
        {SORTS.map(({ value, label }) => {
          const active = sort === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() =>
                update({
                  sort: value === "status" ? null : value,
                  // Recent sort pairs well with a recent day window when still on "week"
                  day: value === "recent" && day === "week" ? "recent" : day === "week" ? null : day,
                })
              }
              className={`rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-accent ${
                active
                  ? "bg-accent text-white"
                  : "border border-border bg-field text-text-secondary hover:text-text-primary"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Game day">
        {DAYS.map(({ value, label }) => {
          const active = day === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => update({ day: value === "week" ? null : value })}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors focus-visible:outline-accent ${
                active
                  ? "border border-accent/60 text-accent bg-accent/10"
                  : "border border-border text-text-muted hover:text-text-secondary"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {sportMeta.hasConferences ? (
        <label className="block text-sm text-text-secondary">
          Conference
          <select
            className={`mt-1 block w-full max-w-xs ${selectClass}`}
            value={conference}
            onChange={(e) =>
              update({
                conference: e.target.value === "all" ? null : e.target.value,
              })
            }
          >
            {CFB_ESPN_CONFERENCES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
