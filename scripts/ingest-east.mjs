#!/usr/bin/env node
/**
 * East / SE / Midwest permitted honor-roll ingestion.
 * States: PA, NC*, SC, LA*, MS*, TN*, MI*, IL, IN, VA*, NJ*, FL*, plus stretch GA.
 * * = skipped or CSV-only when robots/WAF block.
 *
 * Usage: node scripts/ingest-east.mjs [--out DIR]
 */
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const UA =
  "TakkleIngestionBot/1.0 (+https://takkle.com; permitted public sources only)";

function parseArgs(argv) {
  const args = { outDir: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") args.outDir = argv[++i];
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

function normalizeName(s) {
  return String(s || "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function splitDisplayName(full) {
  const parts = normalizeName(full).split(" ").filter(Boolean);
  if (parts.length < 2) return { firstName: "", lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function classFromGrade(grade, seasonEndYear) {
  // Sr=12 graduates that spring → classYear = seasonEndYear
  const offset = 12 - grade;
  return seasonEndYear + offset;
}

function normalizePosition(pos) {
  if (!pos) return undefined;
  const p = String(pos).toUpperCase().replace(/[^A-Z]/g, "");
  const map = {
    QB: "QB",
    RB: "RB",
    FB: "RB",
    WR: "WR",
    TE: "TE",
    OL: "OL",
    OT: "OL",
    OG: "OL",
    OC: "OL",
    C: "OL",
    G: "OL",
    T: "OL",
    DL: "DL",
    DE: "DL",
    DT: "DL",
    NT: "DL",
    EDGE: "DL",
    LB: "LB",
    ILB: "LB",
    OLB: "LB",
    DB: "DB",
    CB: "DB",
    S: "DB",
    FS: "DB",
    SS: "DB",
    K: "K",
    P: "P",
    PK: "K",
    ATH: "ATH",
    ATL: "ATH",
    AP: "ATH",
  };
  return map[p] || undefined;
}

async function robotsAllows(url) {
  try {
    const u = new URL(url);
    const res = await fetch(`${u.origin}/robots.txt`, {
      headers: { "User-Agent": UA },
    });
    if (!res.ok) return { allowed: true, notes: `robots HTTP ${res.status}` };
    const body = await res.text();
    const lines = body.split(/\r?\n/);
    let inStar = false;
    const allows = [];
    const disallows = [];
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
    const path = u.pathname + u.search;
    const matchLen = (rules) => {
      let best = -1;
      for (const r of rules) {
        if (r === "") continue;
        if (r === "/" || path.startsWith(r)) best = Math.max(best, r.length);
      }
      return best;
    };
    const a = matchLen(allows);
    const d = matchLen(disallows);
    if (a < 0 && d < 0) return { allowed: true, notes: "no matching rules" };
    return {
      allowed: a >= d,
      notes: a >= d ? "allowed" : "blocked by robots",
    };
  } catch (e) {
    return { allowed: true, notes: `robots unreachable: ${e.message}` };
  }
}

function pdfStreamText(buf) {
  // Prefer FlateDecode inflate (IHSFCA / modern PDFs); fall back to raw Tj/TJ.
  const raw = buf.toString("latin1");
  const chunks = [];
  const streamRe = /stream\r?\n([\s\S]*?)endstream/g;
  let sm;
  while ((sm = streamRe.exec(raw)) !== null) {
    let body = sm[1];
    if (body.startsWith("\r\n")) body = body.slice(2);
    else if (body.startsWith("\n")) body = body.slice(1);
    const b = Buffer.from(body, "latin1");
    let decoded = null;
    for (const opts of [{}, { windowBits: -15 }]) {
      try {
        decoded = inflateSync(b, opts).toString("latin1");
        break;
      } catch {
        /* try next */
      }
    }
    const src = decoded || body;
    for (const t of src.match(/\((?:\\.|[^\\)])*\)\s*Tj/g) || []) {
      const m = t.match(/\(([\s\S]*)\)\s*Tj/);
      if (m) chunks.push(m[1].replace(/\\([nrt\\()])/g, "$1"));
    }
    for (const block of src.match(/\[([\s\S]*?)\]\s*TJ/g) || []) {
      for (const part of block.match(/\((?:\\.|[^\\)])*\)/g) || []) {
        chunks.push(part.slice(1, -1).replace(/\\([nrt\\()])/g, "$1"));
      }
    }
  }
  return chunks.join("\n");
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h\d|li|tr|td|th)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#8217;|&apos;|&#x27;/gi, "'")
    .replace(/&#8211;|&#8212;|&ndash;|&mdash;/gi, "-")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\r/g, "");
}

async function fetchText(url, { accept = "text/html,*/*" } = {}) {
  const decision = await robotsAllows(url);
  if (!decision.allowed) {
    return { ok: false, blocked: true, notes: decision.notes, text: null };
  }
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: accept },
    redirect: "follow",
  });
  if (!res.ok) {
    return { ok: false, blocked: false, notes: `HTTP ${res.status}`, text: null };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("pdf") || url.toLowerCase().endsWith(".pdf")) {
    return { ok: true, blocked: false, notes: "pdf", text: pdfStreamText(buf), buf };
  }
  return {
    ok: true,
    blocked: false,
    notes: "html",
    text: htmlToText(buf.toString("utf8")),
    html: buf.toString("utf8"),
  };
}

