# CollegeFootballData (CFBD) recruiting cache

Private cache produced by `npm run import:cfbd-recruits`.

- **Do not** republish these files as a public mirror/API dump (CFBD ToS).
- Safe to use as Takkle app data: names, schools, positions, class years, measurables.
- Star ratings / CFBD rating are provenance-only in player JSON — never shown as Takkle rank.

## Regenerate

```bash
# .env
CFBD_API_KEY=your_key_from_https://collegefootballdata.com

npm run import:cfbd-recruits
# or embed full set into seed sample for local UI:
npm run import:cfbd-recruits -- --embed-all

# App switch
TAKKLE_PLAYERS_SOURCE=cfbd
```

## Coverage note

CFBD recruiting endpoints list **ranked / known prospects** for a class year — not every varsity high-school player. Expect thousands of tip-of-funnel names, not full school rosters.
