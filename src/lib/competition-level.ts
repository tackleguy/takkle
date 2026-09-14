/** Active product inventory: NCAA D1 FBS/FCS college athletes. HS rows stay dormant. */
export const ACTIVE_COMPETITION_LEVEL = "college" as const;

export type CompetitionLevel = "hs" | "college";
export type CollegeDivision = "fbs" | "fcs";

export type TransferPortalStatus =
  | "not_in_portal"
  | "entered"
  | "withdrawn"
  | "committed"
  | "enrolled"
  | "unknown";
