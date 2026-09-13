#!/usr/bin/env node
/**
 * CA/West permitted ingestion: Cal-Hi + CHSAA (CO) + AIA (AZ) + UHSAA (UT).
 * Does not touch TX/SE adapters. Writes players.json for apply-ingestion-rpc.
 *
 * Usage:
 *   node scripts/ingest-west.mjs
 *   node scripts/ingest-west.mjs --batch2          # Cal-Hi historical + UHSAA only
 *   node scripts/ingest-west.mjs --calhi-historical
 *   node scripts/ingest-west.mjs --skip-aia
 *   node scripts/ingest-west.mjs --skip-uhsaa
 *   node scripts/ingest-west.mjs --aia-conferences-only
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const USER_AGENT =
  "TakkleIngestionBot/1.0 (+https://takkle.com; permitted public sources only)";

/** Hard recruiting window — alumni / null class years are never written. */
const RECRUIT_CLASS_MIN = 2027;
const RECRUIT_CLASS_MAX = 2031;

const args = {
  skipAia: process.argv.includes("--skip-aia"),
  aiaConferencesOnly: process.argv.includes("--aia-conferences-only"),
  skipCalhi: process.argv.includes("--skip-calhi"),
  skipChsaa: process.argv.includes("--skip-chsaa"),
  /** UHSAA academic all-state = graduating seniors → outside 2027–2031 until a 2027 season exists. */
  skipUhsaa: process.argv.includes("--skip-uhsaa") || !process.argv.includes("--include-uhsaa"),
  /** Only pull Cal-Hi seasons ≤2021 (already-applied recent lists skipped). */
  calhiHistoricalOnly: process.argv.includes("--calhi-historical"),
  /** Fast path: Cal-Hi historical + UHSAA only (no AIA/CHSAA). */
  batch2: process.argv.includes("--batch2"),
  /** Allow alumni/null class years (debug only). Default: recruit window only. */
  allowAllClasses: process.argv.includes("--allow-all-classes"),
};

