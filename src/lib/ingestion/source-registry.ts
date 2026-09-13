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
    notes: "Public pages only; Gold Club paywalled posts blocked",
  },
  {
    name: "AIA AZPreps365 Football Recognitions",
    state: "AZ",
    status: "permitted",
    notes: "Official AIA All-Conference/All-Region HTML; Crawl-Delay 10",
  },
  {
    name: "CHSAA All-State Football",
    state: "CO",
    status: "permitted",
    notes: "CHSAANow.com public all-state HTML tables",
  },
  {
    name: "Texas Sports Writers Association All-State Football",
    state: "TX",
    status: "permitted",
    notes: "Multi-year HTML allstatefootball{YY}.php",
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
