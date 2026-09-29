#!/usr/bin/env node
/**
 * Fetch NCAA roster athletes for the non-football college sports on the Scores page
 * and upsert them into takkle.players with sport set.
 *
 * Usage:
 *   node --env-file=.env.local scripts/ingest-espn-college-sports.mjs
 *   node --env-file=.env.local scripts/ingest-espn-college-sports.mjs --sport mbb --limit-teams 3
 *   node --env-file=.env.local scripts/ingest-espn-college-sports.mjs --resume
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import https from "node:https";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "data/ingestion/sources/college_sports_2026");

const ESPN_HOST = "site.web.api.espn.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const SOURCE_TYPE = "media_public";
const PRIMARY_SOURCE_ID = "e5b1c011-e5b1-5e5b-9e5b-0000000000cf";

const SPORTS = [
  {
    value: "mbb",
    label: "Men's Basketball",
    path: "basketball/mens-college-basketball",
    rosterSite: "mens-college-basketball",
  },
  {
    value: "wbb",
    label: "Women's Basketball",
    path: "basketball/womens-college-basketball",
    rosterSite: "womens-college-basketball",
  },
  {
    value: "baseball",
    label: "Baseball",
    path: "baseball/college-baseball",
    rosterSite: "college-baseball",
  },
  {
    value: "softball",
    label: "Softball",
    path: "baseball/college-softball",
    rosterSite: "college-softball",
  },
  {
    value: "mhockey",
    label: "Men's Hockey",
    path: "hockey/mens-college-hockey",
    rosterSite: "mens-college-hockey",
  },
  {
    value: "wvball",
    label: "Women's Volleyball",
    path: "volleyball/womens-college-volleyball",
    rosterSite: "womens-college-volleyball",
  },
  {
    value: "msoccer",
    label: "Men's Soccer",
    path: "soccer/usa.ncaa.m.1",
    rosterSite: "mens-college-soccer",
  },
  {
    value: "wsoccer",
    label: "Women's Soccer",
    path: "soccer/usa.ncaa.w.1",
    rosterSite: "womens-college-soccer",
  },
  {
    value: "mlax",
    label: "Men's Lacrosse",
    path: "lacrosse/mens-college-lacrosse",
    rosterSite: "mens-college-lacrosse",
  },
  {
    value: "wlax",
    label: "Women's Lacrosse",
    path: "lacrosse/womens-college-lacrosse",
    rosterSite: "womens-college-lacrosse",
  },
];

function parseArgs(argv) {
  const args = { sports: SPORTS.map((s) => s.value), skipApply: false, limitTeams: null, resume: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--sport") args.sports = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--skip-apply") args.skipApply = true;
    else if (a === "--limit-teams") args.limitTeams = Number(argv[++i]);
    else if (a === "--resume") args.resume = true;
  }
  return args;
}

function slugify(input) {
  return String(input)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function uuidFromKey(key) {
  const h = createHash("sha256").update(key).digest();
  const b = Buffer.from(h.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = b.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function httpsJson(hostname, path, ip) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: ip,
        servername: hostname,
        path,
        method: "GET",
        rejectUnauthorized: false,
        headers: { Host: hostname, "User-Agent": UA, Accept: "application/json" },
      },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode} ${hostname}${path}: ${d.slice(0, 180)}`));
            return;
          }
          try {
            resolve(JSON.parse(d));
          } catch {
            reject(new Error(`JSON ${hostname}${path}: ${d.slice(0, 120)}`));
          }
        });
      },
    );
    req.setTimeout(45000, () => req.destroy(new Error(`timeout ${hostname}${path}`)));
    req.on("error", reject);
    req.end();
  });
}

async function resolveEspnIp() {
  const dnsRes = await httpsJson("dns.google", `/resolve?name=${ESPN_HOST}&type=A`, "8.8.8.8");
  const answer = (dnsRes.Answer || []).find((a) => a.type === 1);
  if (!answer?.data) throw new Error("Could not resolve ESPN A record via dns.google");
  return answer.data;
}

let espnIp = "";

async function espnGet(path) {
  let last;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await httpsJson(ESPN_HOST, path, espnIp);
    } catch (e) {
      last = e;
      const msg = String(e.message || e);
      if (/ENETUNREACH|ECONNRESET|ECONNREFUSED|socket hang up|timeout|ENOTFOUND|EAI_AGAIN|HTTP 429|HTTP 5/.test(msg)) {
        try {
          espnIp = await resolveEspnIp();
        } catch {
          /* keep the previous address */
        }
        await sleep(400 * (attempt + 1));
        continue;
      }
      throw e;
    }
  }
  throw last;
}

