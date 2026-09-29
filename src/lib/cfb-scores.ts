/**
 * Live college scoreboards via ESPN's public site API (no key required).
 * Football is the default; other NCAA sports share the same scoreboard shape.
 */

export type CfbGameStatus = "scheduled" | "in" | "final" | "other";

export type CfbTeamScore = {
  id: string;
  name: string;
  abbreviation: string;
  logo?: string;
  score: number | null;
  winner: boolean;
  homeAway: "home" | "away" | string;
  rank: number | null;
  record: string | null;
};

export type CfbGame = {
  id: string;
  name: string;
  shortName: string;
  status: CfbGameStatus;
  statusDetail: string;
  startTime: string | null;
  venue: string | null;
  broadcast: string | null;
  /** ESPN conference / grouping label when available. */
  conference: string | null;
  home: CfbTeamScore;
  away: CfbTeamScore;
};

export type CfbScoreboard = {
  weekLabel: string | null;
  seasonYear: number | null;
  games: CfbGame[];
  fetchedAt: string;
};

export type CfbScoreSort = "status" | "recent";
export type CfbScoreDay = "week" | "today" | "yesterday" | "recent";

/** Takkle conference label → ESPN scoreboard `groups` id (FBS + Top 25). */
export const CFB_ESPN_CONFERENCES = [
  { value: "all", label: "All conferences", groupId: null },
  { value: "top25", label: "AP Top 25", groupId: "80" },
  { value: "SEC", label: "SEC", groupId: "8" },
  { value: "Big Ten", label: "Big Ten", groupId: "5" },
  { value: "Big 12", label: "Big 12", groupId: "4" },
  { value: "ACC", label: "ACC", groupId: "1" },
  { value: "AAC", label: "AAC", groupId: "151" },
  { value: "Mountain West", label: "Mountain West", groupId: "17" },
  { value: "Sun Belt", label: "Sun Belt", groupId: "37" },
  { value: "MAC", label: "MAC", groupId: "15" },
  { value: "Conference USA", label: "Conference USA", groupId: "12" },
  { value: "Pac-12", label: "Pac-12", groupId: "9" },
  { value: "FBS Independents", label: "FBS Independents", groupId: "18" },
] as const;

export type CfbEspnConferenceValue = (typeof CFB_ESPN_CONFERENCES)[number]["value"];

/** NCAA sports with a public ESPN scoreboard. Conference groups are football-only. */
export const COLLEGE_SCORE_SPORTS = [
  { value: "football", label: "Football", path: "football/college-football", hasConferences: true },
  { value: "mbb", label: "Men's Basketball", path: "basketball/mens-college-basketball", hasConferences: false },
  { value: "wbb", label: "Women's Basketball", path: "basketball/womens-college-basketball", hasConferences: false },
  { value: "baseball", label: "Baseball", path: "baseball/college-baseball", hasConferences: false },
  { value: "softball", label: "Softball", path: "baseball/college-softball", hasConferences: false },
  { value: "mhockey", label: "Men's Hockey", path: "hockey/mens-college-hockey", hasConferences: false },
  { value: "wvball", label: "Women's Volleyball", path: "volleyball/womens-college-volleyball", hasConferences: false },
  { value: "msoccer", label: "Men's Soccer", path: "soccer/usa.ncaa.m.1", hasConferences: false },
  { value: "wsoccer", label: "Women's Soccer", path: "soccer/usa.ncaa.w.1", hasConferences: false },
  { value: "mlax", label: "Men's Lacrosse", path: "lacrosse/mens-college-lacrosse", hasConferences: false },
  { value: "wlax", label: "Women's Lacrosse", path: "lacrosse/womens-college-lacrosse", hasConferences: false },
] as const;

export type CollegeScoreSport = (typeof COLLEGE_SCORE_SPORTS)[number]["value"];

const ESPN_SCOREBOARD_ROOT = "https://site.api.espn.com/apis/site/v2/sports";

function mapStatus(state?: string): CfbGameStatus {
  const s = (state || "").toLowerCase();
  if (s === "pre") return "scheduled";
  if (s === "in") return "in";
  if (s === "post") return "final";
  return "other";
}

