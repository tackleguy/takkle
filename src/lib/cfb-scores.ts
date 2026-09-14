/**
 * Live CFB scoreboard via ESPN's public site API (no key required).
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
  home: CfbTeamScore;
  away: CfbTeamScore;
};

export type CfbScoreboard = {
  weekLabel: string | null;
  seasonYear: number | null;
  games: CfbGame[];
  fetchedAt: string;
};

const ESPN_SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard";

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

export async function getCfbScoreboard(): Promise<CfbScoreboard> {
  const res = await fetch(ESPN_SCOREBOARD, {
    next: { revalidate: 60 },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`CFB scoreboard fetch failed (${res.status})`);
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

    games.push({
      id: String(event.id ?? ""),
      name: String(event.name ?? ""),
      shortName: String(event.shortName ?? event.name ?? ""),
      status: mapStatus(statusType.state as string | undefined),
      statusDetail: String(statusType.detail ?? statusType.description ?? ""),
      startTime: typeof event.date === "string" ? event.date : null,
      venue,
      broadcast: broadcastNames[0] ?? null,
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
