/** College conferences present in live `takkle.players` inventory. */
export const COLLEGE_CONFERENCES = [
  "AAC",
  "ACC",
  "Big 12",
  "Big Sky",
  "Big Ten",
  "CAA",
  "Conference USA",
  "FBS Independents",
  "Ivy",
  "MAC",
  "MEAC",
  "Mountain West",
  "MVFC",
  "NEC",
  "Ohio Valley",
  "Pac-12",
  "Patriot",
  "Pioneer",
  "SEC",
  "Southland",
  "Southern",
  "Sun Belt",
  "SWAC",
  "United Athletic",
] as const;

export type CollegeConference = (typeof COLLEGE_CONFERENCES)[number];

export const COLLEGE_DIVISIONS = [
  { value: "fbs", label: "FBS" },
  { value: "fcs", label: "FCS" },
] as const;
