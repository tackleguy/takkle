# Getter C (NE/Mid-Atlantic + national free boards) — 2026-09-13

## Contribution
| Metric | Value |
|--------|-------|
| Baseline (start of run) | **5,189** |
| Final observed total | **~10,130** |
| Approx net gain during run | **~+4,940** (includes parallel getters) |
| Getter C upserts (this bot) | ESPN **2,794** + PRZ **2,621** + NE PRZ **20** + HTO **61** ≈ **5,496** upserts |

## By class (final snapshot)
2027: 5737 · 2028: 3135 · 2029: 1154 · 2030: 79 · 2031: 5

## Sources applied (this bot)
1. **ESPN Recruiting** public API (`sports.core.api.espn.com`) — class **2027** (2,755) + **2030** (39). Provenance `data_sources.id=5c823ad3-...`.
2. **Prep Redzone** free rankings — 70 pages fetched; **2,621** table-parsed + **20** New England. Years 2027/2028/2030/2031 + NE spill.
3. **HomeTeamsONLINE** — South Fayette (PA) Yr roster → **61** players.

## NE state counts (post-apply)
PA 228 · NJ 128 · MD 132 · VA 108 · NY 57 · WV 35 · MA 30 · CT 24 · DE 12 · RI 4

## Blocked / empty
- ESPN **2031**: 0 public recruits
- ESPN **2028/2029**: already fully in DB from prior sessions (no re-fetch needed)
- PRZ New England initially skipped (no state in URL) — fixed and applied (20)
- HTO Paramus / Pine-Richland / Don Bosco / Greenwich: no parseable Yr football roster table (wrong sport layout / JS / empty)
- No MaxPreps / 247 / Rivals / On3
- No TX/South or Midwest/West school crawls

## Artifacts
- `data/ingestion/sources/session15k/espn/`
- `data/ingestion/sources/session15k/prz/`
- `data/ingestion/sources/session15k/ne_schools/`
