#!/usr/bin/env node
/**
 * Deterministic seed generator for Takkle demo data.
 * Run: node scripts/generate-seed.mjs
 */
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../src/data/seed");
/** Initial review cap from product brief — do not auto-expand past this without review. */
const PLAYER_COUNT = 3000;
const CHUNK_SIZE = 500;
const SEED = 42;

const STATES = ["CA", "TX", "FL", "GA", "OH"];
const POSITIONS = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P", "ATH"];
const CLASS_YEARS = [2025, 2026, 2027, 2028, 2029];

const FIRST_NAMES = [
  "James", "Michael", "Marcus", "Jayden", "Tyler", "Brandon", "DeShawn", "Cameron",
  "Ethan", "Noah", "Liam", "Mason", "Logan", "Aiden", "Jordan", "Malik", "Darius",
  "Chris", "Anthony", "Kevin", "Ryan", "David", "Joshua", "Isaiah", "Elijah",
  "Xavier", "Trevor", "Nathan", "Carlos", "Diego", "Andre", "Terrell", "Jamal",
  "John", "William", "Robert", "Daniel", "Matthew", "Joseph", "Andrew", "Kyle",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Davis", "Miller", "Wilson",
  "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin",
  "Thompson", "Garcia", "Martinez", "Robinson", "Clark", "Rodriguez", "Lewis",
  "Lee", "Walker", "Hall", "Allen", "Young", "King", "Wright", "Scott", "Green",
  "Adams", "Baker", "Nelson", "Carter", "Mitchell", "Roberts", "Turner", "Phillips",
];

const SCHOOLS_BY_STATE = {
  CA: [
    { name: "De La Salle", city: "Concord" },
    { name: "Mater Dei", city: "Santa Ana" },
    { name: "St. John Bosco", city: "Bellflower" },
    { name: "Mission Viejo", city: "Mission Viejo" },
    { name: "Corona Centennial", city: "Corona" },
    { name: "Long Beach Poly", city: "Long Beach" },
    { name: "Sierra Canyon", city: "Chatsworth" },
    { name: "Cathedral Catholic", city: "San Diego" },
    { name: "Folsom", city: "Folsom" },
    { name: "Serra", city: "San Mateo" },
  ],
  TX: [
    { name: "Duncanville", city: "Duncanville" },
    { name: "North Shore", city: "Houston" },
    { name: "Allen", city: "Allen" },
    { name: "Southlake Carroll", city: "Southlake" },
    { name: "Westlake", city: "Austin" },
    { name: "Lake Travis", city: "Austin" },
    { name: "Katy", city: "Katy" },
    { name: "Galena Park North Shore", city: "Houston" },
    { name: "DeSoto", city: "DeSoto" },
    { name: "Ryan", city: "Denton" },
  ],
  FL: [
    { name: "Miami Central", city: "Miami" },
    { name: "St. Thomas Aquinas", city: "Fort Lauderdale" },
    { name: "American Heritage", city: "Plantation" },
    { name: "IMG Academy", city: "Bradenton" },
    { name: "Chaminade-Madonna", city: "Hollywood" },
    { name: "Miami Northwestern", city: "Miami" },
    { name: "Trinity Christian", city: "Jacksonville" },
    { name: "Columbus", city: "Miami" },
    { name: "Apopka", city: "Apopka" },
    { name: "Vanguard", city: "Ocala" },
  ],
  GA: [
    { name: "Grayson", city: "Loganville" },
    { name: "Colquitt County", city: "Moultrie" },
    { name: "Carrollton", city: "Carrollton" },
    { name: "Buford", city: "Buford" },
    { name: "Mill Creek", city: "Hoschton" },
    { name: "Lowndes", city: "Valdosta" },
    { name: "North Gwinnett", city: "Suwanee" },
    { name: "Cartersville", city: "Cartersville" },
    { name: "Ware County", city: "Waycross" },
    { name: "Camden County", city: "Kingsland" },
  ],
  OH: [
    { name: "St. Edward", city: "Lakewood" },
    { name: "Pickerington Central", city: "Pickerington" },
    { name: "Elder", city: "Cincinnati" },
    { name: "Massillon Washington", city: "Massillon" },
    { name: "Glenville", city: "Cleveland" },
    { name: "Archbishop Moeller", city: "Cincinnati" },
    { name: "Hoban", city: "Akron" },
    { name: "Walsh Jesuit", city: "Cuyahoga Falls" },
    { name: "Kettering Fairmont", city: "Kettering" },
    { name: "Cleveland Heights", city: "Cleveland Heights" },
  ],
};

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function slugify(...parts) {
  return parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function uuidFromSeed(label) {
  const hash = createHash("sha256").update(`${SEED}:${label}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function computeTackleScore(rng, position) {
  const base = 4.5 + rng() * 5;
  const posBoost = { QB: 0.3, WR: 0.2, RB: 0.15, DB: 0.1 }[position] ?? 0;
  const raw = Math.min(10, Math.max(1, base + posBoost));
  const score = Math.round(raw * 10) / 10;

  const weights = {
    film_evaluation: 0.25,
    production: 0.2,
    athleticism: 0.2,
    measurables: 0.1,
    competition_level: 0.1,
    consistency: 0.1,
    recruiting_signals: 0.05,
  };

  const components = Object.entries(weights).map(([key, weight]) => ({
    key,
    label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    score: Math.round((score * (0.85 + rng() * 0.3)) * 10) / 10,
    weight,
  }));

  const confidence =
    score >= 8 ? "high" : score >= 6.5 ? "medium" : score >= 5 ? "limited" : "insufficient";

  return {
    score,
    version: "2026.1",
    confidence,
    scoreDate: "2026-02-01T00:00:00.000Z",
    components,
  };
}

function buildRankings(rng, stateCode, position, classYear, nationalRank) {
  const stateTotal = 600;
  const posTotal = Math.floor(3000 / POSITIONS.length);
  const classTotal = 600;
  return [
    {
      scope: "national",
      scopeKey: "US",
      rank: nationalRank,
      totalInScope: PLAYER_COUNT,
      label: `National #${nationalRank}`,
    },
    {
      scope: "state",
      scopeKey: stateCode,
      rank: Math.floor(rng() * stateTotal) + 1,
      totalInScope: stateTotal,
      label: `${stateCode} #${Math.floor(rng() * stateTotal) + 1}`,
    },
    {
      scope: "position",
      scopeKey: position,
      rank: Math.floor(rng() * posTotal) + 1,
      totalInScope: posTotal,
      label: `${position} #${Math.floor(rng() * posTotal) + 1}`,
    },
    {
      scope: "class",
      scopeKey: String(classYear),
      rank: Math.floor(rng() * classTotal) + 1,
      totalInScope: classTotal,
      label: `Class of ${classYear} #${Math.floor(rng() * classTotal) + 1}`,
    },
  ];
}

