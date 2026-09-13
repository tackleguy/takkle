#!/usr/bin/env node
/**
 * Apply ingestion JSON to Supabase via temporary bulk_upsert_* RPCs.
 * Usage:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/apply-ingestion-rpc.mjs [run-dir]
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Need SUPABASE_URL and SUPABASE_ANON_KEY (or SERVICE_ROLE)");
  process.exit(1);
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

async function rpc(name, payload) {
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
  if (!res.ok) throw new Error(`${name} ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  const runDir =
    process.argv[2] ||
    join(ROOT, "data/ingestion/run-2026-09-13T00-21-42-543Z");
  let schools = existsSync(join(runDir, "schools.json"))
    ? JSON.parse(readFileSync(join(runDir, "schools.json"), "utf8"))
    : [];
  const players = JSON.parse(readFileSync(join(runDir, "players.json"), "utf8"));

  // Derive association schools from players when schools.json is empty (players-only runs)
  if (!schools.length && players.length) {
    const seen = new Map();
    for (const p of players) {
      const slug = `${slugify(p.schoolName)}-${p.stateCode.toLowerCase()}`;
      if (seen.has(slug)) continue;
      const id = uuidFromKey(`assoc-school:${p.stateCode}:${slugify(p.schoolName)}`);
      seen.set(slug, {
        id,
        name: p.schoolName,
        slug,
        city: null,
        stateCode: p.stateCode,
        ncesId: null,
        websiteUrl: null,
        sourceUrl: p.sourceUrl,
        sourceType: p.sourceType,
        sourceName: p.sourceName,
      });
    }
    schools = [...seen.values()];
  }

  console.log(`Schools: ${schools.length}, Players: ${players.length}`);

  const SB = 200;
  let schoolUpserts = 0;
  for (let i = 0; i < schools.length; i += SB) {
    const batch = schools.slice(i, i + SB).map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      city: s.city,
      state_code: s.stateCode,
      nces_id: s.ncesId,
      website_url: s.websiteUrl,
      source_url: s.sourceUrl,
      source_type: s.sourceType,
      source_name: s.sourceName,
    }));
    const n = await rpc("bulk_upsert_schools", batch);
    schoolUpserts += Number(n) || 0;
    process.stdout.write(`\rSchools ${Math.min(i + SB, schools.length)}/${schools.length} (batch returned ${n})`);
  }
  console.log(`\nSchool upserts reported: ${schoolUpserts}`);

  const schoolIdByKey = new Map();
  for (const s of schools) {
    schoolIdByKey.set(`${slugify(s.name)}|${s.stateCode}`, s.id);
    const short = s.name.replace(/\s+High School$/i, "").replace(/\s+HS$/i, "");
    schoolIdByKey.set(`${slugify(short)}|${s.stateCode}`, s.id);
  }
  // Resolved from live takkle.data_sources (do not invent UUIDs)
  const ds = {
    "CIF Southern Section All-CIF Football":
      process.env.DS_CIFSS || "d68f9dfa-9234-4277-9a91-22fbcea4b035",
    "Cal-Hi Sports All-State Football":
      process.env.DS_CALHI || "e8c91b35-45fd-5ca1-91ba-10da792293f8",
    "Texas Sports Writers Association All-State Football":
      process.env.DS_TSWA || "987a6889-e210-4015-aab7-339f18787f63",
    "Ohio Prep Sports Media Association All-Ohio Football":
      process.env.DS_OPSMA || "f149a003-3e2c-4a55-8bcc-3498db6f94f6",
    "GPB Sports All-State Football":
      process.env.DS_GPB || "8a0af6fb-1846-48fe-be0a-9ec96f90f978",
    "Alabama Sports Writers Association All-State Football":
      process.env.DS_ASWA || "3eecb867-64ea-4e30-8d8b-8889c4cc042c",
    "Manual CSV import":
      process.env.DS_CSV || "81a7db23-a197-483f-86f8-df205417defa",
    "NCES Common Core of Data (CCD)":
      process.env.DS_NCES || "2d367e8a-5967-4a80-a1ef-c0c530eea078",
    "AIA AZPreps365 Football Recognitions":
      process.env.DS_AIA || "a1a00000-3650-4a11-9a11-000000000001",
    "CHSAA All-State Football":
      process.env.DS_CHSAA || "c0a00000-c45a-4c45-9c45-000000000001",
  };

  const PB = 100;
  let playerUpserts = 0;
  for (let i = 0; i < players.length; i += PB) {
    const batch = players.slice(i, i + PB).map((p) => {
      const sk = `${slugify(p.schoolName)}|${p.stateCode}`;
      let schoolId = schoolIdByKey.get(sk);
      if (!schoolId) {
        schoolId = uuidFromKey(`assoc-school:${p.stateCode}:${slugify(p.schoolName)}`);
        schoolIdByKey.set(sk, schoolId);
      }
      const school_slug = `${slugify(p.schoolName)}-${p.stateCode.toLowerCase()}`;
      const playerId = uuidFromKey(
        `player:${p.stateCode}:${slugify(p.schoolName)}:${slugify(p.firstName)}:${slugify(p.lastName)}:${p.classYear || "x"}`,
      );
      const slug =
        `${slugify(p.firstName)}-${slugify(p.lastName)}-${(p.position || "ath").toLowerCase()}-${p.classYear || p.seasonYear}-${slugify(p.schoolName)}-${p.stateCode.toLowerCase()}`.slice(
          0,
          120,
        );
      return {
        school_id: schoolId,
        school_name: p.schoolName,
        school_slug,
        state_code: p.stateCode,
        source_url: p.sourceUrl,
        source_type: p.sourceType,
        source_name: p.sourceName,
        id: playerId,
        first_name: p.firstName,
        last_name: p.lastName,
        slug,
        position: p.position,
        class_year: p.classYear,
        primary_source_id: ds[p.sourceName] || null,
        source_state: p.sourceState,
        source_school: p.sourceSchool,
        season_year: p.seasonYear,
      };
    });
    const n = await rpc("bulk_upsert_players", batch);
    playerUpserts += Number(n) || 0;
    process.stdout.write(
      `\rPlayers ${Math.min(i + PB, players.length)}/${players.length} (batch returned ${n})`,
    );
  }
  console.log(`\nPlayer upserts reported: ${playerUpserts}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
