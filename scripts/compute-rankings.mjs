/**
 * Compute research-based Tackle Scores + position rankings for class 2027–2031.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/compute-rankings.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

const RECRUIT_MIN = 2027;
const RECRUIT_MAX = 2031;
const RANKING_VERSION = "research-2026.1";
const SCORE_VERSION = "research-2026.1";

const SOURCE_TIER = {
  "CIF Southern Section All-CIF Football": 8.4,
  "Cal-Hi Sports All-State Football": 8.6,
  "Texas Sports Writers Association All-State Football": 8.7,
  "Ohio Prep Sports Media Association All-Ohio Football": 8.2,
  "GPB Sports All-State Football": 8.0,
  "Alabama Sports Writers Association All-State Football": 8.1,
};

const STATE_COMPETITION = {
  TX: 9.0,
  CA: 8.8,
  FL: 8.7,
  GA: 8.3,
  OH: 8.1,
  AL: 7.9,
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
  for (const [key, value] of Object.entries(SOURCE_TIER)) {
    if (name.includes(key) || key.includes(name)) return value;
  }
  if (/all[- ]?state/i.test(name)) return 8.0;
  if (/all[- ]?cif|all[- ]?ohio/i.test(name)) return 8.2;
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

function scorePlayer(p, refCount) {
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

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    db: { schema: "takkle" },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Loading recruit-class players (2027–2031)…");
  const { data: players, error } = await supabase
    .from("players")
    .select(
      "id, slug, display_name, position, class_year, state_code, source_name, height_inches, weight_lbs",
    )
    .gte("class_year", RECRUIT_MIN)
    .lte("class_year", RECRUIT_MAX)
    .eq("is_synthetic", false);

  if (error) throw error;
  console.log(`Players in window: ${players?.length ?? 0}`);

  const ids = (players ?? []).map((p) => p.id);
  const refCounts = new Map();
  // Batch ref counts
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { data: refs } = await supabase
      .from("player_source_refs")
      .select("player_id")
      .in("player_id", chunk);
    for (const r of refs ?? []) {
      refCounts.set(r.player_id, (refCounts.get(r.player_id) ?? 0) + 1);
    }
  }

  // Clear current scores for these players then insert
  console.log("Writing tackle scores…");
  await supabase
    .from("tackle_scores")
    .update({ is_current: false })
    .in("player_id", ids)
    .eq("is_current", true);

  const scored = [];
  const scoreRows = [];
  for (const p of players ?? []) {
    const result = scorePlayer(p, refCounts.get(p.id) ?? 1);
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
      is_current: true,
    });
  }

  for (let i = 0; i < scoreRows.length; i += 100) {
    const chunk = scoreRows.slice(i, i + 100);
    const { error: upErr } = await supabase.from("tackle_scores").upsert(chunk, {
      onConflict: "id",
    });
    if (upErr) {
      // fallback: insert without fixed id
      const { error: insErr } = await supabase.from("tackle_scores").insert(
        chunk.map(({ id: _id, ...rest }) => rest),
      );
      if (insErr) console.error("score insert error", insErr.message);
    }
  }

  // Build rankings
  console.log("Materializing rankings…");
  const rankingRows = [];

  function pushRanks(scope, scopeKey, list, extra = {}) {
    const sorted = [...list].sort((a, b) => b.score - a.score || a.player.display_name.localeCompare(b.player.display_name));
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
        ranking_version: RANKING_VERSION,
        ranking_date: new Date().toISOString().slice(0, 10),
        previous_rank: null,
        is_rising: false,
        ...extra,
      });
    });
  }

  // National (recruit classes only)
  pushRanks("national", "national", scored);

  // By class
  for (let y = RECRUIT_MIN; y <= RECRUIT_MAX; y++) {
    const subset = scored.filter((s) => s.player.class_year === y);
    if (subset.length) pushRanks("class", String(y), subset);
  }

  // By position (primary ask)
  for (const pos of POSITIONS) {
    const subset = scored.filter((s) => s.position === pos);
    if (subset.length) pushRanks("position", pos, subset);
  }

  // Position + class
  for (const pos of POSITIONS) {
    for (let y = RECRUIT_MIN; y <= RECRUIT_MAX; y++) {
      const subset = scored.filter(
        (s) => s.position === pos && s.player.class_year === y,
      );
      if (subset.length) pushRanks("position", `${pos}:${y}`, subset);
    }
  }

  // By state
  const states = [...new Set(scored.map((s) => s.player.state_code).filter(Boolean))];
  for (const st of states) {
    const subset = scored.filter((s) => s.player.state_code === st);
    if (subset.length) pushRanks("state", st, subset);
  }

  // State + position
  for (const st of states) {
    for (const pos of POSITIONS) {
      const subset = scored.filter(
        (s) => s.player.state_code === st && s.position === pos,
      );
      if (subset.length) pushRanks("position", `${st}:${pos}`, subset);
    }
  }

  // Delete prior version rows then upsert
  await supabase.from("player_rankings").delete().eq("ranking_version", RANKING_VERSION);

  let written = 0;
  for (let i = 0; i < rankingRows.length; i += 150) {
    const chunk = rankingRows.slice(i, i + 150);
    const { error: rErr } = await supabase.from("player_rankings").upsert(chunk, {
      onConflict: "ranking_scope,scope_key,player_id,ranking_version",
    });
    if (rErr) {
      const { error: rErr2 } = await supabase.from("player_rankings").insert(
        chunk.map(({ id: _id, ...rest }) => rest),
      );
      if (rErr2) console.error("ranking insert", rErr2.message);
      else written += chunk.length;
    } else {
      written += chunk.length;
    }
  }

  // Summary
  const byPos = {};
  for (const s of scored) {
    byPos[s.position] = (byPos[s.position] ?? 0) + 1;
  }
  console.log(JSON.stringify({
    playersScored: scored.length,
    rankingRows: written || rankingRows.length,
    byPosition: byPos,
    version: RANKING_VERSION,
    sampleTopQB: scored
      .filter((s) => s.position === "QB")
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((s) => ({ name: s.player.display_name, score: s.score, class: s.player.class_year, state: s.player.state_code })),
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