function mapClassYear(exp, seasonYear = 2026) {
  if (!exp) return null;
  const abbr = String(exp.abbreviation || "").toUpperCase();
  const display = String(exp.displayValue || abbr).toUpperCase();
  let year = null;
  if (display.includes("RS-FR") || display.includes("REDSHIRT FRESHMAN")) year = seasonYear + 4;
  else if (display.includes("RS-SO")) year = seasonYear + 3;
  else if (display.includes("RS-JR")) year = seasonYear + 2;
  else if (display.includes("RS-SR")) year = seasonYear + 1;
  else {
    const mapping = { FR: seasonYear + 3, SO: seasonYear + 2, JR: seasonYear + 1, SR: seasonYear, GR: seasonYear, RFR: seasonYear + 4, RSO: seasonYear + 3, RJR: seasonYear + 2, RSR: seasonYear + 1 };
    year = mapping[abbr] ?? null;
  }
  if (year != null && (year < 2018 || year > 2035)) return null;
  return year;
}

function normalizePos(ath) {
  const abbr = ath.position?.abbreviation || ath.position?.name || "";
  const p = String(abbr).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return p || "ATH";
}

function heightInches(ath) {
  const n = Number(ath.height);
  if (Number.isFinite(n) && n >= 48 && n <= 96) return Math.round(n);
  const display = String(ath.displayHeight || "");
  const m = display.match(/(\d+)\s*'\s*(\d+)/);
  if (!m) return null;
  const inches = Number(m[1]) * 12 + Number(m[2]);
  return inches >= 48 && inches <= 96 ? inches : null;
}

function weightLbs(ath) {
  const n = Number(ath.weight);
  if (Number.isFinite(n) && n >= 80 && n <= 450) return Math.round(n);
  const m = String(ath.displayWeight || "").match(/(\d+)/);
  if (!m) return null;
  const w = Number(m[1]);
  return w >= 80 && w <= 450 ? w : null;
}

function stateFromBirth(bp) {
  const st = (bp?.state || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(st) ? st : null;
}

function conferenceOf(team) {
  const groups = team.groups;
  const list = Array.isArray(groups) ? groups : groups ? [groups] : [];
  const named = list.find((g) => g && (g.name || g.abbreviation || g.shortName));
  if (!named) return null;
  return String(named.shortName || named.abbreviation || named.name).slice(0, 80);
}

function teamsFromPayload(data) {
  const sports = data.sports || [];
  const leagues = sports[0]?.leagues || data.leagues || [];
  const raw = leagues[0]?.teams || data.teams || [];
  return raw.map((row) => row.team || row).filter((t) => t && t.id);
}

async function fetchTeams(sport) {
  const teams = [];
  const seen = new Set();
  for (let page = 1; page <= 20; page++) {
    const data = await espnGet(`/apis/site/v2/sports/${sport.path}/teams?limit=400&page=${page}`);
    const chunk = teamsFromPayload(data);
    if (!chunk.length) break;
    let added = 0;
    for (const t of chunk) {
      const id = String(t.id);
      if (seen.has(id)) continue;
      seen.add(id);
      added++;
      const name = String(t.location || t.shortDisplayName || t.displayName || `Team ${id}`).trim();
      if (!name || /^tbd$/i.test(name)) continue;
      teams.push({
        id,
        name,
        conference: conferenceOf(t),
        sport: sport.value,
      });
    }
    const pageCount = Number(data.pageCount || leaguesPageCount(data) || 1);
    if (page >= pageCount || added === 0) break;
    await sleep(120);
  }
  return teams;
}

function leaguesPageCount(data) {
  const leagues = data.sports?.[0]?.leagues || data.leagues || [];
  return leagues[0]?.pageCount;
}

function rosterAthletes(roster) {
  const groups = roster.athletes || [];
  const items = [];
  for (const group of groups) {
    if (Array.isArray(group?.items)) items.push(...group.items);
    else if (group?.firstName || group?.displayName || group?.fullName) items.push(group);
  }
  return items;
}

function athleteNames(ath) {
  let fn = String(ath.firstName || "").trim();
  let ln = String(ath.lastName || "").trim();
  const display = String(ath.displayName || ath.fullName || "").trim();
  if ((!fn || !ln) && display) {
    const parts = display.split(/\s+/);
    if (parts.length >= 2) {
      fn = fn || parts[0];
      ln = ln || parts.slice(1).join(" ");
    }
  }
  return { fn, ln };
}

function athleteToPlayer(ath, team, sport, seasonYear) {
  const { fn, ln } = athleteNames(ath);
  if (!fn || !ln || fn.length < 2 || ln.length < 2) return null;
  const espnId = String(ath.id || "");
  if (!espnId) return null;
  const classYear = mapClassYear(ath.experience, seasonYear);
  const pos = normalizePos(ath);
  const bp = ath.birthPlace || {};
  const schoolSlug = `college-${slugify(team.name)}-${sport.value}`.slice(0, 100);
  const schoolId = uuidFromKey(`espn-${sport.value}-team:${team.id}`);
  const playerId = uuidFromKey(`espn-${sport.value}-athlete:${espnId}`);
  const slug = `${slugify(fn)}-${slugify(ln)}-${slugify(team.name)}-${pos.toLowerCase()}-${sport.value}-${espnId}`.slice(0, 120);
  let jersey = ath.jersey;
  jersey = jersey != null && jersey !== "" ? Number.parseInt(String(jersey), 10) : null;
  if (!Number.isFinite(jersey)) jersey = null;

  return {
    id: playerId,
    first_name: fn,
    last_name: ln,
    slug,
    position: pos,
    class_year: classYear,
    eligibility_year: classYear,
    school_id: schoolId,
    school_name: team.name,
    school_slug: schoolSlug,
    state_code: "US",
    source_url: `https://www.espn.com/${sport.rosterSite}/team/roster/_/id/${team.id}`,
    source_type: SOURCE_TYPE,
    source_name: `ESPN ${sport.label} Roster`,
    source_school: team.name,
    source_state: stateFromBirth(bp),
    primary_source_id: PRIMARY_SOURCE_ID,
    season_year: seasonYear,
    competition_level: "college",
    sport: sport.value,
    division: "d1",
    college_name: team.name,
    conference: team.conference,
    transfer_portal_status: "not_in_portal",
    height_inches: heightInches(ath),
    weight_lbs: weightLbs(ath),
    jersey_number: jersey,
    hometown_city: bp.city || null,
    is_synthetic: false,
  };
}

async function rpc(url, key, name, payload) {
  let last;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ payload }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`${name} ${res.status}: ${text.slice(0, 500)}`);
      return text ? JSON.parse(text) : null;
    } catch (e) {
      last = e;
      const msg = String(e.message || e);
      if (attempt < 4 && /fetch failed|ENOTFOUND|EAI_AGAIN|ECONNRESET|ETIMEDOUT|429|500|502|503|504/.test(msg)) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      throw e;
    }
  }
  throw last;
}

