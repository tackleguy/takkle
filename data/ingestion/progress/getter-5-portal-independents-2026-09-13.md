# CFB Getter 5/5 — Transfer portal + independents + leftovers

**Date:** 2026-09-13  
**Contract:** `data/ingestion/COLLEGE_PLAYER_FIELDS.md` (`competition_level='college'`, `division` fbs|fcs)

## Added (this getter)

| Slice | Count | Notes |
|-------|------:|-------|
| Independent rosters | **227** | Notre Dame 111 + UConn 116 (ESPN core athletes 2026) |
| Transfer portal | **98** | ESPN top-100 portal rankings story; `entered`/`committed` + `portal_entry_date=2026-01-02` |
| **Unique upserted** | **323** | All 323 deterministic IDs present in DB |
| Leftover FBS teams | **0** | Power+G5 already covered all other FBS teams |

Portal status on applied rows: **95 entered**, **3 committed** (98 flagged). Two portal names matched independent roster athletes and were overlaid.

## DB totals (after apply)

| Metric | Count |
|--------|------:|
| College (`competition_level='college'`) | **39,771** |
| FBS | 19,775 |
| FCS | 19,996 |
| HS (dormant) | 16,470 |
| Portal-flagged (entered/committed/…) | 98 |
| Notre Dame / UConn | 111 / 116 |

## Sources

- ESPN public roster/athlete APIs (`site.web.api` / `sports.core.api`)
- ESPN transfer portal rankings story XHR:  
  `https://www.espn.com/college-football/story/_/id/47467021/2026-ncaa-football-transfer-portal-best-players`

Artifacts: `data/ingestion/sources/session15k/cfb_getter5/`

## Blocked

1. **`CFBD_API_KEY` missing** — no CFBD `/player/portal` or national roster dump
2. **ESPN transfer-portal hub soft-blocked** (generic shell HTML); used rankings story + athlete search instead
3. Full NCAA portal census not available from free public APIs without CFBD