function inRecruitWindow(p) {
  const y = p.classYear;
  return y != null && y >= RECRUIT_CLASS_MIN && y <= RECRUIT_CLASS_MAX;
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

function splitName(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function classFromGrade(grade, seasonEnd) {
  return seasonEnd + Math.max(0, 12 - grade);
}

const GRADE_MAP = {
  sr: 12,
  senior: 12,
  jr: 11,
  junior: 11,
  so: 10,
  soph: 10,
  sophomore: 10,
  fr: 9,
  frosh: 9,
  freshman: 9,
};

function gradeFromToken(raw) {
  if (!raw) return null;
  const token = String(raw).toLowerCase().replace(/\./g, "").trim();
  if (GRADE_MAP[token] != null) return GRADE_MAP[token];
  const n = Number(String(raw).replace(/\D/g, ""));
  return n >= 9 && n <= 12 ? n : null;
}

function normPos(raw) {
  if (!raw) return null;
  const p = String(raw).split(/[/,]/)[0].trim().toLowerCase();
  const map = {
    qb: "QB",
    rb: "RB",
    wr: "WR",
    te: "TE",
    ol: "OL",
    ot: "OL",
    og: "OL",
    c: "OL",
    dl: "DL",
    de: "DL",
    dt: "DL",
    lb: "LB",
    db: "DB",
    cb: "DB",
    s: "DB",
    k: "K",
    p: "P",
    ath: "ATH",
    "defensive backs": "DB",
    "defensive back": "DB",
    "defensive lineman": "DL",
    "defensive linemen": "DL",
    "offensive lineman": "OL",
    "offensive linemen": "OL",
    linebackers: "LB",
    linebacker: "LB",
    "running backs": "RB",
    "wide receivers": "WR",
    "receivers/tight ends": "WR",
    quarterbacks: "QB",
    kickers: "K",
    placekicker: "K",
    punters: "P",
    "kickoff returner": "ATH",
    "punt returner": "ATH",
    "long snapper": "ATH",
    "defensive utility/flex player": "ATH",
    "offensive utility/flex player": "ATH",
  };
  if (/conference|player of the year|coach/i.test(p)) return null;
  return map[p] || map[String(raw).trim().toLowerCase()] || null;
}

function decodeHtml(s) {
  return String(s)
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/<[^>]+>/g, "")
    .trim();
}

/** Seasons that can still yield class 2027+ underclassmen (Fr/So/Jr by season). */
const CALHI_LISTS = [
  { seasonEnd: 2026, url: "https://www.calhisports.com/2026/02/06/all-state-fb-2025-1st-team-offense/" },
  { seasonEnd: 2026, url: "https://www.calhisports.com/2026/02/06/all-state-fb-2025-1st-team-defense/" },
  { seasonEnd: 2026, url: "https://www.calhisports.com/2026/01/31/all-state-fb-2025-medium-schools/" },
  { seasonEnd: 2025, url: "https://www.calhisports.com/2025/02/09/all-state-fb-2024-1st-team-offense/" },
  { seasonEnd: 2025, url: "https://www.calhisports.com/2025/02/09/all-state-fb-2024-1st-team-defense/" },
  { seasonEnd: 2025, url: "https://www.calhisports.com/2025/02/05/all-state-fb-2024-medium-schools/" },
  { seasonEnd: 2024, url: "https://www.calhisports.com/2024/02/03/all-state-fb-2023-1st-team-offense/" },
  { seasonEnd: 2024, url: "https://www.calhisports.com/2024/02/03/all-state-fb-2023-1st-team-defense/" },
  { seasonEnd: 2024, url: "https://www.calhisports.com/2024/01/27/all-state-fb-2023-medium-schools/" },
];

/** Pre-2024 archives cannot produce class 2027+ (even freshmen graduate ≤2026). */
const CALHI_HISTORICAL_ONLY = [];

const UHSAA_LISTS = [
  { seasonEnd: 2026, url: "https://www.uhsaa.org/academicallstate/2025-26/Fall/25FB.pdf" },
  { seasonEnd: 2025, url: "https://www.uhsaa.org/academicallstate/2024-25/Fall/24FB.pdf" },
  { seasonEnd: 2024, url: "https://www.uhsaa.org/academicallstate/2023-24/23FB.pdf" },
  { seasonEnd: 2023, url: "https://www.uhsaa.org/academicallstate/2022-23/22FB.pdf" },
  { seasonEnd: 2022, url: "https://www.uhsaa.org/academicallstate/2021-22/21FB.pdf" },
  { seasonEnd: 2021, url: "https://www.uhsaa.org/academicallstate/2020-21/2020%20Football%20Chart%20to%20Post.pdf" },
  { seasonEnd: 2020, url: "https://www.uhsaa.org/academicallstate/2019-20/2019%20Football%20Chart%20to%20Post.pdf" },
  { seasonEnd: 2019, url: "https://www.uhsaa.org/academicallstate/2018%20Football%20Chart%20to%20Post.pdf" },
];

const UHSAA_SCHOOLS = [
  "Intermountain Christian", "American Leadership", "Layton Christian", "Providence Hall",
  "Judge Memorial", "Summit Academy", "Gunnison Valley", "Crimson Cliffs", "Maple Mountain",
  "Mountain Crest", "Mountain Ridge", "Mountain View", "North Sanpete", "Pleasant Grove",
  "Spanish Fork", "American Fork", "Copper Hills", "Corner Canyon", "Desert Hills",
  "Green Canyon", "Northridge", "North Sevier", "North Summit", "Salem Hills", "Snow Canyon",
  "South Sevier", "South Summit", "Canyon View", "Cedar Valley", "Juan Diego", "Pine View",
  "Wasatch Academy", "West Field", "West Jordan", "Woods Cross", "Bonneville", "Box Elder",
  "Bountiful", "Clearfield", "Enterprise", "Farmington", "Grantsville", "Herriman", "Hillcrest",
  "Hurricane", "Monticello", "Park City", "Richfield", "Ridgeline", "Sky View", "Springville",
  "Stansbury", "Timpanogos", "Viewmont", "Water Canyon", "Bryce Valley", "Bear River",
  "Ben Lomond", "Cottonwood", "Maeser Prep", "Merit Academy", "Waterford", "Altamont",
  "Bingham", "Brighton", "Duchesne", "Highland", "Kearns", "Olympus", "Parowan", "Payson",
  "Riverton", "San Juan", "Skyridge", "Skyline", "Syracuse", "Taylorsville", "Timpview",
  "Westlake", "Beaver", "Carbon", "Cyprus", "Delta", "Dixie", "Emery", "Fremont", "Granger",
  "Hunter", "Jordan", "Kanab", "Layton", "Logan", "Manti", "Milford", "Millard", "Morgan",
  "Murray", "Ogden", "Orem", "Provo", "Tabiona", "Tooele", "Uintah", "Union", "Wasatch",
  "Weber", "Wayne", "Alta", "Cedar", "Davis", "East", "Grand", "Juab", "Lehi", "Manila",
  "Piute", "Rich", "Roy", "West",
].sort((a, b) => b.length - a.length);

/** CHSAA seasons that can yield class 2027+ underclassmen. */
const CHSAA_LISTS = [
  {
    seasonEnd: 2026,
    url: "https://chsaanow.com/news/2025/12/15/football-2025-chsaa-all-state-teams-announced",
  },
  {
    seasonEnd: 2025,
    url: "https://chsaanow.com/news/2024/12/17/football-2024-all-state-teams-announced",
  },
  {
    seasonEnd: 2024,
    url: "https://chsaanow.com/news/2023/12/13/all-state-football-teams-for-the-2023-season",
  },
];

const AIA_CONFS = [
  { id: 12070, label: "6A" },
  { id: 12074, label: "5A" },
  { id: 12078, label: "4A" },
  { id: 12082, label: "3A" },
  { id: 12086, label: "2A" },
  { id: 12096, label: "1A" },
];

const AIA_REGIONS = [
  { id: 12161, label: "6A Central" },
  { id: 12169, label: "6A Desert Valley" },
  { id: 12159, label: "6A East Valley" },
  { id: 12157, label: "6A Fiesta" },
  { id: 12167, label: "6A Southeast" },
  { id: 12155, label: "6A Southern" },
  { id: 12101, label: "5A Central Valley" },
  { id: 12103, label: "5A Desert West" },
  { id: 12105, label: "5A Metro" },
  { id: 12107, label: "5A Northeast Valley" },
  { id: 12109, label: "5A Northwest" },
  { id: 12111, label: "5A San Tan" },
  { id: 12113, label: "5A Sonoran" },
  { id: 12115, label: "5A Southern" },
  { id: 12217, label: "4A Black Canyon" },
  { id: 12219, label: "4A Copper Sky" },
  { id: 12221, label: "4A Desert Sky" },
  { id: 12223, label: "4A Desert Southwest" },
  { id: 12227, label: "4A Gila" },
  { id: 12229, label: "4A Grand Canyon" },
  { id: 12231, label: "4A Kino" },
  { id: 12233, label: "4A Skyline" },
  { id: 12235, label: "4A Southwest" },
  { id: 12239, label: "4A West Valley" },
  { id: 12137, label: "3A East" },
  { id: 12139, label: "3A Metro" },
  { id: 12141, label: "3A Mountain" },
  { id: 12143, label: "3A North" },
  { id: 12145, label: "3A West" },
  { id: 12099, label: "2A East" },
  { id: 12260, label: "2A Metro 1" },
  { id: 12262, label: "2A Metro 2" },
  { id: 12264, label: "2A Metro 3" },
  { id: 12266, label: "2A Metro 4" },
  { id: 12268, label: "2A Metro 5" },
  { id: 12270, label: "2A North 1" },
  { id: 12272, label: "2A North 2" },
  { id: 12276, label: "2A South 1" },
  { id: 12280, label: "2A South 2" },
  { id: 12243, label: "1A East" },
  { id: 12245, label: "1A North" },
  { id: 12247, label: "1A South" },
  { id: 12249, label: "1A West" },
];

const AIA_YEARS = [
  { yearParam: 2024, seasonEnd: 2025 },
  { yearParam: 2023, seasonEnd: 2024 },
  { yearParam: 2022, seasonEnd: 2023 },
  { yearParam: 2021, seasonEnd: 2022 },
  { yearParam: 2020, seasonEnd: 2021 },
];

function parseCalHi(html, spec) {
  // Pages often mention Gold Club for 2nd/3rd teams while still listing public 1st-team content.
  const fullyPaywalled =
    /Gold Club members only|This is a post for our Gold Club/i.test(html) &&
    !/FIRST TEAM ALL-STATE|1st Team/i.test(html);
  if (fullyPaywalled) {
    return { players: [], paywalled: true };
  }
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
  const players = [];
  const seen = new Set();
  const add = (nameRaw, schoolRaw, posRaw, classTok) => {
    if (/click here|cal-hi|photo|gold club|follow @|first team|second team|third team/i.test(nameRaw))
      return;
    if (/^(left|right|elite|previously announced)$/i.test(schoolRaw)) return;
    const school = schoolRaw.replace(/,.*$/, "").trim();
    const { firstName, lastName } = splitName(nameRaw.trim());
    if (!firstName || !lastName || school.length < 2) return;
    if (/^[A-Z]{1,4}$/.test(firstName) && !posRaw) {
      // Position leaked into name — handled by detailed regex
    }
    // Drop caption junk: "Ohio State. WR …" style leftovers
    if (/^(Ohio|X\.com|Washington|Oregon|SMU|CalHiSports)\.?$/i.test(firstName)) return;
    if (/\b(WR|OL|RB|QB|DL|LB|DB|TE|PK|ATH)\b/.test(firstName)) return;
    const g = classTok ? GRADE_MAP[classTok.toLowerCase().replace(/\./g, "")] : null;
    const key = `${firstName}|${lastName}|${school}|${spec.seasonEnd}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    players.push({
      firstName,
      lastName,
      position: normPos(posRaw),
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
  };

  // "WR Chris Henry Jr. (Mater Dei, Santa Ana) 6-5, 200, Sr."
  const detailed =
    /(?:^|[.\s])([A-Z]{1,4}|Quarterback|Running Back|Wide Receiver|Tight End|Linebacker|Cornerback|Safety|Kicker|Punter|Athlete|OL|DL|DB|LB|RB|WR|TE|QB|PK)\s+([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)+)\s+\(([^)]+)\)\s+(?:\d-\d{1,2},\s*)?(?:\d{2,3},\s*)?(Sr|Jr|So|Fr|Senior|Junior|Sophomore|Freshman)\.?/gi;
  let m;
  while ((m = detailed.exec(text))) {
    add(m[2], m[3], m[1], m[4]);
  }
  // Medium-school style fallback with grade token preferred
  const loose =
    /([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)+)\s+\(([^)]{3,50})\)(?:\s*,?\s*(?:\d-\d{1,2})?(?:\s*,?\s*\d{2,3})?\s*,?\s*(Sr|Jr|So|Fr|Senior|Junior|Soph\.?|Sophomore|Freshman))/g;
  while ((m = loose.exec(text))) {
    if (/click here|cal-hi|photo|gold club|follow @/i.test(m[0])) continue;
    if (/^[A-Z]{2,4}$/.test(m[1])) continue;
    add(m[1], m[2], null, m[3]);
  }
  return { players, paywalled: false };
}

async function fetchCalHi(listOverride) {
  const players = [];
  const errors = [];
  const blocked = [];
  const lists = listOverride || CALHI_LISTS;
  for (const spec of lists) {
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
        console.log(`  Cal-Hi PAYWALL ${spec.url}`);
      } else {
        console.log(`  Cal-Hi ${spec.seasonEnd}: ${parsed.players.length} from ${spec.url}`);
        players.push(...parsed.players);
      }
      // Cal-Hi crawl-delay is heavy; historical batch uses 3s, full uses 10s
      await new Promise((r) => setTimeout(r, args.calhiHistoricalOnly || args.batch2 ? 3000 : 10000));
    } catch (e) {
      errors.push(`${spec.url}: ${e.message}`);
    }
  }
  return { players, errors, blocked };
}

function parseUhsaaLine(line) {
  const out = [];
  // Collapse dotted leader charts ("Name .... School") into plain text.
  let rest = line.replace(/\.{2,}/g, " ").replace(/\s+/g, " ").trim();
  const nameOk = /^[A-Z][a-zA-Z.'\-]+(?:\s+[A-Z][a-zA-Z.'\-]+){1,3}$/;
  while (rest) {
    rest = rest.trim();
    if (!rest) break;
    let best = null;
    for (const school of UHSAA_SCHOOLS) {
      const idx = rest.indexOf(school);
      if (idx <= 0) continue;
      const before = rest.slice(0, idx).trim().replace(/^[,.\-\s]+|[,.\-\s]+$/g, "");
      const after = rest.slice(idx + school.length);
      const boundaryOk =
        idx + school.length === rest.length || /\s/.test(rest[idx + school.length] || "");
      if (!before || !boundaryOk || !nameOk.test(before)) continue;
      // Prefer leftmost school; at the same index prefer longest (Westlake > West).
      if (
        !best ||
        idx < best.idx ||
        (idx === best.idx && school.length > best.len)
      ) {
        best = { name: before, school, after, idx, len: school.length };
      }
    }
    if (!best) break;
    out.push({ name: best.name, school: best.school });
    rest = best.after.trim().replace(/^[,.\-\s]+/, "");
  }
  return out;
}

function parseUhsaaText(text, spec) {
  const players = [];
  const seen = new Set();
  const skip =
    /Academic All-State|ACTIVITIES ASSOCIATION|^\d{4}-\d{2}|Football|^\dA$|8-Player|cont\.|Chart to Post|UTAH HIGH SCHOOL/i;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || skip.test(line)) continue;
    for (const pair of parseUhsaaLine(line)) {
      const { firstName, lastName } = splitName(pair.name);
      if (!firstName || !lastName) continue;
      const school = pair.school.trim();
      const key = `${firstName}|${lastName}|${school}|${spec.seasonEnd}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      players.push({
        firstName,
        lastName,
        position: null,
        classYear: spec.seasonEnd,
        schoolName: school,
        stateCode: "UT",
        seasonYear: spec.seasonEnd,
        sourceUrl: spec.url,
        sourceName: "UHSAA Academic All-State Football",
        sourceType: "state_association",
        sourceState: "UT",
        sourceSchool: school,
      });
    }
  }
  return players;
}