async function applyPlayers(url, key, players) {
  const schoolMap = new Map();
  for (const p of players) {
    if (!schoolMap.has(p.school_id)) {
      schoolMap.set(p.school_id, {
        id: p.school_id,
        name: p.school_name,
        slug: p.school_slug,
        city: null,
        state_code: p.state_code || "US",
        nces_id: null,
        website_url: null,
        source_url: p.source_url,
        source_type: p.source_type,
        source_name: p.source_name,
      });
    }
  }
  const schools = [...schoolMap.values()];
  let schoolUpserts = 0;
  for (let i = 0; i < schools.length; i += 100) {
    const n = await rpc(url, key, "bulk_upsert_schools", schools.slice(i, i + 100));
    schoolUpserts += Number(n) || 0;
  }
  let playerUpserts = 0;
  for (let i = 0; i < players.length; i += 80) {
    const n = await rpc(url, key, "bulk_upsert_players", players.slice(i, i + 80));
    playerUpserts += Number(n) || 0;
    process.stdout.write(`\r  upsert ${Math.min(i + 80, players.length)}/${players.length}`);
  }
  if (players.length) process.stdout.write("\n");
  return { schoolUpserts, playerUpserts };
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(OUT, { recursive: true });
  const selected = SPORTS.filter((s) => args.sports.includes(s.value));
  if (!selected.length) throw new Error(`Unknown --sport. Use: ${SPORTS.map((s) => s.value).join(", ")}`);

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log("Resolving ESPN IP…");
  espnIp = await resolveEspnIp();
  console.log("ESPN IP", espnIp);

  const summary = [];
  for (const sport of selected) {
    const sportDir = join(OUT, sport.value);
    const rosterDir = join(sportDir, "rosters");
    mkdirSync(rosterDir, { recursive: true });
    console.log(`\n${sport.label}`);
    let teams = await fetchTeams(sport);
    console.log(`  teams ${teams.length}`);
    if (args.limitTeams) teams = teams.slice(0, args.limitTeams);
    writeFileSync(join(sportDir, "teams.json"), JSON.stringify(teams));

    const errors = [];
    let finished = 0;
    const batches = await mapPool(teams, 4, async (team) => {
      const rosterPath = join(rosterDir, `${team.id}.json`);
      try {
        let roster;
        if (args.resume && existsSync(rosterPath)) {
          roster = JSON.parse(readFileSync(rosterPath, "utf8"));
        } else {
          roster = await espnGet(`/apis/site/v2/sports/${sport.path}/teams/${team.id}/roster`);
          writeFileSync(rosterPath, JSON.stringify(roster));
          await sleep(40);
        }
        const seasonYear = roster.season?.year || roster.season?.displayName || 2026;
        const year = Number(String(seasonYear).slice(0, 4)) || 2026;
        const rows = [];
        for (const ath of rosterAthletes(roster)) {
          const p = athleteToPlayer(ath, team, sport, year);
          if (p) rows.push(p);
        }
        finished += 1;
        if (finished % 25 === 0 || finished === teams.length) {
          process.stdout.write(`\r  rosters ${finished}/${teams.length}   `);
        }
        return rows;
      } catch (e) {
        errors.push({ team: team.name, error: String(e.message || e) });
        console.log(`\n  FAIL ${team.name}: ${e.message || e}`);
        return [];
      }
    });
    const seen = new Set();
    const players = [];
    for (const rows of batches) {
      for (const p of rows || []) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        players.push(p);
      }
    }
    console.log("");
    writeFileSync(join(sportDir, "errors.json"), JSON.stringify(errors, null, 2));
    const sportSummary = { sport: sport.value, teams: teams.length, players: players.length, errors: errors.length };
    summary.push(sportSummary);
    console.log(" ", sportSummary);
    if (args.skipApply) continue;
    if (!url || !key) {
      console.error("Missing Supabase URL/key");
      process.exitCode = 1;
      return;
    }
    const applied = await applyPlayers(url, key, players);
    sportSummary.applied = applied;
    console.log("  applied", applied);
  }
  writeFileSync(join(OUT, "summary.json"), JSON.stringify({ summary, generatedAt: new Date().toISOString() }, null, 2));
  console.log("\nDone", JSON.stringify(summary));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
