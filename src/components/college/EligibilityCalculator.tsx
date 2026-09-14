"use client";

import { useMemo, useState } from "react";
import {
  CURRENT_SEASON_YEAR,
  calculateEligibility,
  enrollmentYearOptions,
  type RedshirtStatus,
} from "@/lib/eligibility";

const fieldClass =
  "w-full px-4 py-3 bg-bg-primary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all";

const labelClass = "block text-sm font-medium text-text-secondary mb-2";

const statusStyles = {
  eligible: "text-turf border-turf/40 bg-turf/10",
  final_season: "text-status-limited border-status-limited/40 bg-status-limited/10",
  exhausted: "text-status-prohibited border-status-prohibited/40 bg-status-prohibited/10",
  clock_expired: "text-status-unclear border-status-unclear/40 bg-status-unclear/10",
} as const;

export default function EligibilityCalculator() {
  const [enrollmentYear, setEnrollmentYear] = useState(CURRENT_SEASON_YEAR - 1);
  const [seasonsUsed, setSeasonsUsed] = useState(0);
  const [redshirt, setRedshirt] = useState<RedshirtStatus>("none");
  const [covidExtraYear, setCovidExtraYear] = useState(false);
  const [medicalHardship, setMedicalHardship] = useState(false);

  const result = useMemo(
    () =>
      calculateEligibility({
        enrollmentYear,
        seasonsUsed,
        redshirt,
        covidExtraYear,
        medicalHardship,
        planningYear: CURRENT_SEASON_YEAR,
      }),
    [enrollmentYear, seasonsUsed, redshirt, covidExtraYear, medicalHardship]
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <form
        className="space-y-6"
        onSubmit={(e) => e.preventDefault()}
        aria-label="College eligibility calculator"
      >
        <div>
          <label htmlFor="enrollment-year" className={labelClass}>
            First full-time enrollment year
          </label>
          <select
            id="enrollment-year"
            className={fieldClass}
            value={enrollmentYear}
            onChange={(e) => setEnrollmentYear(Number(e.target.value))}
          >
            {enrollmentYearOptions().map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="seasons-used" className={labelClass}>
            Competition seasons already used
          </label>
          <select
            id="seasons-used"
            className={fieldClass}
            value={seasonsUsed}
            onChange={(e) => setSeasonsUsed(Number(e.target.value))}
          >
            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "season" : "seasons"}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-text-muted">
            Count seasons you played in games toward your limit — not practice-only redshirts.
          </p>
        </div>

        <fieldset>
          <legend className={labelClass}>Redshirt</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                ["none", "No redshirt"],
                ["redshirted", "Already redshirted"],
                ["planning", "Planning to redshirt"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-3 text-sm transition-colors ${
                  redshirt === value
                    ? "border-accent bg-accent/10 text-text-primary"
                    : "border-border bg-bg-primary text-text-secondary hover:border-accent/40"
                }`}
              >
                <input
                  type="radio"
                  name="redshirt"
                  value={value}
                  checked={redshirt === value}
                  onChange={() => setRedshirt(value)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={covidExtraYear}
              onChange={(e) => setCovidExtraYear(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border bg-bg-primary text-accent focus:ring-accent"
            />
            <span>
              <span className="text-text-primary">COVID extra year</span>
              <span className="block text-xs text-text-muted mt-0.5">
                Granted an additional season tied to 2020
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={medicalHardship}
              onChange={(e) => setMedicalHardship(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border bg-bg-primary text-accent focus:ring-accent"
            />
            <span>
              <span className="text-text-primary">Medical hardship waiver</span>
              <span className="block text-xs text-text-muted mt-0.5">
                A season restored by an approved hardship waiver
              </span>
            </span>
          </label>
        </div>
      </form>

      <div
        className={`rounded-xl border p-6 sm:p-8 transition-colors duration-300 ${statusStyles[result.status]}`}
        aria-live="polite"
      >
        <p className="font-[family-name:var(--font-display)] text-sm tracking-[0.2em] uppercase opacity-80">
          {result.statusLabel}
        </p>
        <p className="mt-3 font-[family-name:var(--font-display)] text-6xl sm:text-7xl leading-none tabular-nums text-text-primary">
          {result.seasonsRemaining}
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          {result.seasonsRemaining === 1 ? "season remaining" : "seasons remaining"}
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-text-muted">Eligibility through</dt>
            <dd className="font-[family-name:var(--font-display)] text-2xl text-text-primary tracking-wide">
              {result.seasonsRemaining > 0 ? result.eligibilityEndYear : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Clock years left</dt>
            <dd className="font-[family-name:var(--font-display)] text-2xl text-text-primary tracking-wide">
              {result.clockYearsRemaining}
            </dd>
          </div>
        </dl>

        <p className="mt-5 text-sm text-text-secondary leading-relaxed">{result.summary}</p>

        <ul className="mt-6 space-y-2 border-t border-border/60 pt-5">
          {result.breakdown.map((row) => (
            <li
              key={row.label}
              className="flex items-baseline justify-between gap-3 text-sm text-text-secondary"
            >
              <span>
                {row.label}
                <span className="block text-xs text-text-muted">{row.detail}</span>
              </span>
              <span className="tabular-nums text-text-primary shrink-0">
                {row.delta > 0 ? `+${row.delta}` : row.delta}
              </span>
            </li>
          ))}
          <li className="flex items-baseline justify-between gap-3 text-sm pt-2 border-t border-border/40">
            <span className="text-text-primary">Used</span>
            <span className="tabular-nums text-text-primary">−{result.seasonsUsed}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
