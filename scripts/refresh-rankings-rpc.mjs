#!/usr/bin/env node
/**
 * Refresh research rankings for class 2027–2031 via public SECURITY DEFINER RPCs
 * (PostgREST does not expose schema takkle).
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/refresh-rankings-rpc.mjs
 */
import { createHash } from "node:crypto";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Need SUPABASE_URL and SUPABASE_ANON_KEY");
  process.exit(1);
}

const RANKING_VERSION = "research-2026.1";
const SCORE_VERSION = "research-2026.1";

const SOURCE_TIER = {
  "CIF Southern Section All-CIF Football": 8.4,
  "Cal-Hi Sports All-State Football": 8.6,
  "Texas Sports Writers Association All-State Football": 8.7,
  "Ohio Prep Sports Media Association All-Ohio Football": 8.2,
  "GPB Sports All-State Football": 8.0,
  "Alabama Sports Writers Association All-State Football": 8.1,
  "Illinois High School Football Coaches Association All-State": 8.0,
  "Indiana Football Coaches Association All-State": 8.0,
  "Pennsylvania Football Writers All-State": 8.0,
  "South Carolina Football Coaches Association All-State": 7.8,
  "Florida HS Football (floridahsfootball.com)": 8.3,
  "Tennessee Sports Writers Association All-State": 8.0,
  "Louisiana Football Coaches Association All-State": 8.0,
  "Georgia Athletic Coaches Association All-State": 8.1,
  "Yahoo Sports Illinois All-State Football": 7.9,
  "Michigan High School Football Coaches Association All-State": 8.0,
  "AIA AZPreps365 Football Recognitions": 8.0,
  "CHSAA All-State Football": 7.9,
  "UHSAA Academic All-State Football": 7.5,
};

const STATE_COMPETITION = {
  TX: 9.0,
  CA: 8.8,
  FL: 8.7,
  GA: 8.3,
  OH: 8.1,
  AL: 7.9,
  PA: 8.0,
  IN: 7.8,
  IL: 8.0,
  MI: 7.9,
  TN: 7.8,
  LA: 7.8,
  SC: 7.5,
  AZ: 7.8,
  CO: 7.6,
  UT: 7.5,
};

const POSITIONS = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P", "ATH"];

function normalizePosition(raw) {
  if (!raw) return "ATH";
  const p = String(raw).toUpperCase().trim();
  if (["L", "OT", "OG", "OC", "IOL"].includes(p)) return "OL";
  if (["DE", "DT", "NT", "EDGE"].includes(p)) return "DL";
  if (["CB", "S", "SAF", "FS", "SS"].includes(p)) return "DB";
  if (["ILB", "OLB", "MLB"].includes(p)) return "LB";
  return POSITIONS.includes(p) ? p : "ATH";
}

function sourceProduction(name) {
  if (!name) return 6.5;
  if (SOURCE_TIER[name] != null) return SOURCE_TIER[name];
  for (const [key, value] of Object.entries(SOURCE_TIER)) {
    if (name.includes(key) || key.includes(name)) return value;
  }
  if (/all[- ]?state/i.test(name)) return 8.0;
  return 6.8;
}

function underclassSignal(classYear) {
  if (classYear >= 2030) return 8.8;
  if (classYear === 2029) return 8.4;
  if (classYear === 2028) return 7.8;
  if (classYear === 2027) return 7.2;
  return 5.5;
}

function clamp(v) {
  return Math.round(Math.min(10, Math.max(1, v)) * 10) / 10;
}

function scorePlayer(p, refCount = 1) {
  const production = sourceProduction(p.source_name);
  const competition = STATE_COMPETITION[p.state_code] ?? 7.0;
  const consistency = refCount >= 3 ? 8.5 : refCount === 2 ? 7.5 : 6.5;
  const recruiting = underclassSignal(p.class_year);
  let athleticism = null;
  if (p.height_inches != null || p.weight_lbs != null) {
    let a = 6.0;
    if (p.height_inches >= 74) a += 1.2;
    else if (p.height_inches >= 72) a += 0.6;
    if (p.weight_lbs >= 220) a += 0.5;
    else if (p.weight_lbs >= 190) a += 0.3;
    athleticism = Math.min(9, a);
  }

  const parts = [
    ["production", production, 0.35],
    ["competition_level", competition, 0.25],
    ["consistency", consistency, 0.15],
    ["recruiting_signals", recruiting, 0.15],
  ];
  if (athleticism != null) parts.push(["athleticism", athleticism, 0.1]);

  const wSum = parts.reduce((s, [, , w]) => s + w, 0);
  let weighted = 0;
  const components = {};
  const inputs = {};
  for (const [key, val, w] of parts) {
    const nw = w / wSum;
    weighted += val * nw;
    components[key] = { score: clamp(val), weight: nw };
    inputs[key] = clamp(val);
  }

  return {
    score: clamp(weighted),
    confidence: "limited",
    components,
    inputs,
    position: normalizePosition(p.position),
  };
}

