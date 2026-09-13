#!/usr/bin/env node
/**
 * Import high-school football recruits from CollegeFootballData (CFBD).
 *
 * API: GET https://api.collegefootballdata.com/recruiting/players
 * Docs: https://api.collegefootballdata.com/api/docs/
 * Key:  free at https://collegefootballdata.com (CFBD_API_KEY)
 *
 * ToS (summary): commercial use in websites/apps allowed; private cache OK;
 * display reasonable factual portions; do NOT republish as a raw dump/mirror API.
 * Star ratings are stored only as provenance — never used as Takkle rank/score.
 *
 * Usage:
 *   node scripts/import-cfbd-recruits.mjs
 *   node scripts/import-cfbd-recruits.mjs --year 2026
 *   node scripts/import-cfbd-recruits.mjs --years 2025,2026,2027,2028
 *   node scripts/import-cfbd-recruits.mjs --limit 500
 *   node scripts/import-cfbd-recruits.mjs --sample-limit 100
 *   node scripts/import-cfbd-recruits.mjs --skip-download
 *   node scripts/import-cfbd-recruits.mjs --embed-all
 *
 * Outputs:
 *   data/cfbd/raw/recruits-{year}.json     raw API payloads (gitignored)
 *   data/cfbd/players-chunk-*.json         full Takkle-shaped players (gitignored)
 *   data/cfbd/manifest.json               provenance + counts
 *   src/data/seed/players-cfbd-sample.json commit-sized sample for the app
 *   src/data/seed/players-cfbd-manifest.json sample manifest
 *
 * App switch: TAKKLE_PLAYERS_SOURCE=cfbd (see .env.example)
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "data", "cfbd");
const RAW_DIR = join(OUT_DIR, "raw");
const SEED_DIR = join(ROOT, "src", "data", "seed");
const SAMPLE_PATH = join(SEED_DIR, "players-cfbd-sample.json");
const SAMPLE_MANIFEST_PATH = join(SEED_DIR, "players-cfbd-manifest.json");
const CHUNK_SIZE = 500;

const API_BASE = "https://api.collegefootballdata.com";
const USER_AGENT = "TakkleCFBDImporter/1.0 (+https://takkle.com; CFBD licensed cache)";

const DEFAULT_YEARS = [2025, 2026, 2027, 2028];

const SOURCE = {
  name: "CollegeFootballData",
  sourceType: "cfbd_recruiting",
  sourceUrl: "https://collegefootballdata.com",
  apiUrl: `${API_BASE}/recruiting/players`,
  dataOrigin: "licensed",
  license:
    "CFBD API — commercial use in websites/apps allowed; private cache OK; do not republish as a mirror/dump API. Cite CollegeFootballData.",
};

const POSITION_MAP = {
  QB: "QB",
  RB: "RB",
  FB: "RB",
  WR: "WR",
  TE: "TE",
  OT: "OL",
  OG: "OL",
  OC: "OL",
  OL: "OL",
  IOL: "OL",
  C: "OL",
  G: "OL",
  T: "OL",
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
  WDE: "DL",
  SDE: "DL",
  PRO: "ATH",
  Dual: "QB",
  DUAI: "QB",
};

const PLACEHOLDER_WEIGHTS = [
  ["film_evaluation", "Film Evaluation", 0.25],
  ["production", "Production", 0.2],
  ["athleticism", "Athleticism", 0.2],
  ["measurables", "Measurables", 0.1],
  ["competition_level", "Competition Level", 0.1],
  ["consistency", "Consistency", 0.1],
  ["recruiting_signals", "Recruiting Signals", 0.05],
];

function parseArgs(argv) {
  const args = {
    skipDownload: false,
    embedAll: false,
    limit: null,
    sampleLimit: 100,
    years: null,
    year: null,
    classification: "HighSchool",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--skip-download") args.skipDownload = true;
    else if (a === "--embed-all") args.embedAll = true;
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--sample-limit") args.sampleLimit = Number(argv[++i]);
    else if (a === "--year") args.year = Number(argv[++i]);
    else if (a === "--years") {
      args.years = argv[++i]
        .split(",")
        .map((y) => Number(y.trim()))
        .filter((y) => Number.isFinite(y));
    } else if (a === "--classification") args.classification = argv[++i];
    else if (a === "--help" || a === "-h") {
      console.log(`See header comment in ${fileURLToPath(import.meta.url)}`);
      process.exit(0);
    }
  }
  if (args.year && !args.years) args.years = [args.year];
  if (!args.years?.length) args.years = [...DEFAULT_YEARS];
  return args;
}

/** Load KEY=VAL from .env / .env.local without printing values. */
function loadEnvFiles() {
  for (const name of [".env", ".env.local", ".env.development.local"]) {
    const path = join(ROOT, name);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] == null || process.env[key] === "") {
        process.env[key] = val;
      }
    }
  }
}

