# CFB Getter 1/5 — Power FBS conferences — 2026-09-13

## Upserts (this bot)
| Conference | Players |
|------------|---------|
| Big Ten | 2,084 |
| ACC | 1,943 |
| SEC | 1,865 |
| Big 12 | 1,813 |
| Pac-12 (2026 remnant) | 922 |
| **Total** | **8,627** |

All tagged: `competition_level=college`, `division=fbs`, plus `college_name`, `conference`.

## Sources
- ESPN public web API standings + team rosters (`site.web.api.espn.com`, `?limit=300`)
- Season: 2026
- `source_name`: ESPN College Football Roster

## Blocked
- **CFBD**: no `CFBD_API_KEY` in env (401 without key)
- **site.api.espn.com**: Akamai Access Denied from this host; web API works
- MaxPreps/247/Rivals/On3: not used

## Live DB after this run (all getters)
- College total: **33,740** (FBS **15,217** / FCS **18,523**)
- HS dormant: **16,470**
- This bot’s Power slice still **8,627** unique ESPN roster athletes

## Notes
- HS inventory left intact (`competition_level=hs`, dormant)
- Pac-12 includes ESPN’s 2026 Pac-12 set (OSU/WSU + reconstituted members)
- Ex-Pac schools already in Big Ten / Big 12 / ACC counted under those conferences
