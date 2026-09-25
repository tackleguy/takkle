# College player fields (getter contract)

**Product surface:** NCAA football **FBS**, **FCS**, **DII** (`d2`), and **DIII** (`d3`).  
High-school rows stay in `takkle.players` with `competition_level = 'hs'` and are **dormant** (filtered out of Discover / Rankings / Claim).

Do **not** fabricate athletes. Prefer CFBD, ESPN public APIs, NCAA/public pages, school athletics rosters. No MaxPreps / 247 / Rivals / On3 scrape.

DII/DIII roster ingest: `node --env-file=.env.local scripts/ingest-espn-d2-d3.mjs` (ESPN groups 57/58).

## Required on every college upsert

| Field | Value | Notes |
|-------|--------|--------|
| `competition_level` | `"college"` | **Required.** Default in DB is `hs`; omitting this leaves the row dormant. |
| `division` | `"fbs"` \| `"fcs"` \| `"d2"` \| `"d3"` | Required for product filters. |
| `first_name`, `last_name`, `slug`, `id` | real athlete | Stable UUID per athlete; slug unique. |
| `college_name` | e.g. `"Alabama"` | Denormalized school name for UI/search. |
| `school_name` / `school_slug` / `school_id` | college as school row | Used by `bulk_upsert_players`; `college_name` falls back to `school_name` if omitted. |
| `position` | roster position | Prefer Takkle codes (QB, RB, WR, …) when mappable. |
| `source_url`, `source_name`, `source_type` | provenance | Real source only. |
| `is_synthetic` | `false` | Always. |

## Strongly recommended

| Field | Notes |
|-------|--------|
| `class_year` | Eligibility / expected final year when known (college: **2018–2035** or null). Do **not** force HS 2027–2031 on college rows. |
| `eligibility_year` | Same idea when distinct from `class_year` (optional). |
| `conference` | e.g. SEC, Big Ten, CAA. |
| `state_code` | School or hometown state when known. |
| `height_inches`, `weight_lbs`, `jersey_number`, `hometown_city` | When on roster. |
| `season_year` | Links `player_seasons` if season row exists. |
| `source_school` | Often same as `college_name` for search. |

## Transfer portal stubs (optional now)

| Field | Allowed values |
|-------|----------------|
| `transfer_portal_status` | `not_in_portal` \| `entered` \| `withdrawn` \| `committed` \| `enrolled` \| `unknown` |
| `portal_entry_date` | date athlete entered portal |
| `transfer_from_school` | previous school |
| `transfer_to_school` | destination when known |

NIL deal tables are **out of scope** for getters; identity + school + position + eligibility is enough for the NIL portal surface.

## `bulk_upsert_players` JSON shape (college)

Same RPC as HS ingest; add college keys:

```json
{
  "id": "<uuid>",
  "first_name": "John",
  "last_name": "Doe",
  "slug": "john-doe-alabama-qb",
  "position": "QB",
  "class_year": 2027,
  "school_id": "<uuid>",
  "school_name": "Alabama",
  "school_slug": "alabama",
  "state_code": "AL",
  "source_url": "https://...",
  "source_type": "official_roster",
  "source_name": "cfbd",
  "source_school": "Alabama",
  "season_year": 2025,
  "competition_level": "college",
  "division": "fbs",
  "college_name": "Alabama",
  "conference": "SEC",
  "eligibility_year": 2027,
  "transfer_portal_status": "not_in_portal"
}
```

## Class-year constraint (important)

- `competition_level = 'hs'` → `class_year` **must** be 2027–2031.
- `competition_level = 'college'` → `class_year` may be **null** or 2018–2035.

If a college insert fails on class year, set `competition_level` first (or use a valid college year / null).

## UI defaults

Discover, Home, Rankings, and Claim search query:

`competition_level = 'college'` AND `is_synthetic = false`

HS inventory remains in DB until explicitly re-enabled.