function requireApiKey() {
  const key = (process.env.CFBD_API_KEY || "").trim();
  if (!key) {
    console.error(`
Missing CFBD_API_KEY.

Get a free API key:
  1. Create an account at https://collegefootballdata.com
  2. Copy your API key from the dashboard
  3. Add to .env:
       CFBD_API_KEY=your_key_here
  4. Re-run: npm run import:cfbd-recruits

Then switch the app to CFBD players:
       TAKKLE_PLAYERS_SOURCE=cfbd
`);
    process.exit(1);
  }
  return key;
}

function slugify(...parts) {
  return parts
    .join("-")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function uuidFromLabel(label) {
  const hash = createHash("sha1").update(`takkle.cfbd.${label}`).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function normalizeSchoolName(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(high school|highschool|h\s*s|hs|senior high|academy|collegiate|prep|preparatory|school)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function mapPosition(raw) {
  if (!raw) return "ATH";
  const key = String(raw).trim();
  if (POSITION_MAP[key]) return POSITION_MAP[key];
  const upper = key.toUpperCase();
  if (POSITION_MAP[upper]) return POSITION_MAP[upper];
  return "ATH";
}

/** CFBD height is typically inches (e.g. 74). Guard against rare foot.inch forms. */
function normalizeHeightInches(height) {
  if (height == null || height === "") return 72;
  const n = Number(height);
  if (!Number.isFinite(n) || n <= 0) return 72;
  if (n < 10) {
    // e.g. 6.2 → 6'2"
    const feet = Math.floor(n);
    const inches = Math.round((n - feet) * 10);
    return feet * 12 + inches;
  }
  if (n > 90) return 72;
  return Math.round(n * 2) / 2;
}

function normalizeWeight(weight) {
  const n = Number(weight);
  if (!Number.isFinite(n) || n < 120 || n > 420) return 185;
  return Math.round(n);
}

function splitName(fullName) {
  const cleaned = String(fullName || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return { firstName: "Unknown", lastName: "Recruit" };
  const parts = cleaned.split(" ");
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function insufficientTackleScore(nowIso) {
  return {
    score: 1,
    version: "2026.1",
    confidence: "insufficient",
    scoreDate: nowIso,
    components: PLACEHOLDER_WEIGHTS.map(([key, label, weight]) => ({
      key,
      label,
      score: 1,
      weight,
    })),
  };
}

function loadNcesSchools() {
  const candidates = [
    join(ROOT, "data", "nces", "schools.json"),
    join(SEED_DIR, "schools-nces-sample.json"),
  ];
  const schools = [];
  const seen = new Set();
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      const rows = JSON.parse(readFileSync(path, "utf8"));
      if (!Array.isArray(rows)) continue;
      for (const s of rows) {
        if (!s?.id || seen.has(s.id)) continue;
        seen.add(s.id);
        schools.push(s);
      }
      console.log(`Loaded ${rows.length} schools from ${path.replace(ROOT + "/", "")}`);
    } catch (err) {
      console.warn(`Could not read ${path}: ${err.message}`);
    }
  }
  return schools;
}

function buildSchoolIndex(schools) {
  const byStateNorm = new Map();
  for (const s of schools) {
    const state = String(s.stateCode || "").toUpperCase();
    const norm = normalizeSchoolName(s.name);
    if (!state || !norm) continue;
    const key = `${state}::${norm}`;
    if (!byStateNorm.has(key)) byStateNorm.set(key, []);
    byStateNorm.get(key).push(s);

    // Also index without trailing "high" already stripped — add city-qualified
    const withCity = normalizeSchoolName(`${s.name} ${s.city || ""}`);
    if (withCity && withCity !== norm) {
      const ck = `${state}::${withCity}`;
      if (!byStateNorm.has(ck)) byStateNorm.set(ck, []);
      byStateNorm.get(ck).push(s);
    }
  }
  return byStateNorm;
}

function tokenSet(s) {
  return new Set(s.split(" ").filter((t) => t.length > 1));
}

function tokenOverlap(a, b) {
  const ta = tokenSet(a);
  const tb = tokenSet(b);
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.max(ta.size, tb.size);
}

function matchSchool(index, schoolName, stateCode, city) {
  const state = String(stateCode || "").toUpperCase();
  const norm = normalizeSchoolName(schoolName);
  if (!state || !norm) return null;

  const exactKey = `${state}::${norm}`;
  if (index.has(exactKey)) return index.get(exactKey)[0];

  if (city) {
    const cityKey = `${state}::${normalizeSchoolName(`${schoolName} ${city}`)}`;
    if (index.has(cityKey)) return index.get(cityKey)[0];
  }

  // Fuzzy: best token overlap within same state
  let best = null;
  let bestScore = 0;
  const prefix = `${state}::`;
  for (const [key, list] of index) {
    if (!key.startsWith(prefix)) continue;
    const candidateNorm = key.slice(prefix.length);
    if (
      candidateNorm.includes(norm) ||
      norm.includes(candidateNorm)
    ) {
      const score = 0.85 + tokenOverlap(norm, candidateNorm) * 0.15;
      if (score > bestScore) {
        bestScore = score;
        best = list[0];
      }
      continue;
    }
    const overlap = tokenOverlap(norm, candidateNorm);
    if (overlap >= 0.75 && overlap > bestScore) {
      bestScore = overlap;
      best = list[0];
    }
  }
  return bestScore >= 0.75 ? best : null;
}

function stubSchool(schoolName, stateCode, city) {
  const state = String(stateCode || "US").toUpperCase() || "US";
  const name = String(schoolName || "Unknown High School").trim() || "Unknown High School";
  const slugBase = slugify(name, state) || `school-${state.toLowerCase()}`;
  return {
    id: uuidFromLabel(`school:${state}:${name}:${city || ""}`),
    name,
    slug: slugBase,
    city: String(city || "").trim() || "Unknown",
    stateCode: state,
    region: state,
    isSynthetic: false,
    provenance: {
      sourceName: SOURCE.name,
      sourceType: SOURCE.sourceType,
      sourceUrl: SOURCE.sourceUrl,
      dataOrigin: SOURCE.dataOrigin,
      license: SOURCE.license,
      note: "Stub school from CFBD high-school name (no NCES match).",
    },
  };
}

async function fetchYear(year, apiKey, classification) {
  const url = new URL(`${API_BASE}/recruiting/players`);
  url.searchParams.set("year", String(year));
  if (classification) url.searchParams.set("classification", classification);

  console.log(`Fetching CFBD recruits year=${year} classification=${classification}`);
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `CFBD auth failed (HTTP ${res.status}). Check CFBD_API_KEY at https://collegefootballdata.com`,
    );
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`CFBD HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error(`Unexpected CFBD response for year ${year}`);
  }
  return data;
}

function recruitId(rec) {
  if (rec.id != null) return String(rec.id);
  if (rec.athleteId != null) return String(rec.athleteId);
  if (rec.athlete_id != null) return String(rec.athlete_id);
  return slugify(rec.name || "unknown", rec.year || "", rec.school || "", rec.stateProvince || rec.state_province || "");
}

function toPlayer(rec, school, nowIso, slugCounts) {
  const { firstName, lastName } = splitName(rec.name);
  const position = mapPosition(rec.position);
  const classYear = Number(rec.year) || new Date().getFullYear();
  const stateCode = String(
    rec.stateProvince || rec.state_province || school.stateCode || "",
  )
    .trim()
    .toUpperCase() || "US";
  const city = String(rec.city || school.city || "").trim();

  let slug = slugify(firstName, lastName, position, classYear, school.slug);
  const count = (slugCounts.get(slug) || 0) + 1;
  slugCounts.set(slug, count);
  if (count > 1) slug = `${slug}-${count}`;

  const cfbdId = recruitId(rec);
  const committedTo = rec.committedTo || rec.committed_to || null;
  // Stars / rating kept ONLY as non-display provenance — never Tackle Score or rankings.
  const stars = rec.stars;
  const rating = rec.rating;
  const ranking = rec.ranking;

  const offers = [];
  if (committedTo) {
    offers.push({
      schoolName: String(committedTo),
      status: "committed",
    });
  }

  return {
    id: uuidFromLabel(`player:${cfbdId}`),
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`.trim(),
    slug,
    position,
    classYear,
    schoolId: school.id,
    school,
    stateCode,
    heightInches: normalizeHeightInches(rec.height),
    weightLbs: normalizeWeight(rec.weight),
    status: "unclaimed",
    hometownCity: city || school.city || undefined,
    isSynthetic: false,
    isFeatured: false,
    tackleScore: insufficientTackleScore(nowIso),
    rankings: [],
    film: [],
    stats: [],
    measurements: [],
    offers,
    provenance: {
      sourceName: SOURCE.name,
      sourceType: SOURCE.sourceType,
      sourceUrl: SOURCE.sourceUrl,
      dataOrigin: SOURCE.dataOrigin,
      lastVerifiedAt: nowIso,
      ingestionDate: nowIso,
      license: SOURCE.license,
      cfbdRecruitId: cfbdId,
      ...(rating != null ? { cfbdRating: rating } : {}),
      ...(stars != null ? { cfbdStars: stars } : {}),
      ...(ranking != null ? { cfbdRanking: ranking } : {}),
      note: "CFBD star/rating fields are provenance only — not shown as Takkle rank.",
    },
    trendingScore: 0,
    risingDelta: 0,
  };
}

function writeChunks(players, dir, prefix) {
  mkdirSync(dir, { recursive: true });
  const chunkNames = [];
  for (let c = 0; c * CHUNK_SIZE < players.length; c++) {
    const chunkName = `${prefix}${c}.json`;
    const slice = players.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);
    writeFileSync(join(dir, chunkName), JSON.stringify(slice));
    chunkNames.push(chunkName);
  }
  const keep = new Set(chunkNames);
  for (const name of readdirSync(dir)) {
    if (!name.startsWith(prefix) || !name.endsWith(".json")) continue;
    if (!keep.has(name)) unlinkSync(join(dir, name));
  }
  return chunkNames;
}

