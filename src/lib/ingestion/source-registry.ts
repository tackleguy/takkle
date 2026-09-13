/**
 * Source permission registry for HS football ingestion.
 * Update when probing new association / media sources.
 */
export const INGESTION_SOURCE_REGISTRY = [
  {
    name: "NCES Common Core of Data (CCD)",
    state: null,
    status: "permitted",
    notes: "Public domain school directory",
  },
  {
    name: "CIF Southern Section All-CIF Football",
    state: "CA",
    status: "permitted",
    notes: "HTML tables 2022–2026; older seasons PDF embeds → CSV fallback",
  },
  {
    name: "Cal-Hi Sports All-State Football",
    state: "CA",
    status: "permitted",
    notes: "Public pages seasonEnd≥2024 only; Gold Club blocked; adapters keep class 2027–2031",
  },
  {
    name: "AIA AZPreps365 Football Recognitions",
    state: "AZ",
    status: "permitted",
    notes: "Official AIA HTML; no class year on lists — CFBD needed for 2027–2031 window",
  },
  {
    name: "CHSAA All-State Football",
    state: "CO",
    status: "permitted",
    notes: "CHSAANow.com public all-state; seasonEnd≥2024; keep class 2027–2031",
  },
  {
    name: "UHSAA Academic All-State Football",
    state: "UT",
    status: "permitted",
    notes: "Senior academic charts (classYear=seasonEnd); outside 2027–2031 until 2027 season",
  },
  {
    name: "Texas Sports Writers Association All-State Football",
    state: "TX",
    status: "permitted",
    notes: "Multi-year HTML allstatefootball{YY}.php",
  },
  {
    name: "OSAA (Oregon)",
    state: "OR",
    status: "blocked",
    notes: "Cloudflare challenge / HTTP 403 on association pages",
  },
  {
    name: "NIAA (Nevada)",
    state: "NV",
    status: "blocked",
    notes: "CloudFront 403",
  },
  {
    name: "WIAA (Washington)",
    state: "WA",
    status: "blocked",
    notes: "HTTP 405 on athletics paths; no public all-state HTML found",
  },
  {
    name: "IDHSAA (Idaho)",
    state: "ID",
    status: "blocked",
    notes: "HTTP 403 on records paths",
  },

  {
    name: "Illinois High School Football Coaches Association All-State",
    state: "IL",
    status: "permitted",
    notes: "Official IHSFCA PDF all-state + HM lists via TeamLinkt CDN",
  },
  {
    name: "Indiana Football Coaches Association All-State",
    state: "IN",
    status: "permitted",
    notes: "Official IFCA HTML all-state tables (senior/junior by class)",
  },
  {
    name: "Pennsylvania Football Writers All-State",
    state: "PA",
    status: "permitted",
    notes: "Public writers lists hosted on High School Football America",
  },
  {
    name: "South Carolina Football Coaches Association All-State",
    state: "SC",
    status: "permitted",
    notes: "SCFCA selections mirrored by local public media",
  },
  {
    name: "Florida HS Football (floridahsfootball.com)",
    state: "FL",
    status: "permitted",
    notes:
      "Direct site paywalled; ingest via High School Football America public mirrors only",
  },
  {
    name: "Tennessee Sports Writers Association All-State",
    state: "TN",
    status: "permitted",
    notes: "Public HSFA mirrors of Tennessee writers all-state lists",
  },
  {
    name: "Louisiana Football Coaches Association All-State",
    state: "LA",
    status: "permitted",
    notes: "Public HSFA mirrors; LHSAA site robots Disallow:/",
  },
  {
    name: "Georgia Athletic Coaches Association All-State",
    state: "GA",
    status: "permitted",
    notes: "Public HSFA mirrors of GACA all-state lists",
  },
  {
    name: "Yahoo Sports Illinois All-State Football",
    state: "IL",
    status: "permitted",
    notes: "Public Yahoo Sports complete Illinois all-state articles",
  },
  {
    name: "Michigan High School Football Coaches Association All-State",
    state: "MI",
    status: "permitted",
    notes: "Public HSFA mirrors of MHSFCA all-state lists",
  },
  {
    name: "HighSchoolOT All-State (NC)",
    state: "NC",
    status: "blocked",
    notes: "robots.txt Disallow:/ for User-agent: *",
  },
  {
    name: "VHSL.org (VA)",
    state: "VA",
    status: "blocked",
    notes: "robots.txt Disallow:/ for User-agent: *",
  },
  {
    name: "nj.com / MLive all-state mirrors",
    state: null,
    status: "blocked",
    notes: "WAF/JS challenge HTTP 403",
  },
  {
    name: "Manual CSV import",
    state: null,
    status: "permitted",
    notes: "Operator / school-submitted lists with provenance URL",
  },
  {
    name: "MaxPreps",
    state: null,
    status: "blocked",
    notes: "robots.txt Disallow /school/ /team/",
  },
  {
    name: "Scorebook Live / scores.cifss.org",
    state: "CA",
    status: "blocked",
    notes: "AWS WAF challenge + commercial ToS",
  },
  {
    name: "CIF San Diego / North Coast / Central section sites",
    state: "CA",
    status: "blocked",
    notes: "HTTP 403 or no public all-CIF HTML lists; CSV fallback",
  },
  {
    name: "Dave Campbell's Texas Football",
    state: "TX",
    status: "manual_only",
    notes: "Commercial; use CSV if operator has permitted list",
  },
] as const;