function makePlayer({
  firstName,
  lastName,
  schoolName,
  stateCode,
  position,
  classYear,
  gradeLevel,
  seasonYear,
  sourceUrl,
  sourceName,
  sourceType = "state_association",
}) {
  const fn = normalizeName(firstName);
  const ln = normalizeName(lastName);
  const school = normalizeName(schoolName);
  if (!fn || !ln || school.length < 2) return null;
  if (/coach|player of the year|honorable mention|all-state|committee/i.test(`${fn} ${ln}`))
    return null;
  return {
    firstName: fn,
    lastName: ln,
    position: normalizePosition(position),
    classYear: classYear ?? undefined,
    gradeLevel: gradeLevel ?? undefined,
    schoolName: school,
    stateCode,
    seasonYear,
    sourceUrl,
    sourceName,
    sourceType,
    sourceState: stateCode,
    sourceSchool: school,
  };
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

/** Parse IFCA markdown / HTML table rows: | POS | First | Last | School | Gr | */
function parseIfcaTables(text, seasonEndYear, sourceUrl) {
  const players = [];
  const seen = new Set();
  const rowRe =
    /\|\s*([A-Z]{1,4}(?:-[A-Z])?)\s*\|\s*([A-Za-z.'\-]+)\s*\|\s*([A-Za-z.'\-]+(?:\s+[A-Za-z.'\-]+)?)\s*\|\s*([^|]+?)\s*\|\s*(Sr|Jr|So|Fr|Soph(?:omore)?|Senior|Junior|Freshman)\b/gi;
  let m;
  while ((m = rowRe.exec(text)) !== null) {
    const pos = m[1];
    const first = m[2];
    const last = m[3];
    const school = m[4].replace(/\s+/g, " ").trim();
    const g = GRADE_MAP[m[5].toLowerCase().replace(/\./g, "")];
    const key = `${first}|${last}|${school}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const p = makePlayer({
      firstName: first,
      lastName: last,
      schoolName: school,
      stateCode: "IN",
      position: pos,
      gradeLevel: g,
      classYear: g ? classFromGrade(g, seasonEndYear) : undefined,
      seasonYear: seasonEndYear,
      sourceUrl,
      sourceName: "Indiana Football Coaches Association All-State",
    });
    if (p) players.push(p);
  }

  // Also parse "FirstName\nLastName\nSchool\nSr" vertical dumps from markdown conversion
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const posSet = new Set([
    "OL", "TE", "QB", "WR", "RB", "DL", "LB", "DB", "K", "P", "ATH", "AT-L", "ATL",
  ]);
  for (let i = 0; i < lines.length - 4; i++) {
    if (!posSet.has(lines[i].toUpperCase().replace("–", "-"))) continue;
    const pos = lines[i];
    const first = lines[i + 1];
    const last = lines[i + 2];
    const school = lines[i + 3];
    const gradeTok = lines[i + 4];
    if (!/^[A-Z][a-z]/.test(first) || !/^[A-Z][a-z]/.test(last)) continue;
    if (/^(Pos|First|Last|School|Gr|Ht|Wt|Offense|Defense)$/i.test(first)) continue;
    if (!/^(Sr|Jr|So|Fr|Senior|Junior|Sophomore|Freshman)$/i.test(gradeTok)) continue;
    const g = GRADE_MAP[gradeTok.toLowerCase()];
    const key = `${first}|${last}|${school}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const p = makePlayer({
      firstName: first,
      lastName: last,
      schoolName: school,
      stateCode: "IN",
      position: pos,
      gradeLevel: g,
      classYear: g ? classFromGrade(g, seasonEndYear) : undefined,
      seasonYear: seasonEndYear,
      sourceUrl,
      sourceName: "Indiana Football Coaches Association All-State",
    });
    if (p) players.push(p);
  }
  return players;
}

/**
 * IHSFCA PDF tokens after FlateDecode:
 * 1A, First, Last, POS, YR, HT, WT, SCHOOL, COACH
 */
function parseIhsfcaText(text, seasonEndYear, sourceUrl) {
  const players = [];
  const seen = new Set();
  const tokens = text
    .split(/\n+/)
    .map((t) => t.trim())
    .filter(Boolean);

  for (let i = 0; i < tokens.length - 8; i++) {
    const klass = tokens[i].replace(/\s+/g, "");
    if (!/^(1A|2A|3A|4A|5A|6A|7A|8A|8Man)$/i.test(klass)) continue;
    const first = tokens[i + 1];
    const last = tokens[i + 2];
    const posRaw = tokens[i + 3];
    const yr = tokens[i + 4];
    const schoolTok = tokens[i + 7];
    if (!/^[A-Z][A-Za-z.'-]/.test(first) || !/^[A-Z][A-Za-z.'-]/.test(last)) continue;
    if (!/^[A-Z]{1,4}(?:\/[A-Z]{1,4})*$/.test(posRaw)) continue;
    if (!/^(9|10|11|12)$/.test(yr)) continue;
    if (/^(Player|Pos|YR|HT|WT|SCHOOL|COACH|Class)$/i.test(first)) continue;
    const school = normalizeName(schoolTok).replace(/\s+High School$/i, "").replace(/\s+Township High School$/i, "").trim();
    if (school.length < 2) continue;
    const key = `${first}|${last}|${school}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const gradeNum = Number(yr);
    const p = makePlayer({
      firstName: normalizeName(first),
      lastName: normalizeName(last),
      schoolName: school,
      stateCode: "IL",
      position: posRaw.split("/")[0],
      gradeLevel: gradeNum,
      classYear: classFromGrade(gradeNum, seasonEndYear),
      seasonYear: seasonEndYear,
      sourceUrl,
      sourceName: "Illinois High School Football Coaches Association All-State",
    });
    if (p) players.push(p);
  }
  return players;
}

/**
 * HSFA / PA writers lines:
 * "Matt Bodnar, Notre Dame-Green Pond - 6-1, 185 junior"
 */
function parsePaWritersText(text, seasonEndYear, sourceUrl) {
  const players = [];
  const seen = new Set();
  let currentPos;
  const posMap = [
    [/^quarterback$/i, "QB"],
    [/^running back$/i, "RB"],
    [/^wide receiver$/i, "WR"],
    [/^tight end$/i, "TE"],
    [/^offensive line$/i, "OL"],
    [/^defensive line$/i, "DL"],
    [/^linebacker$/i, "LB"],
    [/^defensive back$/i, "DB"],
    [/^(kicker|punter|athlete|utility|all-purpose|specialist)$/i, "ATH"],
  ];

  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line || line.length > 140) continue;
    for (const [re, pos] of posMap) {
      if (re.test(line)) {
        currentPos = pos;
        break;
      }
    }
    const m = line.match(
      /^([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)+),\s*([A-Za-z0-9 .'\-\/&]+?)\s*-\s*\d-\d{1,2},\s*\d{2,3}\s+(senior|junior|sophomore|freshman)\b/i,
    );
    if (!m) continue;
    const name = normalizeName(m[1]);
    const school = normalizeName(m[2]);
    const gradeTok = m[3];
    if (/coach|player of the year|all-state/i.test(name)) continue;
    const { firstName, lastName } = splitDisplayName(name);
    const key = `${firstName}|${lastName}|${school}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const g = GRADE_MAP[gradeTok.toLowerCase()];
    const p = makePlayer({
      firstName,
      lastName,
      schoolName: school,
      stateCode: "PA",
      position: currentPos,
      gradeLevel: g,
      classYear: g ? classFromGrade(g, seasonEndYear) : undefined,
      seasonYear: seasonEndYear,
      sourceUrl,
      sourceName: "Pennsylvania Football Writers All-State",
      sourceType: "media_public",
    });
    if (p) players.push(p);
  }
  return players;
}

/** Generic "Name, School" / "Name - School - Senior" media list parser */
function parseGenericAllState(
  text,
  { stateCode, seasonEndYear, sourceUrl, sourceName, sourceType = "media_public" },
) {
  const players = [];
  const seen = new Set();
  let currentPos;
  const posMap = [
    [/quarterback|\bQB\b/i, "QB"],
    [/running back|\bRB\b/i, "RB"],
    [/wide receiver|\bWR\b/i, "WR"],
    [/tight end|\bTE\b/i, "TE"],
    [/offensive line|offensive lineman|\bOL\b/i, "OL"],
    [/defensive line|defensive lineman|\bDL\b/i, "DL"],
    [/linebacker|\bLB\b/i, "LB"],
    [/defensive back|\bDB\b|secondary/i, "DB"],
    [/kicker|punter|athlete|all-purpose|specialist/i, "ATH"],
  ];

  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line || line.length > 140) continue;
    for (const [re, pos] of posMap) {
      if (re.test(line) && line.length < 50) {
        currentPos = pos;
        break;
      }
    }

    let name;
    let school;
    let gradeTok;

    let m = line.match(
      /^([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)+)\s*[-–,]\s*([A-Za-z0-9 .'\-\/&]+?)\s*[-–,]\s*(Senior|Junior|Sophomore|Freshman|Sr|Jr|So|Fr)\b/i,
    );
    if (m) {
      name = m[1];
      school = m[2];
      gradeTok = m[3];
    } else {
      m = line.match(
        /^([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)+)\s*[,–-]\s*([A-Za-z0-9 .'\-\/&]+)$/,
      );
      if (m) {
        name = m[1];
        school = m[2];
      }
    }
    if (!name || !school) continue;
    name = normalizeName(name);
    school = normalizeName(school);
    if (/coach|player of the year|all-state|offense|defense|team|overall/i.test(name))
      continue;
    const { firstName, lastName } = splitDisplayName(name);
    const key = `${firstName}|${lastName}|${school}|${seasonEndYear}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const g = gradeTok ? GRADE_MAP[gradeTok.toLowerCase().replace(/\./g, "")] : undefined;
    const p = makePlayer({
      firstName,
      lastName,
      schoolName: school,
      stateCode,
      position: currentPos,
      gradeLevel: g,
      classYear: g ? classFromGrade(g, seasonEndYear) : undefined,
      seasonYear: seasonEndYear,
      sourceUrl,
      sourceName,
      sourceType,
    });
    if (p) players.push(p);
  }
  return players;
}

async function fetchIhsfca(outSources) {
  const errors = [];
  const blocked = [];
  const players = [];
  const base =
    "https://cdn-app.teamlinkt.com/media/association_data/37868/site_data/images/library";
  const files = [
    ["documents/2025_IHSFCA_All-State_-_1A.pdf", "1A"],
    ["documents/2025_IHSFCA_All-State_-_2A.pdf", "2A"],
    ["documents/3A.pdf", "3A"],
    ["images/4A.pdf", "4A"],
    ["images/5A.pdf", "5A"],
    ["images/6A.pdf", "6A"],
    ["images/7A.pdf", "7A"],
    ["images/8A.pdf", "8A"],
    ["images/8_Man_FB.pdf", "8Man"],
    ["documents/1AHM.pdf", "1AHM"],
    ["documents/2AHM.pdf", "2AHM"],
    ["documents/3AHM.pdf", "3AHM"],
    ["documents/4AHM.pdf", "4AHM"],
    ["documents/6AHM.pdf", "6AHM"],
    ["documents/7AHM.pdf", "7AHM"],
    ["documents/8AHM.pdf", "8AHM"],
    ["documents/8ManHM.pdf", "8ManHM"],
  ];
  const seasonEndYear = 2025;
  for (const [path, label] of files) {
    const url = `${base}/${path}`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/pdf,*/*" },
      });
      if (!res.ok) {
        errors.push(`IHSFCA ${label} HTTP ${res.status}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const text = pdfStreamText(buf);
      const snap = join(outSources, `${label}.txt`);
      writeFileSync(snap, text);
      const parsed = parseIhsfcaText(text, seasonEndYear, url);
      console.log(`  IHSFCA ${label}: ${parsed.length} players (chars ${text.length})`);
      if (!parsed.length) errors.push(`IHSFCA ${label} parsed 0`);
      players.push(...parsed);
      await new Promise((r) => setTimeout(r, 350));
    } catch (e) {
      errors.push(`IHSFCA ${label}: ${e.message}`);
    }
  }
  return { players, errors, blocked };
}

async function fetchIfca(outSources) {
  const errors = [];
  const blocked = [];
  const url = "https://ifca.net/all-state-teams/";
  const decision = await robotsAllows(url);
  if (!decision.allowed) {
    blocked.push(`${url} (${decision.notes})`);
  }
  let text = "";
  const localMd = join(ROOT, "data/ingestion/sources/indiana/2025-ifca-all-state.md");
  if (existsSync(localMd)) {
    text = readFileSync(localMd, "utf8");
  }
  if (!decision.allowed === false || true) {
    try {
      const got = await fetchText(url);
      if (got.ok && got.text && got.text.length > 500) {
        text = got.text;
        writeFileSync(join(outSources, "2025-ifca-all-state.txt"), text);
      } else if (!text) {
        errors.push(`IFCA fetch failed: ${got.notes}`);
      }
    } catch (e) {
      if (!text) errors.push(`IFCA: ${e.message}`);
    }
  }
  // Prefer markdown snapshot (cleaner tables) + live text
  const fromMd = existsSync(localMd)
    ? parseIfcaTables(readFileSync(localMd, "utf8"), 2026, url)
    : [];
  const fromLive = text ? parseIfcaTables(text, 2026, url) : [];
  const byKey = new Map();
  for (const p of [...fromMd, ...fromLive]) {
    byKey.set(`${p.firstName}|${p.lastName}|${p.schoolName}`.toLowerCase(), p);
  }
  const players = [...byKey.values()];
  console.log(`  IFCA: ${players.length} players (md ${fromMd.length}, live ${fromLive.length})`);
  if (!players.length) errors.push("IFCA parsed 0");
  return { players, errors, blocked };
}

async function fetchPaWriters(outSources) {
  const errors = [];
  const blocked = [];
  const players = [];
  const specs = [
    // 2024 season → seasonEnd 2025
    ...[1, 2, 3, 4, 5, 6].map((c) => ({
      seasonEnd: 2025,
      url: `https://highschoolfootballamerica.com/2024-class-${c}a-pennsylvania-football-writers-all-state-team/`,
    })),
    {
      seasonEnd: 2023,
      url: "https://highschoolfootballamerica.com/pennsylvania-football-writers-announce-all-state-high-school-football-teams/",
    },
    {
      seasonEnd: 2021,
      url: "https://highschoolfootballamerica.com/pennsylvania-football-writers-1a-all-state-high-school-football-team/",
    },
    {
      seasonEnd: 2020,
      url: "https://highschoolfootballamerica.com/2019-pennsylvania-football-writers-all-state-high-school-football-teams/",
    },
  ];

  // Discover more year pages via tag archive
  const tagUrl = "https://highschoolfootballamerica.com/tag/pennsylvania-all-state-team/";
  try {
    const tag = await fetchText(tagUrl);
    if (tag.ok && tag.html) {
      const hrefs = [...tag.html.matchAll(/href="(https:\/\/highschoolfootballamerica\.com\/[^"]*pennsylvania[^"]*)"/gi)].map(
        (m) => m[1],
      );
      for (const href of new Set(hrefs)) {
        if (specs.some((s) => s.url === href)) continue;
        const ym = href.match(/\/(20\d{2})-/);
        const seasonEnd = ym ? Number(ym[1]) + (href.includes("2024") ? 1 : 0) : 2024;
        // Rough: 2024-class → 2025 season end already covered
        if (/all-state/i.test(href)) {
          specs.push({
            seasonEnd: href.includes("2024-class")
              ? 2025
              : href.includes("2023")
                ? 2024
                : href.includes("2022")
                  ? 2023
                  : href.includes("2021")
                    ? 2022
                    : href.includes("2020")
                      ? 2021
                      : href.includes("2019")
                        ? 2020
                        : seasonEnd,
            url: href,
          });
        }
      }
    }
  } catch (e) {
    errors.push(`PA tag archive: ${e.message}`);
  }

  const seenUrl = new Set();
  for (const spec of specs) {
    if (seenUrl.has(spec.url)) continue;
    seenUrl.add(spec.url);
    const got = await fetchText(spec.url);
    if (got.blocked) {
      blocked.push(`${spec.url} (${got.notes})`);
      continue;
    }
    if (!got.ok || !got.text) {
      errors.push(`${spec.url} ${got.notes}`);
      continue;
    }
    const slug = slugify(spec.url).slice(-60);
    writeFileSync(join(outSources, `${spec.seasonEnd}-${slug}.txt`), got.text);
    const parsed = parsePaWritersText(got.text, spec.seasonEnd, spec.url);
    console.log(`  PA writers ${spec.seasonEnd}: ${parsed.length} from ${spec.url.slice(40)}`);
    if (!parsed.length) errors.push(`${spec.url} parsed 0`);
    players.push(...parsed);
    await new Promise((r) => setTimeout(r, 500));
  }
  return { players, errors, blocked };
}

async function fetchScfca(outSources) {
  const errors = [];
  const blocked = [];
  const players = [];
  // lexingtonchronicle public article with SCFCA lists
  const specs = [
    {
      seasonEnd: 2025,
      url: "https://www.lexingtonchronicle.com/stories/lexington-county-football-players-selected-to-2024-all-state-teams,113534",
      name: "South Carolina Football Coaches Association All-State (Lexington Chronicle mirror)",
    },
  ];
  for (const spec of specs) {
    const got = await fetchText(spec.url);
    if (got.blocked) {
      blocked.push(`${spec.url} (${got.notes})`);
      continue;
    }
    if (!got.ok || !got.text) {
      errors.push(`SC ${got.notes}`);
      continue;
    }
    writeFileSync(join(outSources, `scfca-${spec.seasonEnd}.txt`), got.text);
    const parsed = parseGenericAllState(got.text, {
      stateCode: "SC",
      seasonEndYear: spec.seasonEnd,
      sourceUrl: spec.url,
      sourceName: "South Carolina Football Coaches Association All-State",
      sourceType: "state_association",
    });
    console.log(`  SCFCA ${spec.seasonEnd}: ${parsed.length}`);
    players.push(...parsed);
    if (!parsed.length) errors.push(`SCFCA ${spec.seasonEnd} parsed 0`);
  }
  return { players, errors, blocked };
}

/**
 * Dash lists: "QB – Name, School, Sr., 6-1, 205" / "OL - Name, School" / MVP variants
 */
function parseDashPosLists(
  text,
  { stateCode, seasonEndYear, sourceUrl, sourceName, sourceType = "media_public" },
) {
  const players = [];
  const seen = new Set();
  const posAlt =
    "QB|RB|WR|TE|OL|DL|LB|DB|K|P|ATH|FB|C|G|T|DE|DT|CB|S|FS|SS|OT|OG|OC|ILB|OLB|NT|PK|AP";
  const simpleRe = new RegExp(
    `^(${posAlt})\\s*[-–]\\s*([A-Z][A-Za-z.'\\-]+(?:\\s+[A-Z][A-Za-z.'\\-]+)*(?:\\s+Jr\\.?)?),\\s*(.+?)(?:,\\s*(Sr|Jr|So|Fr)\\.?)?(?:,\\s*\\d-\\d{1,2},\\s*\\d{2,3})?\\*?$`,
    "i",
  );
  const noCommaRe = new RegExp(
    `^(${posAlt})\\s*[-–]\\s*([A-Z][A-Za-z.'\\-]+(?:\\s+[A-Z][A-Za-z.'\\-]+)+)\\s+([A-Z][A-Za-z0-9 .'\\-/&]{2,})$`,
    "i",
  );

  for (const raw of text.split("\n")) {
    let line = raw
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .replace(/[–—]/g, "-")
      .trim();
    if (!line || line.length > 160) continue;
    if (/coach of the year|player of the year|honorable mention only/i.test(line))
      continue;

    let pos;
    let name;
    let school;
    let gradeTok;

    let m = line.match(simpleRe);
    if (m) {
      pos = m[1];
      name = m[2];
      school = m[3];
      gradeTok = m[4];
    } else {
      m = line.match(noCommaRe);
      if (m) {
        pos = m[1];
        name = m[2];
        school = m[3];
      } else {
        m = line.match(
          /^(?:Offensive|Defensive)\s+MVP\s*-\s*([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)+)(?:,\s*([A-Z]{1,4}))?,\s*(.+)$/i,
        );
        if (m) {
          name = m[1];
          pos = m[2];
          school = m[3];
        }
      }
    }
    if (!name || !school) continue;
    name = normalizeName(name);
    school = normalizeName(school).replace(/\*+$/, "").trim();
    if (school.length < 2) continue;
    if (/^(sr|jr|so|fr)\.?$/i.test(school)) continue;
    const { firstName, lastName } = splitDisplayName(name);
    if (!firstName || !lastName) continue;
    const key = `${firstName}|${lastName}|${school}|${seasonEndYear}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const g = gradeTok ? GRADE_MAP[gradeTok.toLowerCase().replace(/\./g, "")] : undefined;
    const p = makePlayer({
      firstName,
      lastName,
      schoolName: school,
      stateCode,
      position: pos,
      gradeLevel: g,
      classYear: g ? classFromGrade(g, seasonEndYear) : undefined,
      seasonYear: seasonEndYear,
      sourceUrl,
      sourceName,
      sourceType,
    });
    if (p) players.push(p);
  }
  return players;
}

/** Yahoo IL: "Jacob Bell, Sr., QB, 6-2, 205, Naperville North" */
function parseYahooIllinois(text, seasonEndYear, sourceUrl) {
  const players = [];
  const seen = new Set();
  const re =
    /^([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)+),\s*(Sr|Jr|So|Fr)\.?,\s*([A-Z]{1,4}(?:\/[A-Z]{1,4})*),\s*\d-\d{1,2},\s*\d{2,3},\s*(.+)$/;
  for (const raw of text.split("\n")) {
    const line = raw
      .replace(/&#x27;|&apos;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
    const m = line.match(re);
    if (!m) continue;
    const name = normalizeName(m[1]);
    const g = GRADE_MAP[m[2].toLowerCase()];
    const pos = m[3].split("/")[0];
    const school = normalizeName(m[4]);
    const { firstName, lastName } = splitDisplayName(name);
    const key = `${firstName}|${lastName}|${school}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const p = makePlayer({
      firstName,
      lastName,
      schoolName: school,
      stateCode: "IL",
      position: pos,
      gradeLevel: g,
      classYear: g ? classFromGrade(g, seasonEndYear) : undefined,
      seasonYear: seasonEndYear,
      sourceUrl,
      sourceName: "Yahoo Sports Illinois All-State Football",
      sourceType: "media_public",
    });
    if (p) players.push(p);
  }
  return players;
}

/** HSFA IHSFCA: "Evan Roper, LB, Barrington, Sr." */
function parseIhsfcaMedia(text, seasonEndYear, sourceUrl) {
  const players = [];
  const seen = new Set();
  const re =
    /^([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)+),\s*([A-Z]{1,4}(?:\/[A-Z]{1,4})*),\s*(.+?),\s*(Sr|Jr|So|Fr)\.?$/;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s+/g, " ").trim();
    const m = line.match(re);
    if (!m) continue;
    const name = normalizeName(m[1]);
    const pos = m[2].split("/")[0];
    const school = normalizeName(m[3]);
    const g = GRADE_MAP[m[4].toLowerCase()];
    const { firstName, lastName } = splitDisplayName(name);
    const key = `${firstName}|${lastName}|${school}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const p = makePlayer({
      firstName,
      lastName,
      schoolName: school,
      stateCode: "IL",
      position: pos,
      gradeLevel: g,
      classYear: g ? classFromGrade(g, seasonEndYear) : undefined,
      seasonYear: seasonEndYear,
      sourceUrl,
      sourceName: "Illinois High School Football Coaches Association All-State",
    });
    if (p) players.push(p);
  }
  return players;
}

/** TN 2024 semicolon clumps: "Miles Reding, Kirkwood, So.; Will Jones, Maryville, So." */
function parseTnSemicolonLists(text, seasonEndYear, sourceUrl) {
  const players = [];
  const seen = new Set();
  const chunkRe =
    /([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)+),\s*([^,;]+?),\s*(Sr|Jr|So|Fr)\.?/g;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
    if (!line.includes(",")) continue;
    let m;
    while ((m = chunkRe.exec(line)) !== null) {
      const name = normalizeName(m[1]);
      const school = normalizeName(m[2]);
      const g = GRADE_MAP[m[3].toLowerCase()];
      if (/coach|player of the year|all-state/i.test(name)) continue;
      const { firstName, lastName } = splitDisplayName(name);
      const key = `${firstName}|${lastName}|${school}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const p = makePlayer({
        firstName,
        lastName,
        schoolName: school,
        stateCode: "TN",
        gradeLevel: g,
        classYear: g ? classFromGrade(g, seasonEndYear) : undefined,
        seasonYear: seasonEndYear,
        sourceUrl,
        sourceName: "Tennessee Sports Writers Association All-State",
        sourceType: "media_public",
      });
      if (p) players.push(p);
    }
  }
  return players;
}

/** MI: "Tre Redding – Wide Receiver – Warren Michigan Collegiate" */
function parseMiNamePosSchool(text, seasonEndYear, sourceUrl) {
  const players = [];
  const seen = new Set();
  const posWord = {
    quarterback: "QB",
    "running back": "RB",
    "wide receiver": "WR",
    "tight end": "TE",
    "offensive line": "OL",
    "offensive lineman": "OL",
    "defensive line": "DL",
    "defensive lineman": "DL",
    linebacker: "LB",
    "defensive back": "DB",
    athlete: "ATH",
    kicker: "K",
    punter: "P",
  };
  const re =
    /^([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)+)\s*[-–]\s*([A-Za-z ]+?)\s*[-–]\s*(.+)$/;
  for (const raw of text.split("\n")) {
    const line = raw
      .replace(/&#8211;|&ndash;/g, "-")
      .replace(/\s+/g, " ")
      .trim();
    const m = line.match(re);
    if (!m) continue;
    const name = normalizeName(m[1]);
    const posRaw = m[2].trim().toLowerCase();
    const school = normalizeName(m[3]);
    const pos = posWord[posRaw] || normalizePosition(posRaw);
    if (!pos) continue;
    const { firstName, lastName } = splitDisplayName(name);
    const key = `${firstName}|${lastName}|${school}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const p = makePlayer({
      firstName,
      lastName,
      schoolName: school,
      stateCode: "MI",
      position: pos,
      seasonYear: seasonEndYear,
      sourceUrl,
      sourceName: "Michigan High School Football Coaches Association All-State",
      sourceType: "state_association",
    });
    if (p) players.push(p);
  }
  return players;
}

async function fetchHsfaExpansion(outSources) {
  const errors = [];
  const blocked = [];
  const players = [];
  const specs = [
    // Florida mirrors (floridahsfootball.com paywalled; HSFA public mirrors OK)
    ...[
      ["https://highschoolfootballamerica.com/florida-class-2a-all-state-high-school-football-team-from-floridahsfootball-com/", 2022],
      ["https://highschoolfootballamerica.com/floridahsfootball-com-releases-1a-all-state-high-school-football-teams/", 2022],
      ["https://highschoolfootballamerica.com/floridahsfootball-com-announces-4a-all-state-high-school-football-team/", 2022],
      ["https://highschoolfootballamerica.com/2021-floridahsfootball-com-5a-all-state-high-school-football-team/", 2022],
      ["https://highschoolfootballamerica.com/2021-6a-florida-all-state-high-school-football-team-from-floridahsfootball-com/", 2022],
      ["https://highschoolfootballamerica.com/floridahsfootball-com-announces-2021-class-7a-all-state-high-school-football-team/", 2022],
      ["https://highschoolfootballamerica.com/2021-florida-8a-all-state-high-school-football-team-from-floridahsfootball-comt/", 2022],
      ["https://highschoolfootballamerica.com/2021-florida-class-3a-all-state-high-school-football-team-from-floridahsfootball-com/", 2022],
      ["https://highschoolfootballamerica.com/floridahsfootball-coms-2020-class-1a-all-state-high-school-football-team/", 2021],
      ["https://highschoolfootballamerica.com/floridahsfootball-coms-2020-class-2a-high-school-football-all-state-team/", 2021],
      ["https://highschoolfootballamerica.com/floridahsfootball-coms-independent-all-state-high-school-football-team/", 2021],
    ].map(([url, seasonEnd]) => ({
      stateCode: "FL",
      seasonEnd,
      url,
      sourceName: "Florida HS Football (floridahsfootball.com)",
      sourceType: "media_public",
      parser: "dash",
    })),
    {
      stateCode: "TN",
      seasonEnd: 2024,
      url: "https://highschoolfootballamerica.com/tennessee-sports-writers-association-2023-all-state-high-school-football-teams/",
      sourceName: "Tennessee Sports Writers Association All-State",
      sourceType: "media_public",
      parser: "dash",
    },
    {
      stateCode: "TN",
      seasonEnd: 2020,
      url: "https://highschoolfootballamerica.com/2019-tennessee-sports-writers-association-all-state-high-school-football-teams/",
      sourceName: "Tennessee Sports Writers Association All-State",
      sourceType: "media_public",
      parser: "dash",
    },
    {
      stateCode: "TN",
      seasonEnd: 2025,
      url: "https://highschoolfootballamerica.com/tennessee-sports-writers-association-releases-2024-all-state-high-school-football-teams/",
      sourceName: "Tennessee Sports Writers Association All-State",
      sourceType: "media_public",
      parser: "tn_semi",
    },
    {
      stateCode: "LA",
      seasonEnd: 2025,
      url: "https://highschoolfootballamerica.com/louisiana-football-coaches-association-announce-2024-all-state-high-school-football-teams/",
      sourceName: "Louisiana Football Coaches Association All-State",
      sourceType: "state_association",
      parser: "dash",
    },
    {
      stateCode: "GA",
      seasonEnd: 2024,
      url: "https://highschoolfootballamerica.com/georgia-athletic-coaches-association-all-state-high-school-football-teams/",
      sourceName: "Georgia Athletic Coaches Association All-State",
      sourceType: "state_association",
      parser: "dash",
    },
    {
      stateCode: "IL",
      seasonEnd: 2022,
      url: "https://highschoolfootballamerica.com/2021-illinois-high-school-football-coaches-association-all-state-teams/",
      sourceName: "Illinois High School Football Coaches Association All-State",
      sourceType: "state_association",
      parser: "il_media",
    },
    {
      stateCode: "MI",
      seasonEnd: 2022,
      url: "https://highschoolfootballamerica.com/2021-michigan-high-school-football-coaches-association-all-state-teams/",
      sourceName: "Michigan High School Football Coaches Association All-State",
      sourceType: "state_association",
      parser: "mi",
    },
  ];

  for (const spec of specs) {
    const got = await fetchText(spec.url);
    if (got.blocked) {
      blocked.push(`${spec.url} (${got.notes})`);
      continue;
    }
    if (!got.ok || !got.text) {
      errors.push(`${spec.stateCode} ${got.notes || "fetch fail"} ${spec.url}`);
      continue;
    }
    const slug = slugify(spec.url).slice(-70);
    writeFileSync(
      join(outSources, `${spec.stateCode}-${spec.seasonEnd}-${slug}.txt`),
      got.text,
    );
    let parsed = [];
    if (spec.parser === "dash") {
      parsed = parseDashPosLists(got.text, {
        stateCode: spec.stateCode,
        seasonEndYear: spec.seasonEnd,
        sourceUrl: spec.url,
        sourceName: spec.sourceName,
        sourceType: spec.sourceType,
      });
    } else if (spec.parser === "tn_semi") {
      parsed = parseTnSemicolonLists(got.text, spec.seasonEnd, spec.url);
    } else if (spec.parser === "il_media") {
      parsed = parseIhsfcaMedia(got.text, spec.seasonEnd, spec.url);
    } else if (spec.parser === "mi") {
      parsed = parseMiNamePosSchool(got.text, spec.seasonEnd, spec.url);
    }
    console.log(
      `  HSFA ${spec.stateCode} ${spec.seasonEnd}: ${parsed.length} (${spec.parser})`,
    );
    if (!parsed.length) errors.push(`${spec.url} parsed 0`);
    players.push(...parsed);
    await new Promise((r) => setTimeout(r, 400));
  }
  return { players, errors, blocked };
}

async function fetchYahooIllinois(outSources) {
  const errors = [];
  const blocked = [];
  const url =
    "https://sports.yahoo.com/complete-list-2024-illinois-high-090804953.html";
  const got = await fetchText(url);
  if (got.blocked) return { players: [], errors, blocked: [`${url} (${got.notes})`] };
  if (!got.ok || !got.text) {
    return { players: [], errors: [`Yahoo IL ${got.notes}`], blocked };
  }
  writeFileSync(join(outSources, "yahoo-il-2024.txt"), got.text);
  const players = parseYahooIllinois(got.text, 2025, url);
  console.log(`  Yahoo IL 2024: ${players.length}`);
  if (!players.length) errors.push("Yahoo IL parsed 0");
  return { players, errors, blocked };
}

async function fetchOutsideTheHuddleIfca(outSources) {
  // Mirror of IFCA class lists — useful backup / prior year
  const errors = [];
  const blocked = [];
  const players = [];
  const specs = [
    {
      seasonEnd: 2025,
      url: "https://outsidethehuddle.net/2024/12/09/ifca-announces-2024-all-state-football-teams/",
    },
    {
      seasonEnd: 2026,
      url: "https://outsidethehuddle.net/2025/12/08/71641/",
    },
  ];
  for (const spec of specs) {
    const got = await fetchText(spec.url);
    if (got.blocked) {
      blocked.push(`${spec.url}`);
      continue;
    }
    if (!got.ok || !got.text) {
      errors.push(`OTH ${spec.seasonEnd} ${got.notes}`);
      continue;
    }
    writeFileSync(join(outSources, `oth-ifca-${spec.seasonEnd}.txt`), got.text);
    // Format: "OL Kameron Kauffman, senior, Warsaw" or "QB – Name, School"
    const local = [];
    const seen = new Set();
    const re =
      /\b(QB|RB|WR|TE|OL|DL|LB|DB|K|P|ATH|AT-LARGE|AT‑LARGE)\b[^A-Za-z]{0,20}([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)+)(?:,\s*(senior|junior|sophomore|freshman))?(?:,\s*([A-Za-z0-9 .'\-\/&]+))?/gi;
    let m;
    while ((m = re.exec(got.text)) !== null) {
      const pos = m[1];
      const name = normalizeName(m[2]);
      const gradeTok = m[3];
      let school = m[4] ? normalizeName(m[4]) : "";
      // alternate: "Name, senior, School" already captured; also "– Name, School"
      if (!school) continue;
      const { firstName, lastName } = splitDisplayName(name);
      const key = `${firstName}|${lastName}|${school}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const g = gradeTok ? GRADE_MAP[gradeTok.toLowerCase()] : undefined;
      const p = makePlayer({
        firstName,
        lastName,
        schoolName: school,
        stateCode: "IN",
        position: pos,
        gradeLevel: g,
        classYear: g ? classFromGrade(g, spec.seasonEnd) : undefined,
        seasonYear: spec.seasonEnd,
        sourceUrl: spec.url,
        sourceName: "Indiana Football Coaches Association All-State",
        sourceType: "state_association",
      });
      if (p) local.push(p);
    }
    // Also: "Name – School" lines under class headers from area summaries
    const more = parseGenericAllState(got.text, {
      stateCode: "IN",
      seasonEndYear: spec.seasonEnd,
      sourceUrl: spec.url,
      sourceName: "Indiana Football Coaches Association All-State",
      sourceType: "state_association",
    });
    for (const p of more) {
      const key = `${p.firstName}|${p.lastName}|${p.schoolName}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      local.push(p);
    }
    console.log(`  OTH/IFCA ${spec.seasonEnd}: ${local.length}`);
    players.push(...local);
    await new Promise((r) => setTimeout(r, 400));
  }
  return { players, errors, blocked };
}

function dedupePlayers(players) {
  const byKey = new Map();
  let duplicatesDetected = 0;
  for (const p of players) {
    const key = `${p.stateCode}|${p.firstName}|${p.lastName}|${slugify(p.schoolName)}|${p.classYear ?? ""}`.toLowerCase();
    const existing = byKey.get(key);
    if (!existing) byKey.set(key, p);
    else {
      duplicatesDetected += 1;
      if ((p.seasonYear || 0) > (existing.seasonYear || 0)) byKey.set(key, p);
    }
  }
  return { players: [...byKey.values()], duplicatesDetected };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir =
    args.outDir || join(ROOT, `data/ingestion/run-east-${stamp}`);
  mkdirSync(outDir, { recursive: true });
  mkdirSync(join(ROOT, "data/ingestion/sources/illinois"), { recursive: true });
  mkdirSync(join(ROOT, "data/ingestion/sources/pennsylvania"), {
    recursive: true,
  });
  mkdirSync(join(ROOT, "data/ingestion/sources/indiana"), { recursive: true });
  mkdirSync(join(ROOT, "data/ingestion/sources/southcarolina"), {
    recursive: true,
  });
  mkdirSync(join(ROOT, "data/ingestion/sources/florida"), { recursive: true });
  mkdirSync(join(ROOT, "data/ingestion/sources/tennessee"), {
    recursive: true,
  });
  mkdirSync(join(ROOT, "data/ingestion/sources/louisiana"), {
    recursive: true,
  });
  mkdirSync(join(ROOT, "data/ingestion/sources/georgia"), { recursive: true });
  mkdirSync(join(ROOT, "data/ingestion/sources/michigan"), {
    recursive: true,
  });

  const summary = {
    adapterKey: "east-midwest-se",
    schoolsDiscovered: 0,
    playersDiscovered: 0,
    playersImported: 0,
    duplicatesDetected: 0,
    errors: [],
    blockedSources: [
      "MaxPreps — robots Disallow",
      "HighSchoolOT (NC) — robots Disallow:/ for *",
      "VHSL.org — robots Disallow:/ for *",
      "nj.com — WAF/JS challenge (403)",
      "MLive (MI) — WAF/JS challenge (403)",
      "IndyStar / USA Today network — AI bot blocks; use IFCA.net instead",
      "floridahsfootball.com — membership paywall on all-state articles; use HSFA mirrors",
      "LHSAA online — robots Disallow:/",
      "CFBD_API_KEY unauthorized (401) — skipped",
    ],
    byState: {},
  };

  console.log("Fetching IHSFCA (IL) PDFs...");
  const il = await fetchIhsfca(join(ROOT, "data/ingestion/sources/illinois"));
  summary.errors.push(...il.errors);
  summary.blockedSources.push(...il.blocked);
  summary.byState.IL = { playersRaw: il.players.length };

  console.log("Fetching IFCA (IN)...");
  const ind = await fetchIfca(join(ROOT, "data/ingestion/sources/indiana"));
  summary.errors.push(...ind.errors);
  summary.blockedSources.push(...ind.blocked);

  console.log("Fetching OutsideTheHuddle IFCA mirrors...");
  const oth = await fetchOutsideTheHuddleIfca(
    join(ROOT, "data/ingestion/sources/indiana"),
  );
  summary.errors.push(...oth.errors);

  const inPlayers = [...ind.players, ...oth.players];
  summary.byState.IN = { playersRaw: inPlayers.length };

  console.log("Fetching PA Football Writers via HSFA...");
  const pa = await fetchPaWriters(
    join(ROOT, "data/ingestion/sources/pennsylvania"),
  );
  summary.errors.push(...pa.errors);
  summary.blockedSources.push(...pa.blocked);
  summary.byState.PA = { playersRaw: pa.players.length };

  console.log("Fetching SCFCA (SC)...");
  const sc = await fetchScfca(
    join(ROOT, "data/ingestion/sources/southcarolina"),
  );
  summary.errors.push(...sc.errors);
  summary.blockedSources.push(...sc.blocked);
  summary.byState.SC = { playersRaw: sc.players.length };

  console.log("Fetching HSFA expansion (FL/TN/LA/GA/IL/MI)...");
  const hsfa = await fetchHsfaExpansion(
    join(ROOT, "data/ingestion/sources/florida"),
  );
  // snapshots also written under florida/; copy-friendly by state prefix in filename
  summary.errors.push(...hsfa.errors);
  summary.blockedSources.push(...hsfa.blocked);

  console.log("Fetching Yahoo Illinois all-state...");
  const yahoo = await fetchYahooIllinois(
    join(ROOT, "data/ingestion/sources/illinois"),
  );
  summary.errors.push(...yahoo.errors);
  summary.blockedSources.push(...yahoo.blocked);

  const hsfaBy = {};
  for (const p of [...hsfa.players, ...yahoo.players]) {
    hsfaBy[p.stateCode] = (hsfaBy[p.stateCode] || 0) + 1;
  }
  Object.assign(summary.byState, {
    FL: { playersRaw: hsfaBy.FL || 0 },
    TN: { playersRaw: hsfaBy.TN || 0 },
    LA: { playersRaw: hsfaBy.LA || 0 },
    GA: { playersRaw: (hsfaBy.GA || 0) },
    MI: { playersRaw: hsfaBy.MI || 0 },
    IL: {
      playersRaw:
        (summary.byState.IL?.playersRaw || 0) +
        (hsfaBy.IL || 0) +
        yahoo.players.length,
    },
  });

  const all = [
    ...il.players,
    ...inPlayers,
    ...pa.players,
    ...sc.players,
    ...hsfa.players,
    ...yahoo.players,
  ];
  const deduped = dedupePlayers(all);
  summary.duplicatesDetected = deduped.duplicatesDetected;
  summary.playersDiscovered = all.length;
  summary.playersImported = deduped.players.length;

  writeFileSync(join(outDir, "players.json"), JSON.stringify(deduped.players, null, 2));
  writeFileSync(join(outDir, "schools.json"), "[]");
  writeFileSync(join(outDir, "summary.json"), JSON.stringify(summary, null, 2));

  const byState = {};
  for (const p of deduped.players) {
    byState[p.stateCode] = (byState[p.stateCode] || 0) + 1;
  }
  console.log("\nSummary");
  console.log(JSON.stringify({ ...summary, byStateFinal: byState }, null, 2));
  console.log(`Wrote ${deduped.players.length} players → ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