function writeFixtureSample() {
  mkdirSync(SEED_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });
  const fixture = [];
  const manifest = {
    version: "1",
    generatedAt: new Date().toISOString(),
    playerCount: 0,
    schoolCount: 0,
    chunks: [],
    featuredSlug: null,
    isSynthetic: false,
    source: SOURCE,
    notes: [
      "Empty CFBD fixture — run npm run import:cfbd-recruits with CFBD_API_KEY set.",
      "Coverage: CFBD recruiting lists ranked/known prospects, not full varsity rosters.",
    ],
  };
  writeFileSync(SAMPLE_PATH, JSON.stringify(fixture, null, 2) + "\n");
  writeFileSync(SAMPLE_MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
  writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Wrote empty CFBD fixture to ${SAMPLE_PATH.replace(ROOT + "/", "")}`);
}

async function main() {
  loadEnvFiles();
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(RAW_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(SEED_DIR, { recursive: true });

  const hasRaw =
    existsSync(RAW_DIR) &&
    readdirSync(RAW_DIR).some((f) => /^recruits-\d+\.json$/.test(f));

  let rawByYear = new Map();

  if (args.skipDownload && hasRaw) {
    console.log("Using existing raw CFBD downloads (--skip-download)");
    for (const year of args.years) {
      const path = join(RAW_DIR, `recruits-${year}.json`);
      if (!existsSync(path)) {
        console.warn(`Missing raw file for ${year}, skipping`);
        continue;
      }
      rawByYear.set(year, JSON.parse(readFileSync(path, "utf8")));
    }
  } else {
    const key = (process.env.CFBD_API_KEY || "").trim();
    if (!key) {
      writeFixtureSample();
      requireApiKey(); // prints instructions + exits 1
    }
    for (const year of args.years) {
      const rows = await fetchYear(year, key, args.classification);
      const path = join(RAW_DIR, `recruits-${year}.json`);
      writeFileSync(path, JSON.stringify(rows));
      console.log(`  year ${year}: ${rows.length} recruits → ${path.replace(ROOT + "/", "")}`);
      rawByYear.set(year, rows);
      // Be polite to the free API
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  if (!rawByYear.size) {
    console.error("No recruit data loaded. Remove --skip-download or fetch years first.");
    process.exit(1);
  }

  const nces = loadNcesSchools();
  const schoolIndex = buildSchoolIndex(nces);
  const nowIso = new Date().toISOString();
  const slugCounts = new Map();
  const players = [];
  const schoolsUsed = new Map();
  let matchedSchools = 0;
  let stubSchools = 0;
  let skippedNoName = 0;

  const allRaw = [];
  for (const year of args.years) {
    const rows = rawByYear.get(year);
    if (rows) allRaw.push(...rows);
  }

  for (const rec of allRaw) {
    if (!rec?.name) {
      skippedNoName++;
      continue;
    }
    const stateCode = String(rec.stateProvince || rec.state_province || "")
      .trim()
      .toUpperCase();
    const schoolName = String(rec.school || "").trim() || "Unknown High School";
    const city = String(rec.city || "").trim();

    let school = matchSchool(schoolIndex, schoolName, stateCode, city);
    if (school) {
      matchedSchools++;
    } else {
      school = stubSchool(schoolName, stateCode || "US", city);
      stubSchools++;
    }
    schoolsUsed.set(school.id, school);

    players.push(toPlayer(rec, school, nowIso, slugCounts));
    if (args.limit && players.length >= args.limit) break;
  }

  // Stable order: class year desc, then name (no star-based ranking)
  players.sort((a, b) => {
    if (a.classYear !== b.classYear) return b.classYear - a.classYear;
    return a.displayName.localeCompare(b.displayName);
  });

  const chunkNames = writeChunks(players, OUT_DIR, "players-chunk-");

  // Also write a single combined file for simpler tooling
  writeFileSync(join(OUT_DIR, "players.json"), JSON.stringify(players));

  const sampleLimit = args.embedAll
    ? players.length
    : Math.max(0, args.sampleLimit ?? 100);
  const sample = players.slice(0, sampleLimit);
  writeFileSync(SAMPLE_PATH, JSON.stringify(sample, null, 2) + "\n");

  const fullManifest = {
    version: "1",
    generatedAt: nowIso,
    playerCount: players.length,
    schoolCount: schoolsUsed.size,
    chunks: chunkNames,
    featuredSlug: sample[0]?.slug ?? null,
    isSynthetic: false,
    source: SOURCE,
    years: args.years,
    classification: args.classification,
    filters: { limit: args.limit, sampleLimit, embedAll: args.embedAll },
    counts: {
      rawRecruits: allRaw.length,
      playersImported: players.length,
      sampleSize: sample.length,
      ncesSchoolsAvailable: nces.length,
      schoolsMatchedNces: matchedSchools,
      schoolsStubbed: stubSchools,
      skippedNoName,
    },
    outputs: {
      fullChunks: "data/cfbd/players-chunk-*.json",
      fullCombined: "data/cfbd/players.json",
      sample: "src/data/seed/players-cfbd-sample.json",
      raw: "data/cfbd/raw/",
    },
    notes: [
      "Full JSON under data/cfbd is gitignored — regenerate with this script.",
      "Star ratings are provenance-only; Tackle Score defaults to insufficient placeholders.",
      "CFBD covers ranked/known recruits (tip of recruiting iceberg), not full varsity rosters.",
      "Set TAKKLE_PLAYERS_SOURCE=cfbd to load CFBD sample/embedded players in the app.",
      "Use --embed-all to write the full import into the seed sample path for local UI.",
    ],
  };
  writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify(fullManifest, null, 2) + "\n");

  const sampleManifest = {
    ...fullManifest,
    playerCount: sample.length,
    chunks: ["players-cfbd-sample.json"],
    counts: {
      ...fullManifest.counts,
      playersImported: sample.length,
      fullPlayersAvailable: players.length,
    },
  };
  writeFileSync(SAMPLE_MANIFEST_PATH, JSON.stringify(sampleManifest, null, 2) + "\n");

  console.log(
    JSON.stringify(
      {
        players: players.length,
        sample: sample.length,
        schools: schoolsUsed.size,
        matchedNces: matchedSchools,
        stubSchools,
        years: args.years,
        samplePath: SAMPLE_PATH.replace(ROOT + "/", ""),
        fullDir: "data/cfbd/",
        switchApp: "TAKKLE_PLAYERS_SOURCE=cfbd",
      },
      null,
      2,
    ),
  );
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (process.argv.includes("--write-fixture-only")) {
  writeFixtureSample();
  process.exit(0);
}

if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}