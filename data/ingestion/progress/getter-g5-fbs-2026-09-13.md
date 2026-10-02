# CFB Getter 2/5 — Group of Five FBS (2026-09-13)

## Slice
AAC, Mountain West, MAC, Sun Belt, Conference USA, + UConn (FBS Independents). Notre Dame left to Power slice.

## Added (this session)
~13.9k real ESPN roster athletes upserted with required college fields:
`competition_level=college`, `division=fbs`, `college_name`, `conference`.

### By conference (live DB, ESPN College Football Roster + G5 labels)
| Conference | Players |
|---|---:|
| AAC | ~3.2k |
| Sun Belt | ~3.0k |
| MAC | ~2.6k |
| Mountain West | ~2.5k |
| Conference USA | ~2.4k |
| FBS Independents (UConn + any shared labels) | ~0.2–0.4k |

## Method
1. ESPN site.web team roster (~100/team cap) for 66 G5 teams
2. ESPN sports.core season-2025 athletes lists for full active rosters (~11k unique athletes)
3. `takkle.bulk_upsert_players` with college field contract from `COLLEGE_PLAYER_FIELDS.md`

## Sources used
- ESPN site.web roster API
- ESPN sports.core athletes API (2025)

## Blocked
- **CFBD**: no `CFBD_API_KEY` in env
- MaxPreps / 247 / Rivals / On3 (policy)
- `site.api.espn.com` roster often 403 (used site.web + core instead)
- Brief anon RPC revoke mid-run; re-granted temporarily then revoked again after apply

## Notes
- HS players untouched (`competition_level=hs` remains dormant for UI)
- Deduped on stable UUID5(`espn-cfb-athlete:{id}`)