function buildFilm(rng, playerId, firstName, lastName) {
  const count = 1 + Math.floor(rng() * 3);
  const films = [];
  for (let i = 0; i < count; i++) {
    films.push({
      id: uuidFromSeed(`film:${playerId}:${i}`),
      title: i === 0 ? `${firstName} ${lastName} — Season Highlights` : `Game Film vs Opponent ${i}`,
      description: "Synthetic demo film stub for UI preview.",
      filmType: i === 0 ? "highlights" : pick(rng, ["game_film", "highlights", "individual_clips"]),
      seasonYear: 2025,
      opponent: pick(rng, ["Central High", "Westside", "North County", "Rival Prep"]),
      embedUrl: undefined,
      thumbnailUrl: undefined,
      sourceUrl: `https://demo.takkle.com/film/${playerId}/${i}`,
      verificationStatus: pick(rng, ["unverified", "player_confirmed", "platform_verified"]),
      findMyFilmCandidate: rng() > 0.7,
      dataOrigin: "manual_import",
    });
  }
  return films;
}

function buildStats(rng, position) {
  const stats = [];
  if (position === "QB") {
    stats.push(
      { statKey: "pass_yds", statValue: Math.floor(1500 + rng() * 2500), statLabel: "Pass Yards", unit: "yds", seasonYear: 2025, dataOrigin: "official_roster" },
      { statKey: "pass_td", statValue: Math.floor(12 + rng() * 28), statLabel: "Pass TD", seasonYear: 2025, dataOrigin: "official_roster" },
      { statKey: "comp_pct", statValue: Math.round((55 + rng() * 20) * 10) / 10, statLabel: "Comp %", unit: "%", seasonYear: 2025, dataOrigin: "official_roster" },
    );
  } else if (position === "RB") {
    stats.push(
      { statKey: "rush_yds", statValue: Math.floor(800 + rng() * 1200), statLabel: "Rush Yards", unit: "yds", seasonYear: 2025, dataOrigin: "official_roster" },
      { statKey: "rush_td", statValue: Math.floor(8 + rng() * 15), statLabel: "Rush TD", seasonYear: 2025, dataOrigin: "official_roster" },
    );
  } else if (position === "WR" || position === "TE") {
    stats.push(
      { statKey: "rec_yds", statValue: Math.floor(400 + rng() * 900), statLabel: "Rec Yards", unit: "yds", seasonYear: 2025, dataOrigin: "official_roster" },
      { statKey: "rec_td", statValue: Math.floor(4 + rng() * 12), statLabel: "Rec TD", seasonYear: 2025, dataOrigin: "official_roster" },
    );
  } else {
    stats.push(
      { statKey: "tackles", statValue: Math.floor(30 + rng() * 80), statLabel: "Tackles", seasonYear: 2025, dataOrigin: "official_roster" },
      { statKey: "sacks", statValue: Math.round(rng() * 12 * 10) / 10, statLabel: "Sacks", seasonYear: 2025, dataOrigin: "official_roster" },
    );
  }
  return stats;
}