function mapCompetitor(raw: Record<string, unknown>): CfbTeamScore {
  const team = (raw.team as Record<string, unknown>) || {};
  const records = Array.isArray(raw.records) ? raw.records : [];
  const overall = records.find(
    (r) => (r as { type?: string }).type === "total",
  ) as { summary?: string } | undefined;
  const curatedRank = team.curatedRank as { current?: number } | undefined;
  const competitorRank = raw.curatedRank as { current?: number } | undefined;
  const rankRaw = competitorRank?.current ?? curatedRank?.current ?? null;

  const scoreRaw = raw.score;
  const score =
    scoreRaw === "" || scoreRaw == null ? null : Number(scoreRaw);

  return {
    id: String(team.id ?? raw.id ?? ""),
    name: String(team.displayName ?? team.name ?? "TBD"),
    abbreviation: String(team.abbreviation ?? ""),
    logo: typeof team.logo === "string" ? team.logo : undefined,
    score: Number.isFinite(score as number) ? (score as number) : null,
    winner: Boolean(raw.winner),
    homeAway: String(raw.homeAway ?? ""),
    rank: typeof rankRaw === "number" && rankRaw > 0 ? rankRaw : null,
    record: overall?.summary ?? null,
  };
}

function conferenceLabelFromCompetition(comp: Record<string, unknown>): string | null {
  const groups = Array.isArray(comp.groups) ? comp.groups : [];
  for (const g of groups) {
    const row = g as { name?: string; shortName?: string; abbreviation?: string };
    const name = row.name || row.shortName || row.abbreviation;
    if (name) return String(name);
  }
  return null;
}