async function fetchUhsaa() {
  const { spawnSync } = await import("node:child_process");
  const { writeFileSync: wfs, unlinkSync, readFileSync: rfs } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const players = [];
  const errors = [];
  for (const spec of UHSAA_LISTS) {
    try {
      const res = await fetch(spec.url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/pdf" },
        redirect: "follow",
      });
      if (!res.ok) {
        errors.push(`${spec.url} HTTP ${res.status}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const pdfPath = join(tmpdir(), `uhsaa-${spec.seasonEnd}.pdf`);
      const txtPath = join(tmpdir(), `uhsaa-${spec.seasonEnd}.txt`);
      wfs(pdfPath, buf);
      const py = spawnSync(
        "python3",
        [
          "-c",
          `from pypdf import PdfReader\nr=PdfReader(${JSON.stringify(pdfPath)})\nopen(${JSON.stringify(txtPath)},'w').write('\\n'.join((p.extract_text() or '') for p in r.pages))`,
        ],
        { encoding: "utf8" },
      );
      if (py.status !== 0) {
        errors.push(`${spec.url} pdf extract: ${py.stderr || py.stdout}`);
        try {
          unlinkSync(pdfPath);
        } catch {}
        continue;
      }
      const text = rfs(txtPath, "utf8");
      const parsed = parseUhsaaText(text, spec);
      console.log(`  UHSAA ${spec.seasonEnd}: ${parsed.length} from ${spec.url}`);
      if (!parsed.length) errors.push(`${spec.url} parsed 0`);
      players.push(...parsed);
      try {
        unlinkSync(pdfPath);
        unlinkSync(txtPath);
      } catch {}
      await new Promise((r) => setTimeout(r, 800));
    } catch (e) {
      errors.push(`${spec.url}: ${e.message}`);
    }
  }
  return { players, errors, blocked: [] };
}

function parseChsaa(html, spec) {
  const players = [];
  const seen = new Set();
  for (const table of html.matchAll(/<table[\s\S]*?<\/table>/gi)) {
    for (const row of table[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
      const cells = [...row[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
        decodeHtml(m[1]),
      );
      if (cells.length < 4) continue;
      const [name, school, pos, yr] = cells;
      if (!name || /^player$/i.test(name) || !school || /^school$/i.test(school)) continue;
      const { firstName, lastName } = splitName(name);
      if (!firstName || !lastName) continue;
      const g = gradeFromToken(yr);
      const key = `${firstName}|${lastName}|${school}|${spec.seasonEnd}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      players.push({
        firstName,
        lastName,
        position: normPos(pos),
        classYear: g ? classFromGrade(g, spec.seasonEnd) : null,
        schoolName: school,
        stateCode: "CO",
        seasonYear: spec.seasonEnd,
        sourceUrl: spec.url,
        sourceName: "CHSAA All-State Football",
        sourceType: "state_association",
        sourceState: "CO",
        sourceSchool: school,
      });
    }
  }
  return players;
}

async function fetchChsaa() {
  const players = [];
  const errors = [];
  for (const spec of CHSAA_LISTS) {
    try {
      const res = await fetch(spec.url, {
        headers: { "User-Agent": USER_AGENT },
        redirect: "follow",
      });
      if (!res.ok) {
        errors.push(`${spec.url} HTTP ${res.status}`);
        continue;
      }
      const html = await res.text();
      const parsed = parseChsaa(html, spec);
      console.log(`  CHSAA ${spec.seasonEnd}: ${parsed.length} from ${spec.url}`);
      if (!parsed.length) errors.push(`${spec.url} parsed 0`);
      players.push(...parsed);
      await new Promise((r) => setTimeout(r, 800));
    } catch (e) {
      errors.push(`${spec.url}: ${e.message}`);
    }
  }
  return { players, errors, blocked: [] };
}

function parseAia(html, seasonEnd, url, tierLabel) {
  const players = [];
  const seen = new Set();
  // Nested </div>s break box-section span matching — extract column triples per group.
  const groupRe =
    /<div class="column recognition-group">([\s\S]*?)(?=<div class="column recognition-group">|$)/gi;
  let g;
  while ((g = groupRe.exec(html))) {
    const chunk = g[1];
    const titleM = chunk.match(/<div class="title">\s*([^<]+)/i);
    const honor = titleM ? titleM[1].replace(/\s+/g, " ").trim() : "";
    if (/coach of the year/i.test(honor)) continue;
    const cols = [...chunk.matchAll(/<div class="column is-4">\s*(?:<div>)?\s*([^<\n]+)/gi)].map(
      (m) => m[1].replace(/\s+/g, " ").trim(),
    );
    for (let i = 0; i + 2 < cols.length; i += 3) {
      const [nameRaw, schoolRaw, posRaw] = [cols[i], cols[i + 1], cols[i + 2]];
      if (!nameRaw || !schoolRaw || /^name$/i.test(nameRaw)) continue;
      if (/^coach$/i.test(posRaw) || /coach/i.test(nameRaw)) continue;
      const { firstName, lastName } = splitName(nameRaw);
      if (!firstName || !lastName || schoolRaw.length < 2) continue;
      const school = schoolRaw.trim();
      const key = `${firstName}|${lastName}|${school}|${seasonEnd}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      players.push({
        firstName,
        lastName,
        position: normPos(posRaw),
        classYear: null,
        schoolName: school,
        stateCode: "AZ",
        seasonYear: seasonEnd,
        sourceUrl: url,
        sourceName: "AIA AZPreps365 Football Recognitions",
        sourceType: "state_association",
        sourceState: "AZ",
        sourceSchool: school,
        raw: { honor, tier: tierLabel },
      });
    }
  }
  return players;
}

async function fetchAia({ conferencesOnly }) {
  const tiers = conferencesOnly ? AIA_CONFS : [...AIA_CONFS, ...AIA_REGIONS];
  const players = [];
  const errors = [];
  const seen = new Set();
  for (const year of AIA_YEARS) {
    for (const tier of tiers) {
      const url = `https://azpreps365.com/recognitions/filter?activity=football&tier=${tier.id}&year=${year.yearParam}`;
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
          redirect: "follow",
        });
        if (!res.ok) {
          errors.push(`${url} HTTP ${res.status}`);
          await new Promise((r) => setTimeout(r, 10000));
          continue;
        }
        const html = await res.text();
        const parsed = parseAia(html, year.seasonEnd, url, tier.label);
        let added = 0;
        for (const p of parsed) {
          const key = `${p.firstName}|${p.lastName}|${p.schoolName}|${p.seasonYear}`.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          players.push(p);
          added += 1;
        }
        console.log(`  AIA ${year.yearParam} ${tier.label}: +${added} (page ${parsed.length})`);
        await new Promise((r) => setTimeout(r, 10000));
      } catch (e) {
        errors.push(`${url}: ${e.message}`);
        await new Promise((r) => setTimeout(r, 10000));
      }
    }
  }
  return { players, errors, blocked: [] };
}

