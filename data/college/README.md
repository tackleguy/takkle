# College FBS/FCS player dump (Transfer Portal + NIL Portal)

Real NCAA D1 football athletes exported from `takkle.players` where `competition_level=college`.

- **CSV listing (every player):** `players-college-fbs-fcs.csv`
- **JSON chunks (app seed):** `players-chunk-*.json`
- **Manifest:** `manifest.json`

Counts (2026-09-14): **42,869** players — FBS 22,873 · FCS 19,996.

High-school recruits are **not** included (dormant in product UI).

Regenerate: export from Supabase `competition_level=eq.college` into this folder.
