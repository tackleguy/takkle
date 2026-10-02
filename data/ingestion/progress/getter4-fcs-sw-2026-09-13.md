# CFB Getter 4 — FCS South/West — 2026-09-13

## Added (live)
| Metric | Count |
|--------|------:|
| Getter 4 ESPN FCS SW rows | **13,386** |
| Teams / schools | **63** |
| College players in DB (all getters) | **35,213** |
| Tagging | `competition_level=college`, `division=fcs`, `college_name`, `conference` |

Upserts attempted this bot: **13,640** (10,487 from 2025 core rosters + 3,153 from 2026-only athletes). Live unique in slice = 13,386 after conflict/dedupe with parallel work.

## By conference (live, this slice)
| Conference | Players |
|------------|--------:|
| SWAC | 2,525 |
| United Athletic | 2,059 |
| Southland | 2,019 |
| Ohio Valley (Big South-OVC) | 1,960 |
| Southern | 1,861 |
| Big Sky (SW remainder) | 1,745 |
| MEAC | 1,217 |

## Scope
- Full: Southern, Southland, UAC, OVC, SWAC, MEAC
- Big Sky SW only: Cal Poly, Sac State, UC Davis, NAU, Weber State, Idaho State, Portland State, Northern Colorado
- Avoided Getter 3: CAA, Ivy, Patriot, NEC, Pioneer, MVFC, Big Sky north (Montana, Montana State, EWU, Idaho)

## Blocked
- CFBD: no API key (401)
- ESPN `site.api` roster 403 → used core athletes API
- Brief mid-run anon RPC revoke (restored; delta finished)
- No MaxPreps / 247 / Rivals / On3; no HS deletes

## Artifacts
`data/ingestion/sources/session_cfb/getter4_fcs_sw/`
