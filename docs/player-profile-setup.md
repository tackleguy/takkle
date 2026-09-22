# Player profiles, connected stats, and YouTube film

The player editor lives at `/site/player/[slug]/edit`. It unlocks only when the signed-in user has a verified, non-revoked `player_accounts` grant. Visitors can view public player details, player-confirmed film, and connected stats pages.

## Deployment

1. Apply `supabase/migrations/20260922053837_player_profile_connections.sql`, `20260922055234_repair_college_roster_identity.sql`, and `20260922061313_fix_account_self_access.sql` after the existing migrations, using the project's normal Supabase migration process.
2. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the server-only `SUPABASE_SERVICE_ROLE_KEY` as shown in `.env.example`. Expose the existing `takkle` schema to the Data API.
3. Ensure college roster records exist in the live database. The bundled roster supports browsing without credentials; fallback records cannot be claimed until they exist in the database.
4. Existing trusted admins review pending claims at `/admin/claims`. Independently verify the submitted school email/roster evidence before approving. Approval atomically records ownership and opens editing. There is no automatic approval based on a matching name or a submitted email.

The migration removes direct client writes to player details, film, claims, and ownership. Those writes now use authenticated server endpoints with explicit ownership checks. It also prevents client edits to account roles. Review any external clients that previously wrote directly to those tables before rollout.

## Account setup

Signup, login, confirmation, password recovery, and `/account` use the public Supabase key and the user's session. Claim submission, review, and profile editing additionally require the server secret. All keys must belong to the same project. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and server-only `SUPABASE_SECRET_KEY` are supported alternatives to the legacy anon and service-role names.

In Supabase Auth URL Configuration, set the Site URL to the production site and allow `https://takkle-xi.vercel.app/auth/callback**` (plus the corresponding callback for any custom domain). Add `http://127.0.0.1:3100/auth/callback**` only for development. Keep email confirmation enabled if desired: signup now waits for confirmation instead of attempting an invalid immediate login. The default Supabase confirmation/recovery templates follow the configured callback through the PKCE flow, using the same browser that requested the email. For cross-device links, use the existing `/auth/confirm` token-hash endpoint in email templates with `token_hash={{ .TokenHash }}` and the appropriate `type` (`signup`, `invite`, or `recovery`); recovery opens the password form.

Public signup supports player, parent, recruiter, coach, and business accounts. School and admin roles require a trusted administrator to provision them; user-editable metadata cannot grant those roles. Existing roles and inactive-account flags are preserved. The account migration removes recursive self-read policies and backfills missing application profiles for existing Auth users.

After deployment, verify signup and confirmation for each public role, login and logout, password recovery, and a verified player's profile editor. Verify a normal account cannot enter `/admin`. An existing trusted admin should be able to review claims. These hosted checks require access to the same Supabase project configured in Vercel.

## Linked sources

Players can add, update by reconnecting the same URL, or remove links to MaxPreps, 247Sports, On3, ESPN, Hudl, or another HTTPS stats/roster page. These are labeled player-provided links. No third-party stats are scraped or synchronized. Existing stored player stats are loaded on profiles.

YouTube watch, short share, Shorts, live, and embed links are normalized to `youtube-nocookie.com` embeds. Videos must allow embedding; a direct YouTube link remains available if playback is unavailable.

## College roster corrections

`src/data/seed/college-profile-corrections.json` contains 95 source-backed corrections to records damaged by the old ESPN transfer-ranking import. Each entry carries its source URL and verification timestamp. It replaces display names, school labels, and measurements only for unclaimed records whose original source is that import. Athlete IDs and profile URLs are preserved, as are claimed owners' edits. Historical transfer claims are not reverified by this patch. Missing measurements elsewhere display “Not listed”; they are never fabricated.

## Verification

- `npm test`: formatting, source/YouTube URL validation, API authorization, ownership conditions, and a local Postgres-compatible PGlite migration test including privilege escalation and atomic claim approval.
- `npm run typecheck`
- `npm run build` (the existing Google Font requires network access).

A complete hosted Auth/browser round trip also requires the configured Supabase project, migration, and a test player account. Local tests do not publish changes or mutate the hosted database.
