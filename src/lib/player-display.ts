import type { Player } from "@/types/recruiting";

const PLACEHOLDER_SCHOOLS = new Set([
  "unknown",
  "team",
  "wl",
  "n/a",
  "tbd",
  "?",
  "",
  "transfer portal",
  "the transfer portal",
]);

/** Normalize school/college labels for UI — never show "Transfer Portal". */
export function displaySchoolLabel(raw: string | null | undefined): string {
  const name = raw?.trim() ?? "";
  if (!name || PLACEHOLDER_SCHOOLS.has(name.toLowerCase())) return "School not listed";
  return name;
}

/** College/school line for cards and profiles — never hometown. */
export function playerSchoolLine(player: Player): string {
  const school = displaySchoolLabel(
    [player.collegeName, player.school?.name].find(name => name?.trim() && !PLACEHOLDER_SCHOOLS.has(name.trim().toLowerCase())),
  );

  if (player.competitionLevel === "college" || player.collegeName || player.division) {
    const parts = [school];
    if (player.conference?.trim()) parts.push(player.conference.trim());
    if (player.division) parts.push(player.division.toUpperCase());
    return parts.join(" · ");
  }

  const city = player.school?.city?.trim();
  const state = player.stateCode?.trim();
  if (city && state) return `${school} · ${city}, ${state}`;
  if (state) return `${school} · ${state}`;
  return school;
}

/** Short school name only (tables, featured strips). */
export function playerSchoolName(player: Player): string {
  return displaySchoolLabel(
    [player.collegeName, player.school?.name].find(name => name?.trim() && !PLACEHOLDER_SCHOOLS.has(name.trim().toLowerCase())),
  );
}

export function playerDisplayName(player: Pick<Player, "displayName" | "firstName" | "lastName">): string {
  return player.displayName?.trim() || [player.firstName, player.lastName].filter(Boolean).join(" ").trim() || "Name not listed";
}

export function formatHeight(inches: number): string {
  if (!Number.isFinite(inches) || inches <= 0) return "Not listed";
  const rounded = Math.round(inches);
  return `${Math.floor(rounded / 12)}′ ${rounded % 12}″`;
}

export function formatWeight(lbs: number): string {
  return Number.isFinite(lbs) && lbs > 0 ? `${lbs} lbs` : "Not listed";
}

export function playerClassLabel(player: Pick<Player, "competitionLevel" | "classYear">): string {
  if (player.competitionLevel === "college") return "College football";
  return player.classYear > 0 ? `Class of ${player.classYear}` : "Class not listed";
}
