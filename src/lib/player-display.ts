import type { Player } from "@/types/recruiting";

/** College/school line for cards and profiles — never hometown. */
export function playerSchoolLine(player: Player): string {
  const school =
    player.collegeName?.trim() ||
    player.school?.name?.trim() ||
    "College TBD";

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
  return (
    player.collegeName?.trim() ||
    player.school?.name?.trim() ||
    "College TBD"
  );
}