function dedupe(players) {
  const byKey = new Map();
  let duplicatesDetected = 0;
  for (const p of players) {
    const key = `${p.firstName}|${p.lastName}|${p.schoolName}|${p.classYear ?? p.seasonYear}|${p.stateCode}`.toLowerCase();
    const existing = byKey.get(key);
    if (!existing || p.seasonYear > existing.seasonYear) byKey.set(key, p);
    else duplicatesDetected += 1;
  }
  return { players: [...byKey.values()], duplicatesDetected };
}

async function main() {
  if (args.batch2) {
    args.skipAia = true;
    args.skipChsaa = true;
    args.calhiHistoricalOnly = true;
    // Historical Cal-Hi / UHSAA seniors cannot yield 2027–2031; keep skipped.
    args.skipUhsaa = true;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = join(ROOT, "data/ingestion", `run-west-${stamp}`);
  mkdirSync(outDir, { recursive: true });
  console.log("CA/West permitted ingestion →", outDir);

  const all = [];
  const summary = { errors: [], blocked: [], bySource: {} };

  if (!args.skipChsaa) {
    console.log("Fetching CHSAA All-State (CO)...");
    const co = await fetchChsaa();
    all.push(...co.players);
    summary.errors.push(...co.errors);
    summary.bySource.chsaa = co.players.length;
  }

  if (!args.skipCalhi) {
    const calhiLists = args.calhiHistoricalOnly ? CALHI_HISTORICAL_ONLY : CALHI_LISTS;
    console.log(
      args.calhiHistoricalOnly
        ? `Fetching Cal-Hi historical public lists (CA, ${calhiLists.length} pages)...`
        : "Fetching Cal-Hi Sports public lists (CA)...",
    );
    const ca = await fetchCalHi(calhiLists);
    all.push(...ca.players);
    summary.errors.push(...ca.errors);
    summary.blocked.push(...ca.blocked);
    summary.bySource.calhi = ca.players.length;
  }

  if (!args.skipUhsaa) {
    console.log("Fetching UHSAA Academic All-State Football (UT)...");
    const ut = await fetchUhsaa();
    all.push(...ut.players);
    summary.errors.push(...ut.errors);
    summary.bySource.uhsaa = ut.players.length;
  }

  if (!args.skipAia) {
    console.log(
      args.aiaConferencesOnly
        ? "Fetching AIA conference recognitions (AZ)..."
        : "Fetching AIA conference+region recognitions (AZ)...",
    );
    const az = await fetchAia({ conferencesOnly: args.aiaConferencesOnly });
    all.push(...az.players);
    summary.errors.push(...az.errors);
    summary.bySource.aia = az.players.length;
  }

  const { players: deduped, duplicatesDetected } = dedupe(all);
  summary.duplicatesDetected = duplicatesDetected;
  summary.playersDiscovered = all.length;
  const players = args.allowAllClasses ? deduped : deduped.filter(inRecruitWindow);
  summary.playersOutsideWindow = deduped.length - players.length;
  summary.playersDeduped = players.length;
  summary.recruitWindow = { min: RECRUIT_CLASS_MIN, max: RECRUIT_CLASS_MAX };
  summary.classYears = {};
  for (const p of players) {
    const y = p.classYear ?? "null";
    summary.classYears[y] = (summary.classYears[y] || 0) + 1;
  }

  writeFileSync(join(outDir, "players.json"), JSON.stringify(players, null, 2));
  writeFileSync(join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(
    JSON.stringify(
      {
        outDir,
        players: players.length,
        droppedOutsideRecruitWindow: summary.playersOutsideWindow,
        bySource: summary.bySource,
        classYears: summary.classYears,
        errors: summary.errors.length,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
