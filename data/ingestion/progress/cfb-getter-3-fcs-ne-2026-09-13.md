# CFB Getter 3/5 — FCS North / East — 2026-09-13

## Slice
- **CAA** (full), **Ivy**, **Patriot**, **NEC**, **Pioneer**, **MVFC**
- **Big Sky (north only):** Eastern Washington, Idaho, Idaho State, Montana, Montana State, Northern Colorado, Portland State
- Left for Getter 4: Cal Poly, Sacramento State, UC Davis, Northern Arizona, Weber State + Southern/Southland/UAC/OVC/SWAC/MEAC

## Added (this bot)
| Metric | Value |
|--------|-------|
| Teams | **67** |
| Player upserts | **6,610** |
| Apply errors | **0** |
| Verified tagged in DB (excl. Big Sky) | **5,910** (CAA+Ivy+Patriot+NEC+Pioneer+MVFC) |
| Big Sky north upserts | **700** |

### By conference (upsert payload)
| Conference | Players |
|------------|---------|
| CAA | 1,374 |
| Pioneer | 1,097 |
| MVFC | 999 |
| NEC | 879 |
| Ivy | 786 |
| Patriot | 775 |
| Big Sky (north) | 700 |

## Tagging
- `competition_level = 'college'`
- `division = 'fcs'`
- `college_name`, `conference` set on all rows
- `transfer_portal_status = 'not_in_portal'`
- Provenance: ESPN College Football Roster (`site.web.api.espn.com`)

## Live DB (post-apply snapshot)
- College players (all getters): **~20,596**
- HS rows left dormant (untouched): **~16,470**

## Blocked
- CFBD FCS rosters: **blocked** (401 — no `CFBD_API_KEY`)
- ESPN `site.api` team/roster: **403**; used `site.web.api` + `sports.core.api`
- Big Sky south/west skipped (Getter 4)
- FCS Independents left for Getter 5
- ESPN roster pages often cap ~100 athletes/team

## Artifacts
- `data/ingestion/sources/session15k/cfb_fcs_ne/`
