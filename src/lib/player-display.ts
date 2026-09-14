import type { Player } from "@/types/recruiting";

const PLACEHOLDER_SCHOOLS = new Set([
  "unknown",
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
  if (!name || PLACEHOLDER_SCHOOLS.has(name.toLowerCase())) return "Team";
  return name;
}

/** College/school line for cards and profiles — never hometown. */
export function playerSchoolLine(player: Player): string {
  const school = displaySchoolLabel(
    player.collegeName?.trim() || player.school?.name?.trim(),
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
    player.collegeName?.trim() || player.school?.name?.trim(),
  );
}
