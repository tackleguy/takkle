"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { CollegeDivision, FootballPosition, RankingScope } from "@/types/recruiting";
import {
  DEFAULT_RECRUIT_CLASS,
  RECRUIT_CLASS_YEARS,
} from "@/lib/recruiting/class-years";
import {
  COLLEGE_DIVISIONS,
  CONFERENCES_BY_DIVISION,
  defaultConferenceForDivision,
  divisionForConference,
  isCollegeDivision,
} from "@/lib/recruiting/college-conferences";
import { RANKING_POSITIONS } from "@/lib/scoring/research-rankings";

const SCOPES: { value: RankingScope; label: string }[] = [
  { value: "national", label: "National" },
  { value: "division", label: "By Division" },
  { value: "conference", label: "By Conference" },
  { value: "position", label: "By Position" },
  { value: "class", label: "Class" },
];

interface RankingsFiltersProps {
  /** Defaults to `/rankings`; use `/nil/scores` for the NIL leaderboard. */
  basePath?: string;
}

export default function RankingsFilters({ basePath = "/rankings" }: RankingsFiltersProps) {
  const router = useRouter();
  const params = useSearchParams();

  function update(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("state");
    router.push(`${basePath}?${next.toString()}`);
  }

  const selectClass =
    "rounded-lg border border-border bg-field px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none";

  const rawScope = params.get("scope") ?? "national";
  const scope = (rawScope === "state" ? "national" : rawScope) as RankingScope;
  const position = params.get("position") ?? "QB";
  const classYear = params.get("class") ?? "";
  const divisionParam = params.get("division");
  const division: CollegeDivision = isCollegeDivision(divisionParam) ? divisionParam : "fbs";
  const conferenceList = CONFERENCES_BY_DIVISION[division];
  const conferenceParam = params.get("conference");
  const conference =
    conferenceParam && conferenceList.includes(conferenceParam)
      ? conferenceParam
      : defaultConferenceForDivision(division);

  return (
    <div className="flex flex-wrap gap-3">
      {SCOPES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => {
            if (value === "position") {
              update({
                scope: value,
                position,
                class: classYear || null,
                conference: null,
                division: null,
              });
            } else if (value === "class") {
              update({
                scope: value,
                class: classYear || String(DEFAULT_RECRUIT_CLASS),
                position: null,
                conference: null,
                division: null,
              });
            } else if (value === "conference") {
              update({
                scope: value,
                division,
                conference: defaultConferenceForDivision(division),
                position: null,
                class: null,
              });
            } else if (value === "division") {
              update({
                scope: value,
                division,
                position: null,
                class: null,
                conference: null,
              });
            } else {
              update({
                scope: value,
                class: null,
                position: null,
                conference: null,
                division: null,
              });
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

      {(scope === "division" || scope === "conference") && (
        <select
          className={selectClass}
          value={division}
          onChange={(e) => {
            const nextDivision = e.target.value as CollegeDivision;
            if (scope === "conference") {
              update({
                division: nextDivision,
                conference: defaultConferenceForDivision(nextDivision),
                scope: "conference",
              });
            } else {
              update({
                division: nextDivision,
                scope: "division",
              });
            }
          }}
        >
          {COLLEGE_DIVISIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      )}

      {scope === "conference" && (
        <select
          className={selectClass}
          value={conference}
          onChange={(e) => {
            const nextConference = e.target.value;
            const nextDivision = divisionForConference(nextConference) ?? division;
            update({
              conference: nextConference,
              division: nextDivision,
              scope: "conference",
            });
          }}
        >
          {COLLEGE_DIVISIONS.map((d) => (
            <optgroup key={d.value} label={d.label}>
              {CONFERENCES_BY_DIVISION[d.value].map((c) => (
                <option key={`${d.value}-${c}`} value={c}>
                  {c}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      )}

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
    </div>
  );
}
