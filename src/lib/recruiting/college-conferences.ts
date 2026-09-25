import type { CollegeDivision } from "@/types/recruiting";

export const COLLEGE_DIVISIONS = [
  { value: "fbs", label: "FBS" },
  { value: "fcs", label: "FCS" },
  { value: "d2", label: "DII" },
  { value: "d3", label: "DIII" },
] as const;

export type CollegeDivisionOption = (typeof COLLEGE_DIVISIONS)[number]["value"];

/** Conferences grouped by division for rankings filters. */
export const CONFERENCES_BY_DIVISION: Record<CollegeDivision, readonly string[]> = {
  fbs: [
    "AAC",
    "ACC",
    "Big 12",
    "Big Ten",
    "Conference USA",
    "FBS Independents",
    "MAC",
    "Mountain West",
    "Pac-12",
    "SEC",
    "Sun Belt",
  ],
  fcs: [
    "Big Sky",
    "CAA",
    "Ivy",
    "MEAC",
    "MVFC",
    "NEC",
    "Ohio Valley",
    "Patriot",
    "Pioneer",
    "Southland",
    "Southern",
    "SWAC",
    "United Athletic",
  ],
  d2: [
    "CIAA",
    "Conference Carolinas",
    "DII Independents",
    "GAC",
    "GLIAC",
    "GLVC",
    "G-MAC",
    "GNAC",
    "GSC",
    "Lone Star",
    "MEC",
    "MIAA",
    "NE10",
    "NSIC",
    "PSAC",
    "RMAC",
    "SAC",
    "SIAC",
  ],
  d3: [
    "ARC",
    "ASC",
    "CCIW",
    "Centennial",
    "CNE",
    "DIII Independents",
    "Empire 8",
    "Heartland",
    "Landmark",
    "Liberty League",
    "MAC D3",
    "MIAA D3",
    "MIAC",
    "Midwest",
    "MSCAC",
    "NACC",
    "NCAC",
    "NESCAC",
    "NEWMAC",
    "NJAC",
    "NWC",
    "OAC",
    "ODAC",
    "PAC",
    "SAA",
    "SCAC",
    "SCIAC",
    "UMAC",
    "USA South",
    "WIAC",
  ],
};

/** Flat list kept for search/fallback. */
export const COLLEGE_CONFERENCES = [
  ...CONFERENCES_BY_DIVISION.fbs,
  ...CONFERENCES_BY_DIVISION.fcs,
  ...CONFERENCES_BY_DIVISION.d2,
  ...CONFERENCES_BY_DIVISION.d3,
] as const;

export type CollegeConference = (typeof COLLEGE_CONFERENCES)[number];

export function isCollegeDivision(value: string | null | undefined): value is CollegeDivision {
  return value === "fbs" || value === "fcs" || value === "d2" || value === "d3";
}

export function divisionLabel(division: CollegeDivision): string {
  return COLLEGE_DIVISIONS.find((d) => d.value === division)?.label ?? division.toUpperCase();
}

export function defaultConferenceForDivision(division: CollegeDivision): string {
  return CONFERENCES_BY_DIVISION[division][0] ?? "SEC";
}

export function conferencesForDivision(division: CollegeDivision): readonly string[] {
  return CONFERENCES_BY_DIVISION[division];
}

/** Infer which division a conference belongs to. */
export function divisionForConference(conference: string): CollegeDivision | null {
  const name = conference.trim().toLowerCase();
  for (const [div, list] of Object.entries(CONFERENCES_BY_DIVISION) as Array<
    [CollegeDivision, readonly string[]]
  >) {
    if (list.some((c) => c.toLowerCase() === name)) return div;
  }
  return null;
}
