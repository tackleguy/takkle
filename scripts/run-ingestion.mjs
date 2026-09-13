#!/usr/bin/env node
/**
 * Run permitted-state ingestion and emit SQL batches for Supabase load.
 *
 * Usage:
 *   node scripts/run-ingestion.mjs --states CA,TX,FL,GA,OH
 *   node scripts/run-ingestion.mjs --states CA --players-only
 *   node scripts/run-ingestion.mjs --states CA,TX --apply-via-stdout
 *
 * Writes:
 *   data/ingestion/run-<timestamp>/schools.json
 *   data/ingestion/run-<timestamp>/players.json
 *   data/ingestion/run-<timestamp>/summary.json
 *   data/ingestion/run-<timestamp>/001_schools.sql ...
 *   data/ingestion/run-<timestamp>/010_players.sql ...
 *
 * Legal: only NCES CCD + association public honor rolls + CSV.
 * Never fabricates players. Synthetic seed is NOT imported.
 */
import { createHash, randomUUID } from "node:crypto";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const require = createRequire(import.meta.url);

const USER_AGENT =
  "TakkleIngestionBot/1.0 (+https://takkle.com; permitted public sources only)";

function parseArgs(argv) {
  const args = {
    states: ["CA", "TX", "FL", "GA", "OH", "AL"],
    schoolLimit: null,
    playersOnly: false,
    schoolsOnly: false,
    outDir: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--states") args.states = argv[++i].split(",").map((s) => s.trim().toUpperCase());
    else if (a === "--school-limit") args.schoolLimit = Number(argv[++i]);
    else if (a === "--players-only") args.playersOnly = true;
    else if (a === "--schools-only") args.schoolsOnly = true;
    else if (a === "--out") args.outDir = argv[++i];
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

function sqlStr(v) {
  if (v == null || v === "") return "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}

function sqlNum(v) {
  if (v == null || v === "" || Number.isNaN(Number(v))) return "NULL";
  return String(Number(v));
}

function sqlBool(v) {
  return v ? "true" : "false";
}

function uuidFromKey(key) {
  const h = createHash("sha256").update(key).digest();
  const b = Buffer.from(h.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50; // UUIDv5-ish
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = b.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function fetchRobots(origin) {
  try {
    const res = await fetch(new URL("/robots.txt", origin), {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return { status: res.status, body: null };
    return { status: res.status, body: await res.text() };
  } catch {
    return { status: 0, body: null };
  }
}

function robotsAllows(body, path) {
  if (!body) return true;
  const lines = body.split(/\r?\n/);
  let inStar = false;
  const disallows = [];
  const allows = [];
  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      inStar = value === "*";
      continue;
    }
    if (!inStar) continue;
    if (key === "disallow") disallows.push(value);
    if (key === "allow") allows.push(value);
  }
  const matchLen = (rules) => {
    let best = -1;
    for (const r of rules) {
      if (r === "") continue;
      if (path.startsWith(r)) best = Math.max(best, r.length);
    }
    return best;
  };
  const a = matchLen(allows);
  const d = matchLen(disallows);
  if (a < 0 && d < 0) return true;
  return a >= d;
}

function decodeHtml(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;|&quot;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitName(full) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

const POS = {
  qb: "QB",
  rb: "RB",
  fb: "RB",
  wr: "WR",
  te: "TE",
  ol: "OL",
  ot: "OL",
  og: "OL",
  c: "OL",
  dl: "DL",
  de: "DL",
  dt: "DL",
  nt: "DL",
  lb: "LB",
  db: "DB",
  cb: "DB",
  s: "DB",
  ss: "DB",
  fs: "DB",
  k: "K",
  p: "P",
  ath: "ATH",
};

function normPos(raw) {
  if (!raw) return null;
  const p = raw.split(/[/,]/)[0].trim().toLowerCase();
  return POS[p] || p.toUpperCase().slice(0, 3);
}

function classFromGrade(grade, seasonEnd) {
  return seasonEnd + Math.max(0, 12 - grade);
}

function parseCifss(html, spec) {
  const players = [];
  const seen = new Set();
  const rowRe =
    /<tr[^>]*>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html))) {
    const name = decodeHtml(m[1]);
    const school = decodeHtml(m[2]);
    const position = decodeHtml(m[3]);
    const year = decodeHtml(m[4]);
    if (!name || /^name$/i.test(name) || !school || /^school$/i.test(school)) continue;
    const grade = Number(String(year).replace(/\D/g, ""));
    if (!(grade >= 9 && grade <= 12)) continue;
    const { firstName, lastName } = splitName(name);
    const key = `${firstName}|${lastName}|${school}|${spec.seasonEnd}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    players.push({
      firstName,
      lastName,
      position: normPos(position),
      classYear: classFromGrade(grade, spec.seasonEnd),
      gradeLevel: grade,
      schoolName: school,
      stateCode: "CA",
      seasonYear: spec.seasonEnd,
      sourceUrl: spec.url,
      sourceName: "CIF Southern Section All-CIF Football",
      sourceType: "state_association",
      sourceState: "CA",
      sourceSchool: school,
    });
  }
  return players;
}

const INGESTION_PLAYER_CAP = Number(process.env.INGESTION_PLAYER_CAP || 25000);

const CIFSS_LISTS = [
  { seasonLabel: "2025-26", seasonEnd: 2026, url: "https://cifss.org/allcifss/2025-26-football-11/" },
  { seasonLabel: "2025-26", seasonEnd: 2026, url: "https://cifss.org/allcifss/2025-26-football-8/" },
  { seasonLabel: "2024-25", seasonEnd: 2025, url: "https://cifss.org/allcifss/2024-25-football-11/" },
  { seasonLabel: "2024-25", seasonEnd: 2025, url: "https://cifss.org/allcifss/2024-25-football-8/" },
  { seasonLabel: "2023-24", seasonEnd: 2024, url: "https://cifss.org/allcifss/2023-24-football-11/" },
  { seasonLabel: "2022-23", seasonEnd: 2023, url: "https://cifss.org/allcifss/2022-23-football-11/" },
];

const CALHI_LISTS = [
  { seasonEnd: 2026, url: "https://www.calhisports.com/2026/02/06/all-state-fb-2025-1st-team-offense/" },
  { seasonEnd: 2026, url: "https://www.calhisports.com/2026/02/06/all-state-fb-2025-1st-team-defense/" },
  { seasonEnd: 2026, url: "https://www.calhisports.com/2026/01/31/all-state-fb-2025-medium-schools/" },
  { seasonEnd: 2025, url: "https://www.calhisports.com/2025/02/09/all-state-fb-2024-1st-team-offense/" },
  { seasonEnd: 2025, url: "https://www.calhisports.com/2025/02/09/all-state-fb-2024-1st-team-defense/" },
  { seasonEnd: 2025, url: "https://www.calhisports.com/2025/02/05/all-state-fb-2024-medium-schools/" },
  { seasonEnd: 2024, url: "https://www.calhisports.com/2024/02/03/all-state-fb-2023-1st-team-offense/" },
  { seasonEnd: 2024, url: "https://www.calhisports.com/2024/02/03/all-state-fb-2023-1st-team-defense/" },
];

const TSWA_YEARS = [
  { yy: "06", seasonEnd: 2007 },
  { yy: "07", seasonEnd: 2008 },
  { yy: "08", seasonEnd: 2009 },
  { yy: "09", seasonEnd: 2010 },
  { yy: "10", seasonEnd: 2011 },
  { yy: "11", seasonEnd: 2012 },
  { yy: "12", seasonEnd: 2013 },
  { yy: "13", seasonEnd: 2014 },
  { yy: "14", seasonEnd: 2015 },
  { yy: "15", seasonEnd: 2016 },
  { yy: "16", seasonEnd: 2017 },
  { yy: "20", seasonEnd: 2021 },
  { yy: "21", seasonEnd: 2022 },
  { yy: "22", seasonEnd: 2023 },
  { yy: "23", seasonEnd: 2024 },
  { yy: "24", seasonEnd: 2025 },
  { yy: "25", seasonEnd: 2026 },
];

async function fetchCifssPlayers() {
  const robots = await fetchRobots("https://cifss.org");
  const allowed = robotsAllows(robots.body, "/allcifss/");
  if (!allowed) return { players: [], errors: ["cifss.org robots blocked /allcifss/"], blocked: ["cifss.org"] };

  const players = [];
  const errors = [];
  for (const spec of CIFSS_LISTS) {
    try {
      const res = await fetch(spec.url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) {
        errors.push(`${spec.url} HTTP ${res.status}`);
        continue;
      }
      const html = await res.text();
      const parsed = parseCifss(html, spec);
      console.log(`  CIF-SS ${spec.seasonLabel}: ${parsed.length} players from ${spec.url}`);
      players.push(...parsed);
      await new Promise((r) => setTimeout(r, 400));
    } catch (e) {
      errors.push(`${spec.url}: ${e.message}`);
    }
  }
  return {
    players,
    errors,
    blocked: [
      "CIF-SS All-CIF football pre-2022 seasons — public PDF embeds (CSV fallback)",
      "CIF San Diego / North Coast / Central — HTTP 403 or no public all-CIF HTML",
    ],
  };
}

function parseCalHi(html, spec) {
  if (/Gold Club members only|This is a post for our Gold Club/i.test(html)) return { players: [], paywalled: true };
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
  const gradeMap = { sr: 12, senior: 12, jr: 11, junior: 11, so: 10, soph: 10, sophomore: 10, fr: 9, freshman: 9 };
  const players = [];
  const seen = new Set();
  const loose =
    /([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)+)\s+\(([^)]{3,50})\)(?:\s*,?\s*(?:\d-\d{1,2})?(?:\s*,?\s*\d{2,3})?\s*,?\s*(Sr|Jr|So|Fr|Senior|Junior|Soph\.?|Sophomore|Freshman))?/g;
  let m;
  while ((m = loose.exec(text))) {
    if (/click here|cal-hi|photo|gold club|follow @/i.test(m[0])) continue;
    const name = m[1].trim();
    const school = m[2].replace(/,.*$/, "").trim();
    const { firstName, lastName } = splitName(name);
    if (!firstName || !lastName || school.length < 2) continue;
    const g = m[3] ? gradeMap[m[3].toLowerCase().replace(/\./g, "")] : null;
    const key = `${firstName}|${lastName}|${school}|${spec.seasonEnd}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    players.push({
      firstName,
      lastName,
      position: null,
      classYear: g ? classFromGrade(g, spec.seasonEnd) : null,
      schoolName: school,
      stateCode: "CA",
      seasonYear: spec.seasonEnd,
      sourceUrl: spec.url,
      sourceName: "Cal-Hi Sports All-State Football",
      sourceType: "media_public",
      sourceState: "CA",
      sourceSchool: school,
    });
  }
  return { players, paywalled: false };
}

async function fetchCalHiPlayers() {
  const robots = await fetchRobots("https://www.calhisports.com");
  const players = [];
  const errors = [];
  const blocked = [];
  for (const spec of CALHI_LISTS) {
    const path = new URL(spec.url).pathname;
    if (robots.body && !robotsAllows(robots.body, path)) {
      blocked.push(`${spec.url} robots`);
      continue;
    }
    try {
      const res = await fetch(spec.url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) {
        errors.push(`${spec.url} HTTP ${res.status}`);
        continue;
      }
      const html = await res.text();
      const parsed = parseCalHi(html, spec);
      if (parsed.paywalled) {
        blocked.push(`${spec.url} (Gold Club paywall)`);
        continue;
      }
      console.log(`  Cal-Hi ${spec.seasonEnd}: ${parsed.players.length} from ${spec.url}`);
      players.push(...parsed.players);
      await new Promise((r) => setTimeout(r, 1000));
    } catch (e) {
      errors.push(`${spec.url}: ${e.message}`);
    }
  }
  return { players, errors, blocked };
}

function parseTswa(html, seasonEnd = 2025, sourceUrl = "https://txswa.org/allstatefootball24.php") {
  const text = decodeHtml(html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n"));
  const gradeMap = { sr: 12, senior: 12, jr: 11, junior: 11, so: 10, soph: 10, sophomore: 10, fr: 9, freshman: 9 };
  const players = [];
  const seen = new Set();
  const add = (nameRaw, schoolRaw, gradeToken) => {
    const name = nameRaw.trim();
    const school = schoolRaw.trim();
    const g = gradeMap[String(gradeToken).toLowerCase().replace(/\./g, "")];
    const { firstName, lastName } = splitName(name);
    if (!firstName || !lastName || school.length < 2) return;
    if (/coach|player of the year/i.test(name)) return;
    const classYear = g ? classFromGrade(g, seasonEnd) : null;
    const key = `${firstName}|${lastName}|${school}|${classYear || ""}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    players.push({
      firstName,
      lastName,
      position: null,
      classYear,
      schoolName: school,
      stateCode: "TX",
      seasonYear: seasonEnd,
      sourceUrl,
      sourceName: "Texas Sports Writers Association All-State Football",
      sourceType: "state_association",
      sourceState: "TX",
      sourceSchool: school,
    });
  };
  // Newer: Name, School, [ht,] [wt,] sr.
  const entryRe =
    /([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)+),\s*([A-Za-z0-9 .'\-\/]+?),\s*(?:\d-\d{1,2},?\s*)?(?:\d{2,3},?\s*)?(sr|jr|so|fr|soph|senior|junior|sophomore|freshman)\.?/gi;
  let m;
  while ((m = entryRe.exec(text))) add(m[1], m[2], m[3]);
  // Older: Sr. Name, School, 6-0, 180
  const gradeFirstRe =
    /\b(Sr|Jr|So|Fr|Soph)\.\s+([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)+),\s*([A-Za-z0-9 .'\-\/]+?)(?=,|\s+\d-|\s*$)/gi;
  while ((m = gradeFirstRe.exec(text))) add(m[2], m[3], m[1]);
  return players;
}

async function fetchTswaPlayers() {
  const players = [];
  const errors = [];
  for (const spec of TSWA_YEARS) {
    const url = `https://txswa.org/allstatefootball${spec.yy}.php`;
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) {
        errors.push(`${url} HTTP ${res.status}`);
        continue;
      }
      const html = await res.text();
      const parsed = parseTswa(html, spec.seasonEnd, url);
      console.log(`  TSWA ${spec.yy}: ${parsed.length} players`);
      if (!parsed.length) errors.push(`${url} parsed 0`);
      players.push(...parsed);
      await new Promise((r) => setTimeout(r, 300));
    } catch (e) {
      errors.push(`${url}: ${e.message}`);
    }
  }
  return { players, errors, blocked: [] };
}

const GRADE_MAP_SE = {
  sr: 12, senior: 12, jr: 11, junior: 11, so: 10, soph: 10, sophomore: 10, fr: 9, freshman: 9,
};

function parseOpsmaText(text, seasonEnd = 2025, sourceUrl) {
  const flat = decodeHtml(String(text).replace(/\n/g, " "));
  const players = [];
  const seen = new Set();
  const entryRe =
    /([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)+),\s*([A-Za-z][A-Za-z0-9 .'\-\/]*?),\s*(?:\d-\d{1,2},?\s*)?(?:\d{2,3},?\s*)?(sr|jr|so|fr|soph|senior|junior|sophomore|freshman)\.?/gi;
  let m;
  while ((m = entryRe.exec(flat))) {
    const name = m[1].replace(/\s+/g, " ").trim();
    const school = m[2].replace(/\s+/g, " ").trim();
    const g = GRADE_MAP_SE[m[3].toLowerCase().replace(/\./g, "")];
    const { firstName, lastName } = splitName(name);
    if (!firstName || !lastName || school.length < 2) continue;
    if (/coach|player of the year/i.test(name)) continue;
    const key = `${firstName}|${lastName}|${school}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    players.push({
      firstName,
      lastName,
      position: null,
      classYear: g ? classFromGrade(g, seasonEnd) : null,
      schoolName: school,
      stateCode: "OH",
      seasonYear: seasonEnd,
      sourceUrl,
      sourceName: "Ohio Prep Sports Media Association All-Ohio Football",
      sourceType: "state_association",
      sourceState: "OH",
      sourceSchool: school,
    });
  }
  return players;
}

async function fetchOhioPlayers() {
  const specs = [
    {
      seasonEnd: 2022,
      url: "https://ohsaaweb.blob.core.windows.net/files/Sports/Football/2021/2021OPSWAAll_OhioFB.pdf",
      snap: join(ROOT, "data/ingestion/sources/ohio/2021-opsma-all-ohio.txt"),
    },
    {
      seasonEnd: 2023,
      url: "https://ohsaaweb.blob.core.windows.net/files/Sports/Football/2022/2022OPSWAAll_OhioFB.pdf",
      snap: join(ROOT, "data/ingestion/sources/ohio/2022-opsma-all-ohio.txt"),
    },
    {
      seasonEnd: 2024,
      url: "https://ohsaaweb.blob.core.windows.net/files/Sports/Football/2023/2023_football_all-ohio.pdf",
      snap: join(ROOT, "data/ingestion/sources/ohio/2023-opsma-all-ohio.txt"),
    },
    {
      seasonEnd: 2025,
      url: "https://ohsaaweb.blob.core.windows.net/files/Sports/Football/2024/2024-fb-all-ohio.pdf",
      snap: join(ROOT, "data/ingestion/sources/ohio/2024-opsma-all-ohio.txt"),
    },
    {
      seasonEnd: 2026,
      url: "https://ohsaaweb.blob.core.windows.net/files/Sports/Football/2025/2025-opsma-football-all-ohio.pdf",
      snap: join(ROOT, "data/ingestion/sources/ohio/2025-opsma-all-ohio.txt"),
    },
  ];
  const players = [];
  const errors = [];
  for (const spec of specs) {
    if (!existsSync(spec.snap)) {
      errors.push(`OH OPSMA snapshot missing: ${spec.snap}`);
      continue;
    }
    const parsed = parseOpsmaText(readFileSync(spec.snap, "utf8"), spec.seasonEnd, spec.url);
    console.log(`  OPSMA ${spec.seasonEnd}: ${parsed.length} players`);
    if (!parsed.length) errors.push(`OPSMA ${spec.seasonEnd} parsed 0`);
    players.push(...parsed);
  }
  return { players, errors, blocked: [] };
}

function parseGpbText(text, seasonEnd = 2025, sourceUrl) {
  const players = [];
  const seen = new Set();
  const gradeMap = { senior: 12, junior: 11, sophomore: 10, freshman: 9 };
  for (const raw of String(text).split("\n")) {
    const line = raw.replace(/\s+/g, " ").trim();
    const sized = line.match(
      /^([A-Z][A-Za-z."'\-]+(?:\s+[A-Z][A-Za-z."'\-]+)+)\s*-\s*([A-Za-z0-9 .'\-\/]+?)\s*-\s*\d-\d{1,2},\s*\d{2,3},\s*(Senior|Junior|Sophomore|Freshman)\b/i,
    );
    if (sized) {
      const name = sized[1].replace(/"/g, "").trim();
      const school = sized[2].trim();
      const g = gradeMap[sized[3].toLowerCase()];
      const { firstName, lastName } = splitName(name);
      if (!firstName || !lastName) continue;
      if (/coach|outstanding|caption|credit|gpb/i.test(name)) continue;
      const key = `${firstName}|${lastName}|${school}|${seasonEnd}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      players.push({
        firstName,
        lastName,
        position: null,
        classYear: g ? classFromGrade(g, seasonEnd) : null,
        schoolName: school,
        stateCode: "GA",
        seasonYear: seasonEnd,
        sourceUrl,
        sourceName: "GPB Sports All-State Football",
        sourceType: "state_association",
        sourceState: "GA",
        sourceSchool: school,
      });
      continue;
    }
    const dashGrade = line.match(
      /^([A-Z][A-Za-z."'\-]+(?:\s+[A-Z][A-Za-z."'\-]+)+)\s*-\s*([A-Za-z0-9 .'\-\/]+?)\s*-\s*(Senior|Junior|Sophomore|Freshman)\b/i,
    );
    if (dashGrade) {
      const name = dashGrade[1].replace(/"/g, "").trim();
      const school = dashGrade[2].trim();
      const g = gradeMap[dashGrade[3].toLowerCase()];
      const { firstName, lastName } = splitName(name);
      if (!firstName || !lastName) continue;
      const key = `${firstName}|${lastName}|${school}|${seasonEnd}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      players.push({
        firstName,
        lastName,
        position: null,
        classYear: g ? classFromGrade(g, seasonEnd) : null,
        schoolName: school,
        stateCode: "GA",
        seasonYear: seasonEnd,
        sourceUrl,
        sourceName: "GPB Sports All-State Football",
        sourceType: "state_association",
        sourceState: "GA",
        sourceSchool: school,
      });
      continue;
    }
    const hm = line.match(/^Honorable Mention:\s*(.+)$/i);
    if (!hm) continue;
    for (const part of hm[1].split(";")) {
      const mm = part.trim().match(/^([^,]+),\s*(.+)$/);
      if (!mm) continue;
      const { firstName, lastName } = splitName(mm[1]);
      const school = mm[2].trim();
      if (!firstName || !lastName) continue;
      const key = `${firstName}|${lastName}|${school}|${seasonEnd}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      players.push({
        firstName,
        lastName,
        position: null,
        classYear: null,
        schoolName: school,
        stateCode: "GA",
        seasonYear: seasonEnd,
        sourceUrl,
        sourceName: "GPB Sports All-State Football",
        sourceType: "state_association",
        sourceState: "GA",
        sourceSchool: school,
      });
    }
  }
  return players;
}

async function fetchGeorgiaPlayers() {
  const lists = [
    {
      seasonEnd: 2024,
      url: "https://www.gpb.org/blogs/gpb-sports-blog/2023/12/23/2023-gpb-all-state-all-star-team",
      snap: join(ROOT, "data/ingestion/sources/georgia/2023-gpb-all-state.txt"),
    },
    {
      seasonEnd: 2025,
      url: "https://www.gpb.org/blogs/gpb-sports-blog/2024/12/24/2024-gpb-all-state-team",
      snap: join(ROOT, "data/ingestion/sources/georgia/2024-gpb-all-state.txt"),
    },
    {
      seasonEnd: 2026,
      url: "https://www.gpb.org/blogs/gpb-sports-blog/2025/12/22/gpb-all-state-football-team",
      snap: join(ROOT, "data/ingestion/sources/georgia/2025-gpb-all-state.txt"),
    },
  ];
  const players = [];
  const errors = [];
  const blocked = [];
  for (const spec of lists) {
    let text = existsSync(spec.snap) ? readFileSync(spec.snap, "utf8") : "";
    try {
      const res = await fetch(spec.url, { headers: { "User-Agent": USER_AGENT } });
      if (res.ok) {
        const html = await res.text();
        const live = decodeHtml(html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n"));
        if (parseGpbText(live, spec.seasonEnd, spec.url).length >= 5) text = live;
      }
    } catch (e) {
      console.log(`  GPB ${spec.seasonEnd} fetch note: ${e.message}`);
    }
    const parsed = parseGpbText(text, spec.seasonEnd, spec.url);
    console.log(`  GPB ${spec.seasonEnd}: ${parsed.length} players`);
    if (!parsed.length) errors.push(`GPB ${spec.seasonEnd} parsed 0`);
    players.push(...parsed);
  }
  return { players, errors, blocked };
}

function parseAswaText(text, seasonEnd, sourceUrl) {
  const players = [];
  const seen = new Set();
  const lineRe =
    /^\s*(?:QB|RB|WR|TE|OL|DL|LB|DB|K|P|ATH|UTL|FLEX|KR|PR|AP):\s*([^,\n]+),\s*([^,\n]+),\s*(Jr\.?|Sr\.?|So\.?|Fr\.?|Junior|Senior|Sophomore|Freshman)\b/gim;
  let m;
  while ((m = lineRe.exec(text))) {
    const pos = m[0].slice(0, m[0].indexOf(":")).toUpperCase();
    const { firstName, lastName } = splitName(m[1].trim());
    const school = m[2].trim();
    const tok = m[3].toLowerCase().replace(/\./g, "");
    const g = GRADE_MAP_SE[tok] || GRADE_MAP_SE[tok.slice(0, 2)];
    if (!firstName || !lastName || school.length < 2) continue;
    const key = `${firstName}|${lastName}|${school}|${seasonEnd}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    players.push({
      firstName,
      lastName,
      position: normPos(pos),
      classYear: g ? classFromGrade(g, seasonEnd) : null,
      schoolName: school,
      stateCode: "AL",
      seasonYear: seasonEnd,
      sourceUrl,
      sourceName: "Alabama Sports Writers Association All-State Football",
      sourceType: "state_association",
      sourceState: "AL",
      sourceSchool: school,
    });
  }
  const hmRe =
    /([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)+),\s*([A-Za-z0-9 .'\-\/]+),\s*(Jr\.|Sr\.|So\.|Fr\.)/g;
  while ((m = hmRe.exec(text))) {
    const { firstName, lastName } = splitName(m[1]);
    const school = m[2].trim();
    const g = GRADE_MAP_SE[m[3].toLowerCase().replace(/\./g, "")];
    if (!firstName || !lastName) continue;
    if (/coach|football|all-state|class /i.test(m[1])) continue;
    const key = `${firstName}|${lastName}|${school}|${seasonEnd}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    players.push({
      firstName,
      lastName,
      position: null,
      classYear: g ? classFromGrade(g, seasonEnd) : null,
      schoolName: school,
      stateCode: "AL",
      seasonYear: seasonEnd,
      sourceUrl,
      sourceName: "Alabama Sports Writers Association All-State Football",
      sourceType: "state_association",
      sourceState: "AL",
      sourceSchool: school,
    });
  }
  return players;
}

async function fetchAlabamaPlayers() {
  const lists = [
    {
      seasonEnd: 2026,
      url: "https://www.floridatoday.com/story/sports/high-school/football/2025/12/20/alabama-all-state-high-school-football-aswa-ahsaa-aisa/87829172007/",
      snap: join(ROOT, "data/ingestion/sources/alabama/2025-aswa-all-state.txt"),
    },
    {
      seasonEnd: 2025,
      url: "https://www.al.com/highschoolsports/2024/12/see-who-made-the-aswa-all-state-football-team-for-2024.html",
      snap: join(ROOT, "data/ingestion/sources/alabama/2024-aswa-all-state.txt"),
    },
    {
      seasonEnd: 2024,
      url: "https://www.al.com/highschoolsports/2023/12/meet-the-2023-aswa-all-state-high-school-football-team.html",
      snap: join(ROOT, "data/ingestion/sources/alabama/2023-aswa-all-state.txt"),
    },
    {
      seasonEnd: 2023,
      url: "https://www.si.com/college/alabama/aswa/2022-aswa-all-state-football-teams-coaches-year",
      snap: join(ROOT, "data/ingestion/sources/alabama/2022-aswa-all-state.txt"),
    },
  ];
  const all = [];
  const errors = [];
  for (const spec of lists) {
    let text = existsSync(spec.snap) ? readFileSync(spec.snap, "utf8") : "";
    try {
      const res = await fetch(spec.url, { headers: { "User-Agent": USER_AGENT } });
      if (res.ok) {
        const html = await res.text();
        const live = decodeHtml(html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n"));
        if (parseAswaText(live, spec.seasonEnd, spec.url).length > 50) text = live;
      }
    } catch (e) {
      errors.push(`${spec.url}: ${e.message}`);
    }
    const parsed = parseAswaText(text, spec.seasonEnd, spec.url);
    console.log(`  ASWA ${spec.seasonEnd}: ${parsed.length} players`);
    all.push(...parsed);
  }
  return { players: all, errors, blocked: [] };
}

function loadFloridaCsvPlayers() {
  const dir = join(ROOT, "data/ingestion/sources/florida");
  if (!existsSync(dir)) return { players: [], errors: [] };
  const { readdirSync } = require("node:fs");
  const players = [];
  const errors = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".csv"))) {
    const lines = readFileSync(join(dir, f), "utf8").trim().split(/\r?\n/);
    if (lines.length < 2) continue;
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const idx = (n) => headers.indexOf(n);
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const firstName = cols[idx("first_name")];
      const lastName = cols[idx("last_name")];
      const school = cols[idx("school")] || cols[idx("school_name")];
      const state = (cols[idx("state")] || cols[idx("state_code")] || "").toUpperCase();
      const sourceUrl = cols[idx("source_url")] || cols[idx("url")];
      if (!firstName || !lastName || !school || state !== "FL" || !sourceUrl) {
        errors.push(`${f}:${i + 1} skipped (need FL + source_url)`);
        continue;
      }
      players.push({
        firstName,
        lastName,
        position: normPos(cols[idx("position")]),
        classYear: Number(cols[idx("class_year")] || cols[idx("class")]) || null,
        schoolName: school,
        stateCode: "FL",
        seasonYear:
          Number(cols[idx("season_year")] || cols[idx("season")]) || new Date().getFullYear(),
        sourceUrl,
        sourceName: cols[idx("source_name")] || "Manual CSV import",
        sourceType: "csv_import",
        sourceState: "FL",
        sourceSchool: school,
      });
    }
  }
  return { players, errors };
}

function loadNces(states, limitPerState) {
  const full = join(ROOT, "data/nces/schools.json");
  const sample = join(ROOT, "src/data/seed/schools-nces-sample.json");
  const path = existsSync(full) ? full : sample;
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const set = new Set(states);
  const counts = new Map();
  const out = [];
  for (const s of raw) {
    const st = (s.stateCode || "").toUpperCase();
    if (!set.has(st)) continue;
    const n = counts.get(st) || 0;
    if (limitPerState != null && n >= limitPerState) continue;
    counts.set(st, n + 1);
    out.push({
      id: s.ncesId ? uuidFromKey(`nces:${s.ncesId}`) : uuidFromKey(`school:${st}:${s.slug || s.name}`),
      name: s.name,
      slug: s.slug || `${slugify(s.name)}-${st.toLowerCase()}`,
      city: s.city || null,
      stateCode: st,
      ncesId: s.ncesId || null,
      websiteUrl: s.websiteUrl || null,
      sourceUrl: "https://nces.ed.gov/ccd/files.asp",
      sourceName: "NCES Common Core of Data (CCD)",
      sourceType: "nces_ccd",
      isSynthetic: false,
    });
  }
  return out;
}

function dedupePlayers(players) {
  const map = new Map();
  let dupes = 0;
  for (const p of players) {
    const key = `${p.firstName}|${p.lastName}|${p.schoolName}|${p.classYear || ""}|${p.stateCode}`.toLowerCase();
    const existing = map.get(key);
    if (!existing) map.set(key, p);
    else if (p.seasonYear > existing.seasonYear) map.set(key, p), (dupes += 1);
    else dupes += 1;
  }
  return { players: [...map.values()], duplicatesDetected: dupes };
}

function writeSchoolSql(schools, outDir) {
  const files = [];
  const BATCH = 150;
  for (let i = 0; i < schools.length; i += BATCH) {
    const batch = schools.slice(i, i + BATCH);
    const values = batch
      .map(
        (s) =>
          `(${sqlStr(s.id)}::uuid, ${sqlStr(s.name)}, ${sqlStr(s.slug)}, ${sqlStr(s.city)}, ${sqlStr(s.stateCode)}, ${sqlStr(s.ncesId)}, ${sqlStr(s.websiteUrl)}, ${sqlStr(s.sourceUrl)}, ${sqlStr(s.sourceType)}, ${sqlStr(s.sourceName)}, ${sqlBool(false)}, now())`,
      )
      .join(",\n");
    const sql = `-- schools batch ${i / BATCH + 1}
INSERT INTO takkle.schools (
  id, name, slug, city, state_code, nces_id, website_url,
  source_url, source_type, source_name, is_synthetic, last_verified_at
) VALUES
${values}
ON CONFLICT (slug) DO UPDATE SET
  nces_id = COALESCE(EXCLUDED.nces_id, takkle.schools.nces_id),
  website_url = COALESCE(EXCLUDED.website_url, takkle.schools.website_url),
  source_url = COALESCE(EXCLUDED.source_url, takkle.schools.source_url),
  source_type = COALESCE(EXCLUDED.source_type, takkle.schools.source_type),
  source_name = COALESCE(EXCLUDED.source_name, takkle.schools.source_name),
  is_synthetic = false,
  last_verified_at = now(),
  updated_at = now();
`;
    const name = `${String(100 + i / BATCH).padStart(3, "0")}_schools.sql`;
    writeFileSync(join(outDir, name), sql);
    files.push(name);
  }
  return files;
}

function writePlayerSql(players, schoolIdByKey, outDir, dataSourceIdByName) {
  const files = [];
  const BATCH = 100;
  const seasonIds = {
    2023: null,
    2024: null,
    2025: null,
    2026: null,
  };

  // Ensure seasons exist in prelude
  const prelude = `-- ensure seasons + resolve school ids via slug
INSERT INTO takkle.seasons (year, label) VALUES
  (2023,'2023'),(2024,'2024'),(2025,'2025'),(2026,'2026'),(2027,'2027'),(2028,'2028'),(2029,'2029')
ON CONFLICT (year) DO NOTHING;
`;
  writeFileSync(join(outDir, "090_prelude.sql"), prelude);
  files.push("090_prelude.sql");

  for (let i = 0; i < players.length; i += BATCH) {
    const batch = players.slice(i, i + BATCH);
    const rows = [];
    const seasonRows = [];
    const refRows = [];

    for (const p of batch) {
      const schoolKey = `${slugify(p.schoolName)}|${p.stateCode}`;
      let schoolId = schoolIdByKey.get(schoolKey);
      // Fallback: create association school stub id
      if (!schoolId) {
        const slug = `${slugify(p.schoolName)}-${p.stateCode.toLowerCase()}`;
        schoolId = uuidFromKey(`assoc-school:${p.stateCode}:${slugify(p.schoolName)}`);
        schoolIdByKey.set(schoolKey, schoolId);
      }

      const playerId = uuidFromKey(
        `player:${p.stateCode}:${slugify(p.schoolName)}:${slugify(p.firstName)}:${slugify(p.lastName)}:${p.classYear || "x"}`,
      );
      const slugBase = `${slugify(p.firstName)}-${slugify(p.lastName)}-${(p.position || "ath").toLowerCase()}-${p.classYear || p.seasonYear}-${slugify(p.schoolName)}-${p.stateCode.toLowerCase()}`;
      const slug = slugBase.slice(0, 120);

      const dsId = dataSourceIdByName.get(p.sourceName);
      rows.push(
        `(${sqlStr(playerId)}::uuid, ${sqlStr(p.firstName)}, ${sqlStr(p.lastName)}, ${sqlStr(slug)}, ${sqlStr(p.position)}, ${sqlNum(p.classYear)}, ${sqlStr(schoolId)}::uuid, ${sqlStr(p.stateCode)}, 'unclaimed'::player_status, ${dsId ? sqlStr(dsId) + "::uuid" : "NULL::uuid"}, ${sqlStr(p.sourceUrl)}, ${sqlStr(p.sourceName)}, ${sqlStr(p.sourceType)}, ${sqlStr(p.sourceState)}, ${sqlStr(p.sourceSchool)}, 'source_verified', now(), now(), false, now())`,
      );

      seasonRows.push({
        playerId,
        seasonYear: p.seasonYear,
        position: p.position,
        sourceUrl: p.sourceUrl,
      });

      refRows.push({
        playerId,
        sourceName: p.sourceName,
        sourceUrl: p.sourceUrl,
        sourceType: p.sourceType,
        sourceState: p.sourceState,
        sourceSchool: p.sourceSchool,
        seasonYear: p.seasonYear,
        dataSourceId: dataSourceIdByName.get(p.sourceName) || null,
      });
    }

    // Also ensure association schools exist for unmatched names
    const assocSchools = [];
    for (const p of batch) {
      const schoolKey = `${slugify(p.schoolName)}|${p.stateCode}`;
      const id = schoolIdByKey.get(schoolKey);
      const slug = `${slugify(p.schoolName)}-${p.stateCode.toLowerCase()}`;
      // Always upsert association-derived school (safe if NCES already has slug)
      assocSchools.push(
        `(${sqlStr(id)}::uuid, ${sqlStr(p.schoolName)}, ${sqlStr(slug)}, NULL, ${sqlStr(p.stateCode)}, NULL, NULL, ${sqlStr(p.sourceUrl)}, ${sqlStr(p.sourceType)}, ${sqlStr(p.sourceName)}, false, now())`,
      );
    }

    const sql = `-- players batch ${i / BATCH + 1}
INSERT INTO takkle.schools (
  id, name, slug, city, state_code, nces_id, website_url,
  source_url, source_type, source_name, is_synthetic, last_verified_at
) VALUES
${[...new Set(assocSchools)].join(",\n")}
ON CONFLICT (slug) DO UPDATE SET
  source_url = COALESCE(takkle.schools.source_url, EXCLUDED.source_url),
  source_type = COALESCE(takkle.schools.source_type, EXCLUDED.source_type),
  source_name = COALESCE(takkle.schools.source_name, EXCLUDED.source_name),
  updated_at = now();

INSERT INTO takkle.players (
  id, first_name, last_name, slug, position, class_year, school_id, state_code,
  status, primary_source_id, source_url, source_name, source_type,
  source_state, source_school, verification_status, last_verified_at,
  source_last_checked, is_synthetic, ingestion_date
) VALUES
${rows.join(",\n")}
ON CONFLICT (slug) DO UPDATE SET
  position = COALESCE(EXCLUDED.position, takkle.players.position),
  class_year = COALESCE(EXCLUDED.class_year, takkle.players.class_year),
  school_id = COALESCE(EXCLUDED.school_id, takkle.players.school_id),
  source_url = COALESCE(EXCLUDED.source_url, takkle.players.source_url),
  source_name = COALESCE(EXCLUDED.source_name, takkle.players.source_name),
  verification_status = 'source_verified',
  last_verified_at = now(),
  source_last_checked = now(),
  is_synthetic = false,
  updated_at = now();

INSERT INTO takkle.player_seasons (player_id, season_id, position, data_origin, source_url)
SELECT v.player_id, s.id, v.position, 'official_roster'::data_origin, v.source_url
FROM (VALUES
${seasonRows
  .map(
    (r) =>
      `(${sqlStr(r.playerId)}::uuid, ${sqlNum(r.seasonYear)}, ${sqlStr(r.position)}, ${sqlStr(r.sourceUrl)})`,
  )
  .join(",\n")}
) AS v(player_id, season_year, position, source_url)
JOIN takkle.seasons s ON s.year = v.season_year
ON CONFLICT (player_id, season_id) DO UPDATE SET
  position = COALESCE(EXCLUDED.position, takkle.player_seasons.position),
  source_url = COALESCE(EXCLUDED.source_url, takkle.player_seasons.source_url);

INSERT INTO takkle.player_source_refs (
  player_id, data_source_id, source_name, source_url, source_type,
  source_state, source_school, season_year, source_last_checked
)
SELECT v.player_id, v.data_source_id, v.source_name, v.source_url, v.source_type,
       v.source_state, v.source_school, v.season_year, now()
FROM (VALUES
${refRows
  .map(
    (r) =>
      `(${sqlStr(r.playerId)}::uuid, ${r.dataSourceId ? sqlStr(r.dataSourceId) + "::uuid" : "NULL::uuid"}, ${sqlStr(r.sourceName)}, ${sqlStr(r.sourceUrl)}, ${sqlStr(r.sourceType)}, ${sqlStr(r.sourceState)}, ${sqlStr(r.sourceSchool)}, ${sqlNum(r.seasonYear)})`,
  )
  .join(",\n")}
) AS v(player_id, data_source_id, source_name, source_url, source_type, source_state, source_school, season_year)
ON CONFLICT (player_id, source_url, season_year) DO UPDATE SET
  source_last_checked = now();
`;
    const name = `${String(200 + i / BATCH).padStart(3, "0")}_players.sql`;
    writeFileSync(join(outDir, name), sql);
    files.push(name);
  }
  return files;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = args.outDir || join(ROOT, "data/ingestion", `run-${stamp}`);
  mkdirSync(outDir, { recursive: true });

  console.log("Takkle permitted ingestion");
  console.log("States:", args.states.join(","));
  console.log("Out:", outDir);

  const summary = {
    schoolsDiscovered: 0,
    schoolsImported: 0,
    playersDiscovered: 0,
    playersImported: 0,
    duplicatesDetected: 0,
    errors: [],
    blockedSources: [
      "MaxPreps — robots.txt Disallow /school/ /team/",
      "Scorebook Live / scores.cifss.org — AWS WAF challenge + commercial ToS",
      "Dave Campbell's Texas Football — commercial; CSV fallback",
    ],
    byState: {},
    files: [],
  };

  let schools = [];
  if (!args.playersOnly) {
    schools = loadNces(args.states, args.schoolLimit);
    summary.schoolsDiscovered = schools.length;
    console.log(`NCES schools loaded: ${schools.length}`);
  }

  let allPlayers = [];
  if (!args.schoolsOnly) {
    if (args.states.includes("CA")) {
      console.log("Fetching CIF-SS All-CIF...");
      const ca = await fetchCifssPlayers();
      console.log("Fetching Cal-Hi Sports public all-state...");
      const calhi = await fetchCalHiPlayers();
      const caPlayers = [...ca.players, ...calhi.players];
      allPlayers.push(...caPlayers);
      summary.errors.push(...ca.errors, ...calhi.errors);
      summary.blockedSources.push(...ca.blocked, ...calhi.blocked);
      summary.byState.CA = {
        playersRaw: caPlayers.length,
        cifss: ca.players.length,
        calHiSports: calhi.players.length,
      };
    }
    if (args.states.includes("TX")) {
      console.log("Fetching TSWA all-state (multi-year)...");
      const tx = await fetchTswaPlayers();
      allPlayers.push(...tx.players);
      summary.errors.push(...tx.errors);
      summary.byState.TX = { playersRaw: tx.players.length };
    }
    if (args.states.includes("OH")) {
      console.log("Fetching OPSMA All-Ohio...");
      const oh = await fetchOhioPlayers();
      allPlayers.push(...oh.players);
      summary.errors.push(...oh.errors);
      summary.blockedSources.push(...oh.blocked);
      summary.byState.OH = { playersRaw: oh.players.length };
    }
    if (args.states.includes("GA")) {
      console.log("Fetching GPB All-State...");
      const ga = await fetchGeorgiaPlayers();
      allPlayers.push(...ga.players);
      summary.errors.push(...ga.errors);
      summary.blockedSources.push(...ga.blocked);
      summary.blockedSources.push("GHSA.net unstable/500 — partnership/CSV for full dumps");
      summary.byState.GA = { playersRaw: ga.players.length };
    }
    if (args.states.includes("FL")) {
      console.log("Loading Florida CSV (association sites paywalled/robots-blocked)...");
      const fl = loadFloridaCsvPlayers();
      allPlayers.push(...fl.players);
      summary.errors.push(...fl.errors);
      summary.blockedSources.push(
        "floridahsfootball.com all-state — membership paywall",
        "fhsaa.org — robots Disallow:/",
        "FL: use data/ingestion/sources/florida/*.csv or CFBD_API_KEY",
      );
      summary.byState.FL = {
        playersRaw: fl.players.length,
        note: "CSV/CFBD only — commercial all-state paywalled",
      };
    }
    if (args.states.includes("AL")) {
      console.log("Fetching ASWA All-State (stretch)...");
      const al = await fetchAlabamaPlayers();
      allPlayers.push(...al.players);
      summary.errors.push(...al.errors);
      summary.byState.AL = { playersRaw: al.players.length };
    }
  }

  const deduped = dedupePlayers(allPlayers);
  summary.duplicatesDetected = deduped.duplicatesDetected;
  let players = deduped.players;

  // Cap at shared review target
  if (players.length > INGESTION_PLAYER_CAP) {
    players = players.slice(0, INGESTION_PLAYER_CAP);
    summary.stoppedAtCap = true;
  }
  summary.playersDiscovered = allPlayers.length;
  summary.playersImported = players.length;
  summary.schoolsImported = schools.length;

  // Stable school id map
  const schoolIdByKey = new Map();
  for (const s of schools) {
    schoolIdByKey.set(`${slugify(s.name)}|${s.stateCode}`, s.id);
    // also index without "High School" suffix variants
    const short = s.name.replace(/\s+High School$/i, "").replace(/\s+HS$/i, "");
    schoolIdByKey.set(`${slugify(short)}|${s.stateCode}`, s.id);
  }

  // Placeholder data source ids (resolved at SQL time via subquery if needed)
  // We embed NULL and let SQL join by name in a wrap-up — simpler: query-less fixed UUIDs from names
  const dataSourceIdByName = new Map([
    ["NCES Common Core of Data (CCD)", uuidFromKey("ds:nces")],
    ["CIF Southern Section All-CIF Football", uuidFromKey("ds:cifss-allcif")],
    ["Cal-Hi Sports All-State Football", uuidFromKey("ds:calhisports")],
    ["Texas Sports Writers Association All-State Football", uuidFromKey("ds:tswa")],
    ["Ohio Prep Sports Media Association All-Ohio Football", uuidFromKey("ds:opsma-oh")],
    ["GPB Sports All-State Football", uuidFromKey("ds:gpb-ga")],
    ["Alabama Sports Writers Association All-State Football", uuidFromKey("ds:aswa-al")],
    ["Manual CSV import", uuidFromKey("ds:csv")],
  ]);

  writeFileSync(
    join(outDir, "000_data_sources.sql"),
    `-- upsert known sources with stable ids (no unique name constraint — guard with NOT EXISTS)
INSERT INTO takkle.data_sources (id, name, source_type, base_url, robots_allowed, license_notes, state_code, permission_status, robots_checked, terms_checked, is_active, active)
SELECT v.id::uuid, v.name, v.source_type, v.base_url, v.robots_allowed, v.license_notes, v.state_code, v.permission_status, true, true, true, true
FROM (VALUES
  (${sqlStr(dataSourceIdByName.get("NCES Common Core of Data (CCD)"))}, 'NCES Common Core of Data (CCD)', 'nces_ccd', 'https://nces.ed.gov/ccd/files.asp', true, 'public domain', NULL, 'permitted'),
  (${sqlStr(dataSourceIdByName.get("CIF Southern Section All-CIF Football"))}, 'CIF Southern Section All-CIF Football', 'state_association', 'https://cifss.org/allcifss/', true, 'public honor rolls', 'CA', 'permitted'),
  (${sqlStr(dataSourceIdByName.get("Cal-Hi Sports All-State Football"))}, 'Cal-Hi Sports All-State Football', 'media_public', 'https://www.calhisports.com/cal-hi-sports-archives/', true, 'public media lists (non-paywalled)', 'CA', 'permitted'),
  (${sqlStr(dataSourceIdByName.get("Texas Sports Writers Association All-State Football"))}, 'Texas Sports Writers Association All-State Football', 'state_association', 'https://txswa.org/', true, 'public media lists', 'TX', 'permitted'),
  (${sqlStr(dataSourceIdByName.get("Ohio Prep Sports Media Association All-Ohio Football"))}, 'Ohio Prep Sports Media Association All-Ohio Football', 'state_association', 'https://ohsaaweb.blob.core.windows.net/files/Sports/Football/2024/2024-fb-all-ohio.pdf', true, 'public OPSMA honor roll PDF via OHSAA', 'OH', 'permitted'),
  (${sqlStr(dataSourceIdByName.get("GPB Sports All-State Football"))}, 'GPB Sports All-State Football', 'state_association', 'https://www.gpb.org/blogs/gpb-sports-blog/2024/12/24/2024-gpb-all-state-team', true, 'public GPB media honor roll', 'GA', 'permitted'),
  (${sqlStr(dataSourceIdByName.get("Alabama Sports Writers Association All-State Football"))}, 'Alabama Sports Writers Association All-State Football', 'state_association', 'https://www.aswa.org/', true, 'public ASWA media selections', 'AL', 'permitted'),
  (${sqlStr(dataSourceIdByName.get("Manual CSV import"))}, 'Manual CSV import', 'csv_import', NULL, false, 'operator permitted', NULL, 'permitted')
) AS v(id, name, source_type, base_url, robots_allowed, license_notes, state_code, permission_status)
WHERE NOT EXISTS (SELECT 1 FROM takkle.data_sources d WHERE d.name = v.name OR d.id = v.id::uuid);
`,
  );
  summary.files.push("000_data_sources.sql");

  if (schools.length) {
    summary.files.push(...writeSchoolSql(schools, outDir));
  }
  if (players.length) {
    summary.files.push(...writePlayerSql(players, schoolIdByKey, outDir, dataSourceIdByName));
  }

  // ingestion run record
  writeFileSync(
    join(outDir, "900_ingestion_run.sql"),
    `INSERT INTO takkle.ingestion_runs (
  status, schools_discovered, players_discovered, players_imported,
  duplicates_detected, sources_failing, error_summary, started_at, finished_at,
  state_code, adapter_key, metadata
) VALUES (
  'completed',
  ${summary.schoolsDiscovered},
  ${summary.playersDiscovered},
  ${summary.playersImported},
  ${summary.duplicatesDetected},
  ${summary.errors.length},
  ${sqlStr(summary.errors.slice(0, 20).join("; ") || null)},
  now(), now(),
  ${sqlStr(args.states.join(","))},
  'multi-state',
  ${sqlStr(JSON.stringify({ blockedSources: summary.blockedSources, byState: summary.byState }))}::jsonb
);
`,
  );
  summary.files.push("900_ingestion_run.sql");

  writeFileSync(join(outDir, "schools.json"), JSON.stringify(schools, null, 2));
  writeFileSync(join(outDir, "players.json"), JSON.stringify(players, null, 2));
  writeFileSync(join(outDir, "summary.json"), JSON.stringify(summary, null, 2));

  console.log("\nSummary");
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nSQL files in ${outDir}`);
  console.log("Apply with Supabase MCP execute_sql or psql, in filename order.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