function uuidFromKey(key) {
  const h = createHash("sha256").update(key).digest();
  const b = Buffer.from(h.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = b.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function rpc(name, body) {
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${name} ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  console.log("Loading recruit-class players…");
  const players = await rpc("list_recruit_players_for_rankings", {});
  console.log(`Players in window: ${players?.length ?? 0}`);

  const scored = [];
  const scoreRows = [];
  for (const p of players ?? []) {
    const result = scorePlayer(p, 1);
    scored.push({ player: p, ...result });
    scoreRows.push({
      id: uuidFromKey(`score:${SCORE_VERSION}:${p.id}`),
      player_id: p.id,
      score: result.score,
      score_version: SCORE_VERSION,
      confidence: result.confidence,
      component_scores: result.components,
      inputs: result.inputs,
      evaluator: "research-honor-roll-v1",
    });
  }

  console.log("Writing tackle scores…");
  let scoreUpserts = 0;
  for (let i = 0; i < scoreRows.length; i += 80) {
    const n = await rpc("bulk_upsert_tackle_scores", {
      payload: scoreRows.slice(i, i + 80),
    });
    scoreUpserts += Number(n) || 0;
    process.stdout.write(`\rScores ${Math.min(i + 80, scoreRows.length)}/${scoreRows.length}`);
  }
  console.log(`\nScore upserts: ${scoreUpserts}`);

  const rankingRows = [];
  function pushRanks(scope, scopeKey, list) {
    const sorted = [...list].sort(
      (a, b) =>
        b.score - a.score ||
        String(a.player.display_name || "").localeCompare(String(b.player.display_name || "")),
    );
    sorted.forEach((row, idx) => {
      rankingRows.push({
        id: uuidFromKey(`rank:${RANKING_VERSION}:${scope}:${scopeKey}:${row.player.id}`),
        player_id: row.player.id,
        ranking_scope: scope,
        scope_key: scopeKey,
        class_year: row.player.class_year,
        position: row.position,
        state_code: row.player.state_code,
        rank: idx + 1,
        score: row.score,
        ranking_date: new Date().toISOString().slice(0, 10),
        previous_rank: null,
        is_rising: false,
      });
    });
  }

  pushRanks("national", "national", scored);
  for (let y = 2027; y <= 2031; y++) {
    const subset = scored.filter((s) => s.player.class_year === y);
    if (subset.length) pushRanks("class", String(y), subset);
  }
  for (const pos of POSITIONS) {
    const subset = scored.filter((s) => s.position === pos);
    if (subset.length) pushRanks("position", pos, subset);
  }
  for (const pos of POSITIONS) {
    for (let y = 2027; y <= 2031; y++) {
      const subset = scored.filter(
        (s) => s.position === pos && s.player.class_year === y,
      );
      if (subset.length) pushRanks("position", `${pos}:${y}`, subset);
    }
  }

  console.log(`Writing ${rankingRows.length} ranking rows…`);
  await rpc("clear_research_rankings", { version: RANKING_VERSION });
  let written = 0;
  const CHUNK = 150;
  for (let i = 0; i < rankingRows.length; i += CHUNK) {
    const n = await rpc("bulk_insert_research_rankings", {
      payload: rankingRows.slice(i, i + CHUNK),
      version: RANKING_VERSION,
    });
    written += Number(n) || 0;
    process.stdout.write(
      `\rRankings ${Math.min(i + CHUNK, rankingRows.length)}/${rankingRows.length}`,
    );
  }
  console.log(`\nRanking rows written: ${written}`);

  const byPos = {};
  for (const s of scored) byPos[s.position] = (byPos[s.position] ?? 0) + 1;
  console.log(
    JSON.stringify(
      {
        playersScored: scored.length,
        rankingRows: written,
        byPosition: byPos,
        version: RANKING_VERSION,
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
