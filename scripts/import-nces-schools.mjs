#!/usr/bin/env node
/**
 * Import U.S. public high schools from NCES Common Core of Data (CCD).
 *
 * Source: NCES CCD Public School Universe / Preliminary Directory (file 029)
 * Catalog: https://nces.ed.gov/ccd/files.asp
 * Listing: https://nces.ed.gov/ccd/psu_rev.asp
 * License: U.S. government work / public domain (NCES)
 *
 * Default download (2024–25 preliminary directory):
 *   https://nces.ed.gov/ccd/Data/zip/ccd_sch_029_2425_w_0a_051425.zip
 *
 * CCD covers public schools only (charters included). Private schools are
 * outside CCD (see PSS) and are not imported here.
 *
 * Usage:
 *   node scripts/import-nces-schools.mjs
 *   node scripts/import-nces-schools.mjs --skip-download
 *   node scripts/import-nces-schools.mjs --states CA,TX,FL,GA,OH --sample-limit 200
 *   node scripts/import-nces-schools.mjs --limit 500
 *   node scripts/import-nces-schools.mjs --sql
 *
 * Outputs:
 *   data/nces/schools.json              full filtered set (gitignored; large)
 *   data/nces/manifest.json             provenance + counts
 *   src/data/seed/schools-nces-sample.json  small curated sample for the repo
 *   data/nces/schools.sql               optional INSERT statements (--sql)
 */
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { execFileSync } from "node:child_process";
import { Readable } from "node:stream";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "data", "nces");
const RAW_DIR = join(OUT_DIR, "raw");
const SAMPLE_PATH = join(ROOT, "src", "data", "seed", "schools-nces-sample.json");

/** Stable, scriptable NCES CCD school directory ZIP (file 029 = directory). */
const DEFAULT_SOURCE = {
  schoolYear: "2024-25",
  label: "2024-25 CCD preliminary school directory (file 029)",
  zipUrl:
    "https://nces.ed.gov/ccd/Data/zip/ccd_sch_029_2425_w_0a_051425.zip",
  catalogUrl: "https://nces.ed.gov/ccd/files.asp",
  listingUrl: "https://nces.ed.gov/ccd/psu_rev.asp",
  license:
    "U.S. government work produced by NCES; generally public domain. Cite NCES CCD.",
};

const USER_AGENT = "TakkleNCESImporter/1.0 (+https://takkle.com; CCD public data)";

/** Prefer LEVEL High/Secondary; operational statuses that are still "real" schools. */
const HIGH_LEVELS = new Set(["High", "Secondary"]);
const OPEN_STATUS_CODES = new Set(["1", "3", "4", "5", "8"]); // Open, New, Added, Changed Boundary, Reopened
const OPEN_STATUS_TEXT = new Set([
  "open",
  "new",
  "added",
  "changed boundary/agency",
  "reopened",
]);

function parseArgs(argv) {
  const args = {
    skipDownload: false,
    sql: false,
    limit: null,
    sampleLimit: 250,
    states: null,
    zipUrl: DEFAULT_SOURCE.zipUrl,
    schoolYear: DEFAULT_SOURCE.schoolYear,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--skip-download") args.skipDownload = true;
    else if (a === "--sql") args.sql = true;
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--sample-limit") args.sampleLimit = Number(argv[++i]);
    else if (a === "--states") {
      args.states = new Set(
        argv[++i]
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
      );
    } else if (a === "--zip-url") args.zipUrl = argv[++i];
    else if (a === "--year") args.schoolYear = argv[++i];
    else if (a === "--help" || a === "-h") {
      console.log(`See header comment in ${fileURLToPath(import.meta.url)}`);
      process.exit(0);
    }
  }
  return args;
}