function ymdInTz(date: Date, timeZone = "America/New_York"): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}${get("month")}${get("day")}`;
}

function shiftYmd(ymd: string, deltaDays: number): string {
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(4, 6));
  const d = Number(ymd.slice(6, 8));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

export function resolveCollegeSport(
  raw: string | null | undefined,
): CollegeScoreSport {
  const hit = COLLEGE_SCORE_SPORTS.find((s) => s.value === raw);
  return hit?.value ?? "football";
}

export function collegeScoreSport(value: CollegeScoreSport) {
  return COLLEGE_SCORE_SPORTS.find((s) => s.value === value) ?? COLLEGE_SCORE_SPORTS[0];
}

export function resolveCfbConference(
  raw: string | null | undefined,
): CfbEspnConferenceValue {
  const hit = CFB_ESPN_CONFERENCES.find((c) => c.value === raw);
  return hit?.value ?? "all";
}

export function resolveCfbSort(raw: string | null | undefined): CfbScoreSort {
  return raw === "recent" ? "recent" : "status";
}

export function resolveCfbDay(raw: string | null | undefined): CfbScoreDay {
  if (raw === "today" || raw === "yesterday" || raw === "recent") return raw;
  return "week";
}

function datesParamForDay(day: CfbScoreDay): string | null {
  if (day === "week") return null;
  const today = ymdInTz(new Date());
  if (day === "today") return today;
  if (day === "yesterday") return shiftYmd(today, -1);
  // recent = last 3 days through today
  return `${shiftYmd(today, -2)}-${today}`;
}

export type GetCfbScoreboardOptions = {
  conference?: CfbEspnConferenceValue;
  day?: CfbScoreDay;
  sport?: CollegeScoreSport;
};

export async function getCfbScoreboard(
  options: GetCfbScoreboardOptions = {},
): Promise<CfbScoreboard> {
  const sport = collegeScoreSport(options.sport ?? "football");
  const conference = sport.hasConferences ? (options.conference ?? "all") : "all";
  const day = options.day ?? "week";
  const conf = CFB_ESPN_CONFERENCES.find((c) => c.value === conference);
  const groupId = conf?.groupId ?? null;
  const dates = datesParamForDay(day);

  const url = new URL(`${ESPN_SCOREBOARD_ROOT}/${sport.path}/scoreboard`);
  url.searchParams.set("limit", "300");
  if (groupId) url.searchParams.set("groups", groupId);
  if (dates) url.searchParams.set("dates", dates);

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`${sport.label} scoreboard fetch failed (${res.status})`);
  }

  const data = (await res.json()) as {
    week?: { number?: number; text?: string };
    season?: { year?: number };
    events?: Array<Record<string, unknown>>;
  };

  const games: CfbGame[] = [];
  for (const event of data.events ?? []) {
    const competitions = Array.isArray(event.competitions) ? event.competitions : [];
    const comp = (competitions[0] as Record<string, unknown>) || {};
    const statusObj = (event.status as Record<string, unknown>) || {};
    const statusType = (statusObj.type as Record<string, unknown>) || {};
    const competitors = Array.isArray(comp.competitors) ? comp.competitors : [];

    const homeRaw = competitors.find(
      (c) => (c as { homeAway?: string }).homeAway === "home",
    ) as Record<string, unknown> | undefined;
    const awayRaw = competitors.find(
      (c) => (c as { homeAway?: string }).homeAway === "away",
    ) as Record<string, unknown> | undefined;

    if (!homeRaw || !awayRaw) continue;

    const venue = (comp.venue as { fullName?: string } | undefined)?.fullName ?? null;
    const broadcasts = Array.isArray(comp.broadcasts) ? comp.broadcasts : [];
    const broadcastNames = broadcasts
      .flatMap((b) => {
        const names = (b as { names?: string[] }).names;
        return Array.isArray(names) ? names : [];
      })
      .filter(Boolean);

    const confLabel =
      conference !== "all" && conference !== "top25"
        ? conference
        : conferenceLabelFromCompetition(comp);

    games.push({
      id: String(event.id ?? ""),
      name: String(event.name ?? ""),
      shortName: String(event.shortName ?? event.name ?? ""),
      status: mapStatus(statusType.state as string | undefined),
      statusDetail: String(statusType.detail ?? statusType.description ?? ""),
      startTime: typeof event.date === "string" ? event.date : null,
      venue,
      broadcast: broadcastNames[0] ?? null,
      conference: confLabel,
      home: mapCompetitor(homeRaw),
      away: mapCompetitor(awayRaw),
    });
  }

  const weekNum = data.week?.number;
  const weekLabel =
    data.week?.text ||
    (weekNum != null ? `Week ${weekNum}` : null);

  return {
    weekLabel,
    seasonYear: data.season?.year ?? null,
    games,
    fetchedAt: new Date().toISOString(),
  };
}

function startMs(game: CfbGame): number {
  if (!game.startTime) return 0;
  const t = Date.parse(game.startTime);
  return Number.isFinite(t) ? t : 0;
}

/** Sort games for the selected view. */
export function sortCfbGames(games: CfbGame[], sort: CfbScoreSort): CfbGame[] {
  const copy = [...games];
  if (sort === "recent") {
    return copy.sort((a, b) => startMs(b) - startMs(a));
  }
  // status view: live first, then upcoming (soonest), then final (most recent)
  const rank = (s: CfbGameStatus) =>
    s === "in" ? 0 : s === "scheduled" || s === "other" ? 1 : 2;
  return copy.sort((a, b) => {
    const dr = rank(a.status) - rank(b.status);
    if (dr !== 0) return dr;
    if (a.status === "final") return startMs(b) - startMs(a);
    return startMs(a) - startMs(b);
  });
}

export function groupCfbGames(games: CfbGame[], sort: CfbScoreSort) {
  const sorted = sortCfbGames(games, sort);
  const live = sorted.filter((g) => g.status === "in");
  const final = sorted.filter((g) => g.status === "final");
  const upcoming = sorted.filter((g) => g.status === "scheduled" || g.status === "other");
  if (sort === "recent") {
    return { sections: [
      { key: "final", title: "Recent finals", tone: "text-text-primary" as const, games: final },
      { key: "live", title: "Live", tone: "text-turf" as const, games: live },
      { key: "upcoming", title: "Upcoming", tone: "text-text-primary" as const, games: upcoming },
    ]};
  }
  return {
    sections: [
      { key: "live", title: "Live", tone: "text-turf" as const, games: live },
      { key: "upcoming", title: "Upcoming", tone: "text-text-primary" as const, games: upcoming },
      { key: "final", title: "Final", tone: "text-text-primary" as const, games: final },
    ],
  };
}
