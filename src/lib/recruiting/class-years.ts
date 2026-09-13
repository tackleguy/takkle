/** Active high-school recruiting classes shown in Discover / Rankings / Claim. */
export const RECRUIT_CLASS_YEARS = [2027, 2028, 2029, 2030, 2031] as const;

export type RecruitClassYear = (typeof RECRUIT_CLASS_YEARS)[number];

export const RECRUIT_CLASS_MIN = RECRUIT_CLASS_YEARS[0];
export const RECRUIT_CLASS_MAX = RECRUIT_CLASS_YEARS[RECRUIT_CLASS_YEARS.length - 1];

export const DEFAULT_RECRUIT_CLASS: RecruitClassYear = 2028;

export function isRecruitClassYear(year: number | null | undefined): boolean {
  if (year == null || Number.isNaN(year)) return false;
  return year >= RECRUIT_CLASS_MIN && year <= RECRUIT_CLASS_MAX;
}

export function clampToRecruitClass(year: number): RecruitClassYear | null {
  if (!isRecruitClassYear(year)) return null;
  return year as RecruitClassYear;
}
