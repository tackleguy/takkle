/**
 * Educational NCAA Division I football eligibility estimate.
 * Not official NCAA advice — schools and compliance offices decide.
 */

export const CURRENT_SEASON_YEAR = 2026;

/** Base competition seasons for D1 football (4 seasons of competition). */
export const BASE_COMPETITION_SEASONS = 4;

export type RedshirtStatus = "none" | "redshirted" | "planning";

export interface EligibilityInput {
  /** Calendar year of first full-time college enrollment */
  enrollmentYear: number;
  /** Competition seasons already used (0–4+ with waivers) */
  seasonsUsed: number;
  redshirt: RedshirtStatus;
  /** 2020 COVID extra year granted */
  covidExtraYear: boolean;
  /** Medical hardship / other season restored */
  medicalHardship: boolean;
  /** Academic year being planned for (defaults to current) */
  planningYear?: number;
}

export interface EligibilityBreakdown {
  label: string;
  delta: number;
  detail: string;
}

export interface EligibilityResult {
  baseSeasons: number;
  totalSeasonsAllowed: number;
  seasonsUsed: number;
  seasonsRemaining: number;
  /** Last calendar year they can still compete if remaining seasons are used consecutively */
  eligibilityEndYear: number;
  /** Years left on the 5-year clock from first enrollment */
  clockYearsRemaining: number;
  clockEndYear: number;
  status: "eligible" | "final_season" | "exhausted" | "clock_expired";
  statusLabel: string;
  summary: string;
  breakdown: EligibilityBreakdown[];
}

const CLOCK_YEARS = 5;

export function calculateEligibility(input: EligibilityInput): EligibilityResult {
  const planningYear = input.planningYear ?? CURRENT_SEASON_YEAR;
  const enrollmentYear = Math.min(
    Math.max(input.enrollmentYear, planningYear - 10),
    planningYear
  );
  const seasonsUsed = Math.min(Math.max(input.seasonsUsed, 0), 8);

  const breakdown: EligibilityBreakdown[] = [
    {
      label: "Base competition seasons",
      delta: BASE_COMPETITION_SEASONS,
      detail: "NCAA D1 football: four seasons of competition",
    },
  ];

  let bonus = 0;

  if (input.redshirt === "redshirted" || input.redshirt === "planning") {
    bonus += 1;
    breakdown.push({
      label: input.redshirt === "planning" ? "Planned redshirt" : "Redshirt year",
      delta: 1,
      detail:
        "Preserves a competition season while advancing the five-year clock",
    });
  }

  if (input.covidExtraYear) {
    bonus += 1;
    breakdown.push({
      label: "COVID extra year",
      delta: 1,
      detail: "Additional season commonly granted for 2020 participation",
    });
  }

  if (input.medicalHardship) {
    bonus += 1;
    breakdown.push({
      label: "Medical hardship",
      delta: 1,
      detail: "Season restored when a hardship waiver is approved",
    });
  }

  const totalSeasonsAllowed = BASE_COMPETITION_SEASONS + bonus;
  const rawRemaining = Math.max(totalSeasonsAllowed - seasonsUsed, 0);

  const clockEndYear = enrollmentYear + CLOCK_YEARS - 1;
  const clockYearsRemaining = Math.max(clockEndYear - planningYear + 1, 0);

  const seasonsRemaining = Math.min(rawRemaining, clockYearsRemaining);
  const eligibilityEndYear =
    seasonsRemaining > 0 ? planningYear + seasonsRemaining - 1 : planningYear - 1;

  let status: EligibilityResult["status"];
  let statusLabel: string;
  let summary: string;

  if (rawRemaining > 0 && clockYearsRemaining <= 0) {
    status = "clock_expired";
    statusLabel = "Five-year clock expired";
    summary =
      "Competition seasons may remain on paper, but the five-year enrollment clock has ended. Confirm any extensions with compliance.";
  } else if (seasonsRemaining <= 0) {
    status = "exhausted";
    statusLabel = "No seasons remaining";
    summary =
      "All estimated competition seasons are used. Check hardship, graduate transfer, or other waivers with your school.";
  } else if (seasonsRemaining === 1) {
    status = "final_season";
    statusLabel = "Final season";
    summary = `One competition season left. If you play in ${planningYear}, your estimated eligibility ends after that season.`;
  } else {
    status = "eligible";
    statusLabel = "Seasons remaining";
    summary = `About ${seasonsRemaining} competition seasons left through ${eligibilityEndYear}, within the five-year clock ending ${clockEndYear}.`;
  }

  return {
    baseSeasons: BASE_COMPETITION_SEASONS,
    totalSeasonsAllowed,
    seasonsUsed,
    seasonsRemaining,
    eligibilityEndYear,
    clockYearsRemaining,
    clockEndYear,
    status,
    statusLabel,
    summary,
    breakdown,
  };
}

export function enrollmentYearOptions(planningYear = CURRENT_SEASON_YEAR): number[] {
  return Array.from({ length: 8 }, (_, i) => planningYear - i);
}
