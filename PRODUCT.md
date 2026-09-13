# Takkle

## Product
Takkle is a player-first high-school football recruiting platform. Players claim verified profiles, showcase film, receive a proprietary Tackle Score™ (1.0–10.0, no star ratings), appear in platform rankings, and get discovered by recruiters. It is not a MaxPreps/247/On3 clone — it is the player's recruiting identity.

## Users
- High-school football players (including minors) claiming and building profiles
- Parents/guardians assisting verification and management
- College recruiters discovering talent
- Schools/programs verifying roster data (not owning player accounts)
- Platform admins moderating claims, scores, ingestion, and NIL resource links

## Jobs to be done
1. Find and securely claim my existing player record
2. Build a professional recruiting profile with film, stats, and measurements
3. Understand my Tackle Score™ and rankings
4. Be discoverable by recruiters
5. Check current High School NIL Rules (existing resource — permanent)

## Brand
Athletic, premium, fast, clean. Night-game energy: deep field navy, turf highlights, electric orange Takkle accent. Film-forward. Never star ratings. Never feel like a legacy stats database.

## Constraints
- `player_id != user_id`; profiles can exist unclaimed
- No facial recognition for minors
- No public home addresses, DOBs, private phones/emails
- Players cannot pay to raise Tackle Score™
- Respect source ToS / robots; no unauthorized recruiting-site scraping
- Keep High School NIL Rules resource permanently in nav, footer, and recruiting surfaces
- Initial dataset ~3,000 players; architecture must scale to millions

## Stack
Next.js, TypeScript, Supabase (Auth, Postgres, Storage), Vercel, Tailwind CSS
