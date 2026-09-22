import corrections from "@/data/seed/college-profile-corrections.json";
import type { Player } from "@/types/recruiting";

type Correction = {
  firstName: string;
  lastName: string;
  displayName: string;
  collegeName: string;
  conference: string | null;
  heightInches: number | null;
  weightLbs: number | null;
  sourceUrl: string;
  verifiedAt: string;
};

/** Repair known transfer-feed corruption without overwriting claimed profiles. */
export function restoreCollegeRoster(player: Player): Player {
  const correction = (corrections as Record<string, Correction>)[player.id];
  if (!correction || player.status !== "unclaimed" || player.provenance.sourceName !== "ESPN Transfer Portal Rankings") return player;
  return {
    ...player,
    firstName: correction.firstName,
    lastName: correction.lastName,
    displayName: correction.displayName,
    collegeName: correction.collegeName,
    school: { ...player.school, name: correction.collegeName },
    conference: correction.conference ?? player.conference,
    heightInches: correction.heightInches ?? player.heightInches,
    weightLbs: correction.weightLbs ?? player.weightLbs,
    provenance: { ...player.provenance, sourceName: "ESPN College Football Player Profile", sourceUrl: correction.sourceUrl, dataOrigin: "manual_import", lastVerifiedAt: correction.verifiedAt },
  };
}