/** Minimal RFC4180 CSV parse (handles quoted fields and commas). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cols) => {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = cols[j] ?? "";
    }
    return obj;
  });
}

function slugify(name) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Deterministic UUID (SHA-1 based, version-5 shaped) from NCES ID. */
function uuidFromNces(ncessch) {
  const hash = createHash("sha1")
    .update(`takkle.nces.school.${ncessch}`)
    .digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function isOperational(row) {
  const code = String(row.SY_STATUS ?? "").trim();
  const text = String(row.SY_STATUS_TEXT ?? "")
    .trim()
    .toLowerCase();
  if (OPEN_STATUS_CODES.has(code)) return true;
  if (OPEN_STATUS_TEXT.has(text)) return true;
  return false;
}

function isHighSchool(row) {
  const level = String(row.LEVEL ?? "").trim();
  if (HIGH_LEVELS.has(level)) return true;
  // Fallback: "Other" schools that clearly span secondary grades
  const gslo = String(row.GSLO ?? "").trim().toUpperCase();
  const gshi = String(row.GSHI ?? "").trim().toUpperCase();
  const loNum = Number(gslo.replace(/\D/g, "")) || (gslo === "KG" ? 0 : NaN);
  const hiNum = Number(gshi.replace(/\D/g, "")) || (gshi === "KG" ? 0 : NaN);
  if (level === "Other" && Number.isFinite(loNum) && Number.isFinite(hiNum)) {
    return loNum >= 9 && hiNum >= 12;
  }
  return false;
}

function yes(value) {
  const v = String(value ?? "").trim().toUpperCase();
  return v === "YES" || v === "Y" || v === "1";
}

async function downloadZip(url, destPath) {
  console.log(`Downloading ${url}`);
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Download failed: HTTP ${res.status} ${res.statusText}`);
  }
  const body = res.body;
  if (!body) throw new Error("Empty response body");
  await pipeline(Readable.fromWeb(body), createWriteStream(destPath));
  console.log(`Saved ${destPath}`);
}

function extractZip(zipPath, destDir) {
  mkdirSync(destDir, { recursive: true });
  execFileSync("unzip", ["-o", zipPath, "-d", destDir], { stdio: "inherit" });
}

function findCsv(dir) {
  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".csv"));
  if (!files.length) throw new Error(`No CSV found in ${dir}`);
  // Prefer directory file 029 if multiple
  const preferred = files.find((f) => /029|_sch_/i.test(f)) || files[0];
  return join(dir, preferred);
}

function sqlEscape(s) {
  return String(s ?? "").replace(/'/g, "''");
}

function toSchoolRecord(row, slug) {
  const ncesId = String(row.NCESSCH ?? "").trim();
  const name = String(row.SCH_NAME ?? "").trim();
  const stateCode = String(row.LSTATE || row.ST || row.MSTATE || "")
    .trim()
    .toUpperCase();
  const city = String(row.LCITY || row.MCITY || "").trim();
  const county = String(row.NMCNTY || row.CNTY || "").trim() || undefined;
  const website = String(row.WEBSITE ?? "").trim();

  return {
    id: uuidFromNces(ncesId),
    name,
    slug,
    city,
    stateCode,
    ...(county ? { county } : {}),
    region: stateCode,
    ncesId,
    websiteUrl: website || undefined,
    isCharter: yes(row.CHARTER_TEXT) || String(row.CHARTER_TEXT).toLowerCase() === "yes",
    schoolType: String(row.SCH_TYPE_TEXT || row.SCH_TYPE || "").trim() || undefined,
    level: String(row.LEVEL ?? "").trim() || undefined,
    gradeLow: String(row.GSLO ?? "").trim() || undefined,
    gradeHigh: String(row.GSHI ?? "").trim() || undefined,
    leaName: String(row.LEA_NAME ?? "").trim() || undefined,
    isSynthetic: false,
    provenance: {
      sourceName: "NCES Common Core of Data (CCD)",
      sourceType: "nces_ccd",
      sourceUrl: DEFAULT_SOURCE.catalogUrl,
      dataOrigin: "manual_import",
      schoolYear: String(row.SCHOOL_YEAR || DEFAULT_SOURCE.schoolYear).trim(),
      license: DEFAULT_SOURCE.license,
    },
  };
}

function schoolQuality(s) {
  let score = 0;
  if (s.schoolType === "Regular School") score += 10;
  if (s.level === "High") score += 5;
  if (s.level === "Secondary") score += 3;
  if (!s.isCharter) score += 1;
  const n = s.name.toLowerCase();
  if (/\bhigh\b/.test(n)) score += 2;
  if (/alternative|juvenile|hospital|special|continuation|virtual|online/.test(n)) {
    score -= 8;
  }
  return score;
}

function pickSample(schools, sampleLimit, preferredStates) {
  if (!sampleLimit || sampleLimit <= 0) return [];
  const preferred = preferredStates?.size
    ? preferredStates
    : new Set(["CA", "TX", "FL", "GA", "OH", "AL", "LA", "PA", "NC", "NJ"]);
  const byState = new Map();
  for (const s of schools) {
    if (!byState.has(s.stateCode)) byState.set(s.stateCode, []);
    byState.get(s.stateCode).push(s);
  }
  for (const list of byState.values()) {
    list.sort((a, b) => schoolQuality(b) - schoolQuality(a) || a.name.localeCompare(b.name));
  }
  const sample = [];
  const perPreferred = Math.max(8, Math.floor(sampleLimit / preferred.size));
  for (const st of preferred) {
    const list = byState.get(st) || [];
    sample.push(...list.slice(0, perPreferred));
    if (sample.length >= sampleLimit) break;
  }
  if (sample.length < sampleLimit) {
    const rest = [...schools].sort(
      (a, b) => schoolQuality(b) - schoolQuality(a) || a.name.localeCompare(b.name),
    );
    for (const s of rest) {
      if (sample.some((x) => x.id === s.id)) continue;
      sample.push(s);
      if (sample.length >= sampleLimit) break;
    }
  }
  return sample.slice(0, sampleLimit);
}

function writeSql(schools, path) {
  const lines = [
    "-- Generated by scripts/import-nces-schools.mjs",
    "-- NCES CCD public domain / U.S. government work",
    "BEGIN;",
    `INSERT INTO takkle.data_sources (name, source_type, base_url, robots_allowed, license_notes)`,
    `VALUES ('NCES Common Core of Data (CCD)', 'nces_ccd', '${sqlEscape(DEFAULT_SOURCE.catalogUrl)}', true, '${sqlEscape(DEFAULT_SOURCE.license)}')`,
    `ON CONFLICT DO NOTHING;`,
    "",
  ];
  for (const s of schools) {
    lines.push(
      `INSERT INTO takkle.schools (id, name, slug, city, state_code, county, region, website_url, nces_id, is_synthetic)`,
      `VALUES ('${s.id}', '${sqlEscape(s.name)}', '${sqlEscape(s.slug)}', '${sqlEscape(s.city)}', '${sqlEscape(s.stateCode)}', ${s.county ? `'${sqlEscape(s.county)}'` : "NULL"}, '${sqlEscape(s.region)}', ${s.websiteUrl ? `'${sqlEscape(s.websiteUrl)}'` : "NULL"}, '${sqlEscape(s.ncesId)}', false)`,
      `ON CONFLICT (slug) DO UPDATE SET`,
      `  name = EXCLUDED.name,`,
      `  city = EXCLUDED.city,`,
      `  state_code = EXCLUDED.state_code,`,
      `  county = EXCLUDED.county,`,
      `  website_url = EXCLUDED.website_url,`,
      `  nces_id = EXCLUDED.nces_id,`,
      `  is_synthetic = false,`,
      `  updated_at = now();`,
      "",
    );
  }
  lines.push("COMMIT;");
  writeFileSync(path, lines.join("\n"));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(RAW_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(dirname(SAMPLE_PATH), { recursive: true });

  const zipName = args.zipUrl.split("/").pop() || "ccd_sch_directory.zip";
  let zipPath = join(RAW_DIR, zipName);
  const extractDir = join(RAW_DIR, "extracted");

  // Accept an already-downloaded ZIP under a shorter alias name.
  if (!existsSync(zipPath)) {
    const alt = readdirSync(RAW_DIR).find(
      (f) => f.toLowerCase().endsWith(".zip") && /029|directory|ccd_sch/i.test(f),
    );
    if (alt) zipPath = join(RAW_DIR, alt);
  }

  const hasCsv =
    existsSync(extractDir) &&
    readdirSync(extractDir).some((f) => f.toLowerCase().endsWith(".csv"));

  if (args.skipDownload && (existsSync(zipPath) || hasCsv)) {
    if (!hasCsv && existsSync(zipPath)) {
      extractZip(zipPath, extractDir);
    } else {
      console.log(`Using existing extract in ${extractDir}`);
    }
  } else {
    await downloadZip(args.zipUrl, zipPath);
    extractZip(zipPath, extractDir);
  }

  const csvPath = findCsv(extractDir);
  console.log(`Parsing ${csvPath}`);
  const rows = parseCsv(readFileSync(csvPath, "utf8"));
  console.log(`Rows in file: ${rows.length.toLocaleString()}`);

  const slugCounts = new Map();
  const schools = [];
  let skippedClosed = 0;
  let skippedNonHs = 0;
  let skippedState = 0;

  for (const row of rows) {
    if (!isOperational(row)) {
      skippedClosed++;
      continue;
    }
    if (!isHighSchool(row)) {
      skippedNonHs++;
      continue;
    }
    const stateCode = String(row.LSTATE || row.ST || row.MSTATE || "")
      .trim()
      .toUpperCase();
    if (args.states && !args.states.has(stateCode)) {
      skippedState++;
      continue;
    }
    const ncesId = String(row.NCESSCH ?? "").trim();
    const name = String(row.SCH_NAME ?? "").trim();
    if (!ncesId || !name || !stateCode) continue;

    let base = `${slugify(name)}-${stateCode.toLowerCase()}` || `school-${stateCode.toLowerCase()}`;
    const count = (slugCounts.get(base) || 0) + 1;
    slugCounts.set(base, count);
    const slug = count === 1 ? base : `${base}-${ncesId.slice(-6)}`;

    schools.push(toSchoolRecord(row, slug));
    if (args.limit && schools.length >= args.limit) break;
  }

  schools.sort((a, b) =>
    a.stateCode === b.stateCode
      ? a.name.localeCompare(b.name)
      : a.stateCode.localeCompare(b.stateCode),
  );

  const fullPath = join(OUT_DIR, "schools.json");
  writeFileSync(fullPath, JSON.stringify(schools));

  const sample = pickSample(schools, args.sampleLimit, args.states);
  writeFileSync(SAMPLE_PATH, JSON.stringify(sample, null, 2) + "\n");

  const manifest = {
    version: "1",
    generatedAt: new Date().toISOString(),
    schoolYear: args.schoolYear,
    source: DEFAULT_SOURCE,
    zipUrl: args.zipUrl,
    csvFile: csvPath.split("/").pop(),
    filters: {
      levels: [...HIGH_LEVELS],
      operationalOnly: true,
      states: args.states ? [...args.states] : null,
      limit: args.limit,
    },
    counts: {
      sourceRows: rows.length,
      schoolsImported: schools.length,
      sampleSize: sample.length,
      skippedClosed,
      skippedNonHs,
      skippedState,
    },
    outputs: {
      full: "data/nces/schools.json",
      sample: "src/data/seed/schools-nces-sample.json",
      sql: args.sql ? "data/nces/schools.sql" : null,
    },
    notes: [
      "Full JSON is gitignored — regenerate locally with this script.",
      "Synthetic seed schools.json remains the backbone for demo players.",
      "Set TAKKLE_SCHOOLS_SOURCE=nces to load the NCES sample in app school helpers.",
    ],
  };
  writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

  if (args.sql) {
    const sqlPath = join(OUT_DIR, "schools.sql");
    writeSql(schools, sqlPath);
    console.log(`Wrote SQL ${sqlPath}`);
  }

  console.log(
    JSON.stringify(
      {
        schools: schools.length,
        sample: sample.length,
        fullPath,
        samplePath: SAMPLE_PATH,
        skippedClosed,
        skippedNonHs,
        skippedState,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
