# Getter B (Midwest + West school/team sites) — 2026-09-13

## Baseline → live
- Start (this bot): **5,187** real class 2027–2031
- Live total at end: queried separately (includes parallel getters)

## This bot upserts
| Source | Upserts | Notes |
|--------|---------|-------|
| Sidearm HS athletics rosters | **325** | Miramonte, Loyola HS (LA), Oak Park, Saint Francis (CA); St Ignatius (OH) — 2026 graded Yr |
| Massillon Washington | **78** | massillontigers.com Yr table |
| Hilliard Davidson | **72** | davidsonfootball.com Wix roster |
| IFCA Junior All-State 2025 | **55** | class 2027 (ifca.net) |
| Under Armour Next | **9** | territory class 2027 free list |
| **Total this bot** | **~539** | |

## Clear `source_name` for checkers
- `{School} Athletics Football Roster`
- `Indiana Football Coaches Association Junior All-State`
- `Under Armour Next Football Rosters`

## Blocked
- Prep Redzone midwest ranking tables paywalled (preview only; no bypass). CA/CO free watch-lists owned by sibling PRZ run.
- HomeTeamsONLINE 429 after probe (Acalanes confirmed graded; not applied this run).
- Guessed Sidearm hostnames mostly DNS/404; Penn college false-positive discarded.
- Elder ehsports roster not parseable for grades.
