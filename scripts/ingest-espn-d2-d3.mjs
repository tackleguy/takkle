#!/usr/bin/env node
/**
 * Fetch NCAA DII / DIII football rosters from ESPN public APIs and upsert.
 *
 * ESPN groups: 57 = Division II, 58 = Division III.
 * Bypasses DNSFilter by resolving site.web.api.espn.com via dns.google (8.8.8.8)
 * and connecting with SNI + rejectUnauthorized:false.
 *
 * Usage:
 *   node --env-file=.env.local scripts/ingest-espn-d2-d3.mjs
 *   node --env-file=.env.local scripts/ingest-espn-d2-d3.mjs --division d2
 *   node --env-file=.env.local scripts/ingest-espn-d2-d3.mjs --skip-apply
 *   node --env-file=.env.local scripts/ingest-espn-d2-d3.mjs --limit-teams 5
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import https from "node:https";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "data/ingestion/sources/cfb_d2_d3_2026");

const ESPN_HOST = "site.web.api.espn.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const SOURCE_NAME = "ESPN College Football Roster";
const SOURCE_TYPE = "media_public";
const PRIMARY_SOURCE_ID = "e5b1c011-e5b1-5e5b-9e5b-0000000000cf";

const DIVISIONS = {
  d2: { group: 57, label: "d2" },
  d3: { group: 58, label: "d3" },
};

/** ESPN conference id → short label used in rankings filters. */
const CONF_SHORT = {
  // DII
  104: "CIAA",
  187: "Conference Carolinas",
  107: "GLIAC",
  146: "GAC",
  108: "GLVC",
  165: "G-MAC",
  110: "GSC",
  112: "DII Independents",
  116: "Lone Star",
  118: "MIAA",
  144: "MEC",
  127: "NE10",
  129: "NSIC",
  133: "PSAC",
  135: "RMAC",
  136: "SIAC",
  139: "SAC",
  // DIII
  114: "ARC",
  100: "ASC",
  102: "CCIW",
  103: "Centennial",
  123: "CNE",
  106: "Empire 8",
  111: "Heartland",
  113: "DIII Independents",
  178: "Landmark",
  115: "Liberty League",
  160: "MSCAC",
  117: "MIAA D3",
  119: "MAC D3",
  120: "Midwest",
  121: "MIAC",
  122: "NESCAC",
  166: "NEWMAC",
  124: "NJAC",
  126: "NCAC",
  128: "NACC",
  130: "NWC",
  131: "OAC",
  132: "ODAC",
  134: "PAC",
  138: "SCIAC",
  147: "SAA",
  148: "SCAC",
  142: "UMAC",
  143: "USA South",
  145: "WIAC",
};

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
  const args = {
    divisions: ["d2", "d3"],
    skipApply: false,
    limitTeams: null,
    resume: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--division") {
      const d = argv[++i];
      args.divisions = d === "both" ? ["d2", "d3"] : [d];
    } else if (a === "--skip-apply") args.skipApply = true;
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
        headers: {
          Host: hostname,
          "User-Agent": UA,
          Accept: "application/json",
        },
      },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode} ${hostname}${path}: ${d.slice(0, 160)}`));
            return;
          }
          try {
            resolve(JSON.parse(d));
          } catch (e) {
            reject(new Error(`JSON ${hostname}${path}: ${d.slice(0, 120)}`));
          }
        });
      },
    );
    req.setTimeout(45000, () => {
      req.destroy(new Error(`timeout ${hostname}${path}`));
    });
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

function mapClassYear(exp, seasonYear = 2026) {
  if (!exp) return null;
  const abbr = String(exp.abbreviation || "").toUpperCase();
  const display = String(exp.displayValue || abbr).toUpperCase();
  if (display.includes("RS-FR") || display.includes("REDSHIRT FRESHMAN")) return seasonYear + 4;
  if (display.includes("RS-SO")) return seasonYear + 3;
  if (display.includes("RS-JR")) return seasonYear + 2;
  if (display.includes("RS-SR")) return seasonYear + 1;
  const mapping = {
    FR: seasonYear + 3,
    SO: seasonYear + 2,
    JR: seasonYear + 1,
    SR: seasonYear,
    GR: seasonYear,
  };
  return mapping[abbr] ?? null;
}

function normalizePos(abbr) {
  if (!abbr) return "ATH";
  const p = String(abbr).toUpperCase().trim();
  return POS_MAP[p] || (["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P", "ATH"].includes(p) ? p : "ATH");
}

function stateFromBirth(bp) {
  const st = (bp?.state || "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(st)) return st;
  return null;
}

async function fetchDivisionTeams(ip, divisionKey) {
  const { group, label } = DIVISIONS[divisionKey];
  const standings = await httpsJson(
    ESPN_HOST,
    `/apis/v2/sports/football/college-football/standings?group=${group}`,
    ip,
  );
  const teams = [];
  for (const conf of standings.children || []) {
    const confId = Number(conf.id);
    const conference = CONF_SHORT[confId] || conf.abbreviation || conf.name || `Conf ${confId}`;
    for (const entry of conf.standings?.entries || []) {
      const t = entry.team || {};
      const tid = String(t.id || "");
      if (!tid) continue;
      const location = t.location || t.displayName || t.name || `Team ${tid}`;
      const displayName = t.displayName || location;
      teams.push({
        id: tid,
        name: location,
        displayName,
        conference,
        conferenceId: confId,
        division: label,
        state_code: "US",
      });
    }
  }
  return teams;
}

function athleteToPlayer(ath, team, seasonYear) {
  const fn = String(ath.firstName || "").trim();
  const ln = String(ath.lastName || "").trim();
  if (!fn || !ln || fn.length < 2 || ln.length < 2) return null;
  const espnId = String(ath.id || "");
  if (!espnId) return null;

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
    source_state: stateFromBirth(bp),
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
  let schoolUpserts = 0;
  const SB = 100;
  for (let i = 0; i < schools.length; i += SB) {
    const n = await rpc(url, key, "bulk_upsert_schools", schools.slice(i, i + SB));
    schoolUpserts += Number(n) || 0;
    process.stdout.write(`\rSchools ${Math.min(i + SB, schools.length)}/${schools.length}`);
  }
  console.log(`\nSchool upserts: ${schoolUpserts}`);

  let playerUpserts = 0;
  const PB = 80;
  for (let i = 0; i < players.length; i += PB) {
    const n = await rpc(url, key, "bulk_upsert_players", players.slice(i, i + PB));
    playerUpserts += Number(n) || 0;
    process.stdout.write(`\rPlayers ${Math.min(i + PB, players.length)}/${players.length} (cum ${playerUpserts})`);
  }
  console.log(`\nPlayer upserts: ${playerUpserts}`);
  return { schoolUpserts, playerUpserts };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(OUT, { recursive: true });
  mkdirSync(join(OUT, "rosters"), { recursive: true });
  mkdirSync(join(OUT, "rpc_batches"), { recursive: true });

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log("Resolving ESPN IP…");
  const ip = await resolveEspnIp();
  console.log("ESPN IP", ip);

  let teams = [];
  for (const div of args.divisions) {
    const chunk = await fetchDivisionTeams(ip, div);
    console.log(`${div}: ${chunk.length} teams`);
    teams.push(...chunk);
    await sleep(150);
  }

  if (args.limitTeams) teams = teams.slice(0, args.limitTeams);
  writeFileSync(join(OUT, "teams.json"), JSON.stringify(teams, null, 2));

  const players = [];
  const errors = [];
  const seen = new Set();

  for (let i = 0; i < teams.length; i++) {
    const team = teams[i];
    const rosterPath = join(OUT, "rosters", `${team.id}.json`);
    try {
      let roster;
      if (args.resume && existsSync(rosterPath)) {
        roster = JSON.parse(readFileSync(rosterPath, "utf8"));
      } else {
        roster = await httpsJson(
          ESPN_HOST,
          `/apis/site/v2/sports/football/college-football/teams/${team.id}/roster`,
          ip,
        );
        writeFileSync(rosterPath, JSON.stringify(roster));
        await sleep(100);
      }
      const seasonYear = roster.season?.year || 2026;
      const items = [];
      for (const group of roster.athletes || []) {
        for (const ath of group.items || []) items.push(ath);
      }
      let n = 0;
      for (const ath of items) {
        const p = athleteToPlayer(ath, team, seasonYear);
        if (!p) continue;
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        players.push(p);
        n++;
      }
      process.stdout.write(
        `\r[${i + 1}/${teams.length}] ${team.division} ${team.name}: ${n} (total ${players.length})   `,
      );
    } catch (e) {
      errors.push({ team, error: String(e.message || e) });
      console.log(`\nFAIL ${team.name}: ${e.message || e}`);
    }
  }
  console.log("");

  writeFileSync(join(OUT, "players.json"), JSON.stringify(players));
  writeFileSync(join(OUT, "errors.json"), JSON.stringify(errors, null, 2));

  const byDiv = {};
  const byConf = {};
  for (const p of players) {
    byDiv[p.division] = (byDiv[p.division] || 0) + 1;
    byConf[`${p.division}:${p.conference}`] = (byConf[`${p.division}:${p.conference}`] || 0) + 1;
  }
  const summary = {
    teams: teams.length,
    players: players.length,
    errors: errors.length,
    byDiv,
    byConf,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
  console.log("Summary", JSON.stringify(summary, null, 2));

  // Write RPC batches for re-apply
  const PB = 80;
  for (let i = 0; i < players.length; i += PB) {
    const batch = players.slice(i, i + PB);
    const idx = String(Math.floor(i / PB)).padStart(4, "0");
    writeFileSync(join(OUT, "rpc_batches", `batch_${idx}.json`), JSON.stringify(batch));
  }

  if (args.skipApply) {
    console.log("Skip apply (--skip-apply)");
    return;
  }
  if (!url || !key) {
    console.error("Missing Supabase URL/key — wrote local JSON only");
    process.exit(1);
  }
  console.log("Applying to Supabase…");
  await applyPlayers(url, key, players);
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
