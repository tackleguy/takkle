#!/usr/bin/env node
/**
 * Enrich DII/DIII inventory from ESPN sports.core season athlete indexes.
 * Picks up athletes beyond the site.web roster ~100 cap and teams with empty
 * site.web rosters that still have core season data.
 *
 * Usage:
 *   node --env-file=.env.local scripts/enrich-espn-d2-d3-core.mjs
 *   node --env-file=.env.local scripts/enrich-espn-d2-d3-core.mjs --skip-apply
 *   node --env-file=.env.local scripts/enrich-espn-d2-d3-core.mjs --limit-teams 20
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import https from "node:https";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BASE = join(ROOT, "data/ingestion/sources/cfb_d2_d3_2026");
const OUT = join(BASE, "core_enrich");

const CORE_HOST = "sports.core.api.espn.com";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
const SOURCE_NAME = "ESPN College Football Roster";
const SOURCE_TYPE = "media_public";
const PRIMARY_SOURCE_ID = "e5b1c011-e5b1-5e5b-9e5b-0000000000cf";
const CONCURRENCY = 12;
const PAGE_SIZE = 200;

const POS_MAP = {
  QB: "QB",
  RB: "RB",
  FB: "RB",
  WR: "WR",
  TE: "TE",
  OT: "OL",
  OG: "OL",
  OC: "OL",
  C: "OL",
  G: "OL",
  T: "OL",
  OL: "OL",
  DE: "DL",
  DT: "DL",
  NT: "DL",
  DL: "DL",
  EDGE: "DL",
  ILB: "LB",
  OLB: "LB",
  MLB: "LB",
  LB: "LB",
  CB: "DB",
  S: "DB",
  FS: "DB",
  SS: "DB",
  SAF: "DB",
  DB: "DB",
  K: "K",
  P: "P",
  PK: "K",
  LS: "ATH",
  ATH: "ATH",
};

function parseArgs(argv) {
  const args = { skipApply: false, limitTeams: null, seasons: [2026, 2025] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--skip-apply") args.skipApply = true;
    else if (a === "--limit-teams") args.limitTeams = Number(argv[++i]);
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
            reject(new Error(`HTTP ${res.statusCode} ${hostname}${path}: ${d.slice(0, 120)}`));
            return;
          }
          try {
            resolve(JSON.parse(d));
          } catch {
            reject(new Error(`JSON ${hostname}${path}`));
          }
        });
      },
    );
    req.setTimeout(45000, () => req.destroy(new Error(`timeout ${path}`)));
    req.on("error", reject);
    req.end();
  });
}

async function resolveIp(host) {
  const dns = await httpsJson("dns.google", `/resolve?name=${host}&type=A`, "8.8.8.8");
  const a = (dns.Answer || []).find((x) => x.type === 1);
  if (!a?.data) throw new Error(`No A record for ${host}`);
  return a.data;
}

function mapClassYear(exp, seasonYear) {
  if (!exp) return null;
  const abbr = String(exp.abbreviation || "").toUpperCase();
  const display = String(exp.displayValue || abbr).toUpperCase();
  if (display.includes("RS-FR") || display.includes("REDSHIRT FRESHMAN")) return seasonYear + 4;
  if (display.includes("RS-SO")) return seasonYear + 3;
  if (display.includes("RS-JR")) return seasonYear + 2;
  if (display.includes("RS-SR")) return seasonYear + 1;
  return (
    {
      FR: seasonYear + 3,
      SO: seasonYear + 2,
      JR: seasonYear + 1,
      SR: seasonYear,
      GR: seasonYear,
    }[abbr] ?? null
  );
}

function normalizePos(abbr) {
  if (!abbr) return "ATH";
  const p = String(abbr).toUpperCase().trim();
  return POS_MAP[p] || (["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P", "ATH"].includes(p) ? p : "ATH");
}

async function mapPool(items, concurrency, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return out;
}

async function listTeamAthleteRefs(ip, teamId, season) {
  const refs = [];
  let page = 1;
  let pageCount = 1;
  while (page <= pageCount) {
    const path = `/v2/sports/football/leagues/college-football/seasons/${season}/teams/${teamId}/athletes?limit=${PAGE_SIZE}&active=true&page=${page}`;
    const data = await httpsJson(CORE_HOST, path, ip);
    pageCount = data.pageCount || 1;
    for (const it of data.items || []) {
      if (it.$ref) refs.push(it.$ref);
    }
    if (!data.items?.length) break;
    page++;
    await sleep(40);
  }
  return refs;
}

async function fetchAthlete(ip, ref) {
  const url = new URL(String(ref).replace(/^http:/, "https:"));
  return httpsJson(url.hostname, url.pathname + url.search, ip);
}

function athleteToPlayer(ath, team, seasonYear) {
  const fn = String(ath.firstName || "").trim();
  const ln = String(ath.lastName || "").trim();
  if (!fn || !ln || fn.length < 2 || ln.length < 2) return null;
  const espnId = String(ath.id || "");
  if (!espnId) return null;
  if (ath.active === false) return null;

  const classYear = mapClassYear(ath.experience, seasonYear);
  const pos = normalizePos(ath.position?.abbreviation);
  const bp = ath.birthPlace || {};
  const schoolSlug = `college-${slugify(team.name)}-${team.division}`;
  const schoolId = uuidFromKey(`espn-cfb-team:${team.id}`);
  const playerId = uuidFromKey(`espn-cfb-athlete:${espnId}`);
  const slug =
    `${slugify(fn)}-${slugify(ln)}-${slugify(team.name)}-${pos.toLowerCase()}-${team.division}-${espnId}`.slice(
      0,
      120,
    );

  let jersey = ath.jersey;
  try {
    jersey = jersey != null && jersey !== "" ? Number.parseInt(String(jersey), 10) : null;
    if (Number.isNaN(jersey)) jersey = null;
  } catch {
    jersey = null;
  }

  const ht = ath.height != null ? Math.round(Number(ath.height)) : null;
  const wt = ath.weight != null ? Math.round(Number(ath.weight)) : null;
  const st = String(bp.state || "")
    .trim()
    .toUpperCase();

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
    state_code: team.state_code || "US",
    source_url: `https://www.espn.com/college-football/team/roster/_/id/${team.id}`,
    source_type: SOURCE_TYPE,
    source_name: SOURCE_NAME,
    source_school: team.name,
    source_state: /^[A-Z]{2}$/.test(st) ? st : null,
    primary_source_id: PRIMARY_SOURCE_ID,
    season_year: seasonYear,
    competition_level: "college",
    division: team.division,
    college_name: team.name,
    conference: team.conference,
    transfer_portal_status: "not_in_portal",
    height_inches: ht && ht > 0 ? ht : null,
    weight_lbs: wt && wt > 0 ? wt : null,
    jersey_number: jersey,
    hometown_city: bp.city || null,
    is_synthetic: false,
  };
}

async function rpc(url, key, name, payload) {
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
  for (let i = 0; i < schools.length; i += 100) {
    await rpc(url, key, "bulk_upsert_schools", schools.slice(i, i + 100));
    process.stdout.write(`\rSchools ${Math.min(i + 100, schools.length)}/${schools.length}`);
  }
  console.log("");
  let upserts = 0;
  for (let i = 0; i < players.length; i += 80) {
    const n = await rpc(url, key, "bulk_upsert_players", players.slice(i, i + 80));
    upserts += Number(n) || 0;
    process.stdout.write(`\rPlayers ${Math.min(i + 80, players.length)}/${players.length} (cum ${upserts})`);
  }
  console.log(`\nUpserts: ${upserts}`);
  return upserts;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(OUT, { recursive: true });

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let teams = JSON.parse(readFileSync(join(BASE, "teams.json"), "utf8"));
  if (args.limitTeams) teams = teams.slice(0, args.limitTeams);

  const known = new Set();
  if (existsSync(join(BASE, "players.json"))) {
    for (const p of JSON.parse(readFileSync(join(BASE, "players.json"), "utf8"))) known.add(p.id);
  }
  if (existsSync(join(OUT, "players.json"))) {
    for (const p of JSON.parse(readFileSync(join(OUT, "players.json"), "utf8"))) known.add(p.id);
  }
  console.log("Known athlete ids", known.size);

  console.log("Resolving ESPN core IP…");
  const ip = await resolveIp(CORE_HOST);
  console.log("core IP", ip);

  const newPlayers = [];
  const teamStats = [];
  const errors = [];

  for (let ti = 0; ti < teams.length; ti++) {
    const team = teams[ti];
    try {
      let seasonUsed = null;
      let refs = [];
      for (const season of args.seasons) {
        refs = await listTeamAthleteRefs(ip, team.id, season);
        if (refs.length) {
          seasonUsed = season;
          break;
        }
      }
      if (!refs.length) {
        teamStats.push({ team: team.name, division: team.division, refs: 0, new: 0 });
        process.stdout.write(`\r[${ti + 1}/${teams.length}] ${team.name}: 0 refs          `);
        continue;
      }

      const athletes = await mapPool(refs, CONCURRENCY, async (ref) => {
        try {
          return await fetchAthlete(ip, ref);
        } catch {
          return null;
        }
      });

      let added = 0;
      for (const ath of athletes) {
        if (!ath) continue;
        const p = athleteToPlayer(ath, team, seasonUsed);
        if (!p) continue;
        if (known.has(p.id)) continue;
        known.add(p.id);
        newPlayers.push(p);
        added++;
      }
      teamStats.push({
        team: team.name,
        division: team.division,
        season: seasonUsed,
        refs: refs.length,
        new: added,
      });
      process.stdout.write(
        `\r[${ti + 1}/${teams.length}] ${team.name}: +${added}/${refs.length} (total new ${newPlayers.length})   `,
      );
      await sleep(80);
    } catch (e) {
      errors.push({ team, error: String(e.message || e) });
      console.log(`\nFAIL ${team.name}: ${e.message || e}`);
    }
  }
  console.log("");

  writeFileSync(join(OUT, "players.json"), JSON.stringify(newPlayers));
  writeFileSync(join(OUT, "team_stats.json"), JSON.stringify(teamStats, null, 2));
  writeFileSync(join(OUT, "errors.json"), JSON.stringify(errors, null, 2));

  const byDiv = {};
  for (const p of newPlayers) byDiv[p.division] = (byDiv[p.division] || 0) + 1;
  const summary = {
    teams: teams.length,
    newPlayers: newPlayers.length,
    byDiv,
    errors: errors.length,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
  console.log("Summary", JSON.stringify(summary, null, 2));

  const top = [...teamStats].sort((a, b) => b.new - a.new).slice(0, 15);
  console.log("Top gains", top);

  if (args.skipApply) return;
  if (!newPlayers.length) {
    console.log("Nothing new to apply");
    return;
  }
  if (!url || !key) {
    console.error("Missing Supabase credentials");
    process.exit(1);
  }
  console.log("Applying…");
  await applyPlayers(url, key, newPlayers);
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