mkdirSync(OUT_DIR, { recursive: true });

const rng = mulberry32(SEED);
const schools = [];

for (const stateCode of STATES) {
  for (const s of SCHOOLS_BY_STATE[stateCode]) {
    const id = uuidFromSeed(`school:${stateCode}:${s.name}`);
    schools.push({
      id,
      name: s.name,
      slug: slugify(s.name, stateCode),
      city: s.city,
      stateCode,
      county: `${s.city} County`,
      region: stateCode,
      athleticAssociation: "NFHS",
    });
  }
}

const schoolByState = Object.fromEntries(
  STATES.map((st) => [st, schools.filter((s) => s.stateCode === st)]),
);

const featuredSlug = "john-smith-qb-2028-miami-central-fl";
const featuredSchool = schools.find((s) => s.name === "Miami Central");

const players = [];

for (let i = 0; i < PLAYER_COUNT; i++) {
  const stateCode = STATES[i % STATES.length];
  const school = pick(rng, schoolByState[stateCode]);
  const position = pick(rng, POSITIONS);
  const classYear = pick(rng, CLASS_YEARS);

  let firstName, lastName, slug, isFeatured;

  if (i === 0) {
    firstName = "John";
    lastName = "Smith";
    slug = featuredSlug;
    isFeatured = true;
  } else {
    firstName = pick(rng, FIRST_NAMES);
    lastName = pick(rng, LAST_NAMES);
    slug = slugify(firstName, lastName, position, classYear, school.slug);
    if (players.some((p) => p.slug === slug)) {
      slug = `${slug}-${i}`;
    }
    isFeatured = false;
  }

  const playerId = uuidFromSeed(`player:${i}`);
  const tackleScore = i === 0
    ? { score: 8.4, version: "v1.0", confidence: "medium", scoreDate: "2026-09-12T00:00:00.000Z", components: [
        { key: "filmEvaluation", label: "Film Evaluation", score: 8.2, weight: 0.25 },
        { key: "production", label: "Production", score: 8.7, weight: 0.20 },
        { key: "athleticism", label: "Athleticism", score: 9.1, weight: 0.20 },
        { key: "measurables", label: "Measurables", score: 8.8, weight: 0.10 },
        { key: "competitionLevel", label: "Competition Level", score: 8.0, weight: 0.10 },
        { key: "consistency", label: "Consistency", score: 8.4, weight: 0.10 },
        { key: "recruitingSignals", label: "Recruiting Signals", score: 8.1, weight: 0.05 },
      ] }
    : computeTackleScore(rng, position);

  const playerSchool = i === 0 ? featuredSchool : school;

  players.push({
    id: playerId,
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`,
    slug,
    position: i === 0 ? "QB" : position,
    classYear: i === 0 ? 2028 : classYear,
    schoolId: playerSchool.id,
    school: playerSchool,
    stateCode: i === 0 ? "FL" : stateCode,
    heightInches: i === 0 ? 74 : Math.round((68 + rng() * 8) * 2) / 2,
    weightLbs: i === 0 ? 205 : Math.floor(160 + rng() * 80),
    jerseyNumber: i === 0 ? 12 : Math.floor(1 + rng() * 99),
    status: i === 0 ? "unclaimed" : pick(rng, ["unclaimed", "unclaimed", "claimed", "verified_player"]),
    bio: i === 0
      ? "Elite dual-threat quarterback with live arm and field general instincts. Featured synthetic demo profile."
      : undefined,
    hometownCity: playerSchool.city,
    isSynthetic: true,
    isFeatured,
    tackleScore,
    rankings: buildRankings(rng, i === 0 ? "FL" : stateCode, i === 0 ? "QB" : position, i === 0 ? 2028 : classYear, i + 1),
    film: buildFilm(rng, playerId, firstName, lastName),
    stats: buildStats(rng, i === 0 ? "QB" : position),
    measurements: [{
      fortyYard: i === 0 ? 4.62 : Math.round((4.4 + rng() * 0.8) * 100) / 100,
      verticalInches: i === 0 ? 34 : Math.round((28 + rng() * 10) * 10) / 10,
      benchPressLbs: Math.floor(185 + rng() * 100),
      shuttle: Math.round((4.0 + rng() * 0.6) * 100) / 100,
      dataOrigin: "platform_evaluated",
    }],
    offers: i === 0
      ? [
          { schoolName: "Miami", conference: "ACC", status: "interested" },
          { schoolName: "Florida State", conference: "ACC", status: "offer" },
        ]
      : rng() > 0.6 ? [{ schoolName: pick(rng, ["Alabama", "Georgia", "Ohio State", "Texas", "USC"]), status: "interested" }] : [],
    provenance: {
      sourceName: "Takkle Synthetic Seed",
      sourceType: "demo_generator",
      sourceUrl: "https://takkle.com",
      dataOrigin: "manual_import",
      lastVerifiedAt: "2026-02-01T00:00:00.000Z",
      ingestionDate: "2026-02-01T00:00:00.000Z",
    },
    trendingScore: Math.round(tackleScore.score * 100 + rng() * 50),
    risingDelta: Math.round((rng() - 0.3) * 20) / 10,
  });
}

players.sort((a, b) => b.tackleScore.score - a.tackleScore.score);
players.forEach((p, idx) => {
  p.rankings[0].rank = idx + 1;
});

// Product-brief rankings for the featured demo dossier (stable across regenerations)
const featured = players.find((p) => p.slug === featuredSlug);
if (featured) {
  featured.rankings = [
    { scope: "national", scopeKey: "US", rank: 127, totalInScope: PLAYER_COUNT, label: "National" },
    { scope: "position", scopeKey: "QB", rank: 18, totalInScope: Math.max(1, Math.floor(PLAYER_COUNT / POSITIONS.length)), label: "QB" },
    { scope: "state", scopeKey: "FL", rank: 6, totalInScope: Math.floor(PLAYER_COUNT / STATES.length), label: "Florida" },
    { scope: "region", scopeKey: "Miami-Dade", rank: 4, totalInScope: 80, label: "Miami-Dade" },
  ];
  featured.measurements = [{
    measuredAt: "2026-06-15",
    fortyYard: 4.62,
    verticalInches: 34,
    benchPressLbs: 185,
    broadJumpInches: 116,
    shuttle: 4.31,
    dataOrigin: "player_submitted",
  }];
  featured.stats = [
    { statKey: "pass_yards", statValue: 2841, statLabel: "Passing Yards", seasonYear: 2025, dataOrigin: "player_submitted" },
    { statKey: "pass_td", statValue: 31, statLabel: "TD", seasonYear: 2025, dataOrigin: "player_submitted" },
    { statKey: "int", statValue: 6, statLabel: "INT", seasonYear: 2025, dataOrigin: "player_submitted" },
  ];
}

writeFileSync(join(OUT_DIR, "schools.json"), JSON.stringify(schools, null, 0));

const chunks = [];
for (let c = 0; c * CHUNK_SIZE < players.length; c++) {
  const chunkName = `players-chunk-${c}.json`;
  const slice = players.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);
  writeFileSync(join(OUT_DIR, chunkName), JSON.stringify(slice, null, 0));
  chunks.push(chunkName);
}

const chunkSet = new Set(chunks);
for (const name of readdirSync(OUT_DIR)) {
  if (/^players-chunk-\d+\.json$/.test(name) && !chunkSet.has(name)) {
    unlinkSync(join(OUT_DIR, name));
  }
}

const manifest = {
  version: "2026.1",
  generatedAt: new Date().toISOString(),
  playerCount: players.length,
  schoolCount: schools.length,
  chunks,
  featuredSlug,
  isSynthetic: true,
};

writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));

console.log(`Generated ${players.length} players across ${schools.length} schools in ${chunks.length} chunks.`);
