#!/usr/bin/env node
/**
 * Apply Power FBS college roster batches via bulk_upsert_players.
 * Usage: node scripts/apply-cfb-power-batches.mjs [batchesDir]
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Need SUPABASE_URL + anon/service key");
  process.exit(1);
}

const dir =
  process.argv[2] ||
  join(ROOT, "data/ingestion/sources/cfb_power_fbs_2026/rpc_batches");

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
  if (!res.ok) throw new Error(`${name} ${res.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

const files = readdirSync(dir)
  .filter((f) => /^batch_\d+\.json$/.test(f))
  .sort();

let total = 0;
for (let i = 0; i < files.length; i++) {
  const payload = JSON.parse(readFileSync(join(dir, files[i]), "utf8"));
  // hard-enforce college tags
  for (const p of payload) {
    p.competition_level = "college";
    p.division = "fbs";
    if (!p.college_name) p.college_name = p.school_name;
    if (!p.conference) throw new Error(`missing conference in ${files[i]}`);
  }
  const n = await rpc("bulk_upsert_players", payload);
  total += Number(n) || 0;
  process.stdout.write(`\r${i + 1}/${files.length} ${files[i]} -> ${n} (cum ${total})`);
}
console.log(`\nDone. Upserts reported: ${total}`);
