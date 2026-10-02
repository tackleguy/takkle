#!/usr/bin/env python3
"""Fetch ESPN FCS North/East conference rosters (public web API)."""
import json, time, urllib.request
from pathlib import Path

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
ROOT = Path(__file__).resolve().parent
ROSTER_DIR = ROOT / "rosters"
ROSTER_DIR.mkdir(parents=True, exist_ok=True)

CONFS = {
    48: "CAA",
    22: "Ivy",
    27: "Patriot",
    25: "NEC",
    28: "Pioneer",
    21: "MVFC",
    20: "Big Sky",
}
BIG_SKY_NORTH_LOCS = {
    "Eastern Washington",
    "Idaho",
    "Idaho State",
    "Montana",
    "Montana State",
    "Northern Colorado",
    "Portland State",
}

# Approximate home states for college schools (for schools.state_code)
STATE_BY_LOC = {
    "Towson": "MD", "New Hampshire": "NH", "Villanova": "PA", "Rhode Island": "RI",
    "Maine": "ME", "UAlbany": "NY", "Campbell": "NC", "Elon": "NC", "Hampton": "VA",
    "Monmouth": "NJ", "North Carolina A&T": "NC", "Stony Brook": "NY", "William & Mary": "VA",
    "Bryant": "RI", "Yale": "CT", "Harvard": "MA", "Dartmouth": "NH", "Princeton": "NJ",
    "Columbia": "NY", "Cornell": "NY", "Pennsylvania": "PA", "Brown": "RI",
    "Georgetown": "DC", "Holy Cross": "MA", "Richmond": "VA", "Lafayette": "PA",
    "Bucknell": "PA", "Colgate": "NY", "Fordham": "NY", "Lehigh": "PA",
    "Stonehill": "MA", "Central Connecticut": "CT", "Duquesne": "PA",
    "Long Island University": "NY", "Mercyhurst": "PA", "New Haven": "CT",
    "Robert Morris": "PA", "Saint Francis": "PA", "Wagner": "NY",
    "Stetson": "FL", "San Diego": "CA", "Butler": "IN", "Davidson": "NC",
    "Dayton": "OH", "Drake": "IA", "Marist": "NY", "Morehead State": "KY",
    "Presbyterian": "SC", "Valparaiso": "IN", "St. Thomas-Minnesota": "MN",
    "Southern Illinois": "IL", "Murray State": "KY", "North Dakota": "ND",
    "South Dakota": "SD", "Indiana State": "IN", "Illinois State": "IL",
    "North Dakota State": "ND", "Northern Iowa": "IA", "South Dakota State": "SD",
    "Youngstown State": "OH", "Idaho": "ID", "Montana State": "MT", "Montana": "MT",
    "Idaho State": "ID", "Eastern Washington": "WA", "Northern Colorado": "CO",
    "Portland State": "OR",
}

def get(url):
    url = url.replace("http://", "https://")
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def map_class_year(exp, season_year=2026):
    """Map college experience to an expected graduation/class year.
    FR->season+3, SO->+2, JR->+1, SR/GR->season (or None if we allow null).
    """
    if not exp:
        return None, None
    abbr = (exp.get("abbreviation") or "").upper()
    display = exp.get("displayValue") or abbr
    mapping = {
        "FR": season_year + 3,
        "SO": season_year + 2,
        "JR": season_year + 1,
        "SR": season_year,
        "GR": season_year,
        "REDSHIRT": season_year + 3,
    }
    # ESPN sometimes uses RS-FR etc in displayValue
    dv = (display or "").upper()
    if "RS-FR" in dv or "REDSHIRT FRESHMAN" in dv:
        return season_year + 4, display
    if "RS-SO" in dv:
        return season_year + 3, display
    if "RS-JR" in dv:
        return season_year + 2, display
    if "RS-SR" in dv:
        return season_year + 1, display
    return mapping.get(abbr), display

def main():
    teams = []
    for gid, cname in CONFS.items():
        payload = get(
            f"https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/2025/types/2/groups/{gid}/teams?limit=100"
        )
        for it in payload.get("items", []):
            t = get(it["$ref"])
            loc = t.get("location") or ""
            name = t.get("displayName") or f"{loc} {t.get('nickname','')}".strip()
            if cname == "Big Sky" and loc not in BIG_SKY_NORTH_LOCS:
                continue
            teams.append(
                {
                    "id": str(t.get("id")),
                    "name": name,
                    "location": loc,
                    "nickname": t.get("nickname"),
                    "abbreviation": t.get("abbreviation"),
                    "conference": cname,
                    "conference_id": gid,
                    "state_code": STATE_BY_LOC.get(loc, "US"),
                }
            )
            time.sleep(0.05)

    (ROOT / "teams.json").write_text(json.dumps(teams, indent=2))
    print(f"teams={len(teams)}")

    players = []
    errors = []
    for i, team in enumerate(teams):
        tid = team["id"]
        url = f"https://site.web.api.espn.com/apis/site/v2/sports/football/college-football/teams/{tid}/roster"
        try:
            d = get(url)
            season_year = (d.get("season") or {}).get("year") or 2026
            items = []
            for group in d.get("athletes") or []:
                pos_group = group.get("position")
                for ath in group.get("items") or []:
                    ath["_group"] = pos_group
                    items.append(ath)
            (ROSTER_DIR / f"{tid}.json").write_text(json.dumps({"team": team, "season": d.get("season"), "athletes": items}))
            for ath in items:
                fn = (ath.get("firstName") or "").strip()
                ln = (ath.get("lastName") or "").strip()
                if not fn or not ln or len(fn) < 2 or len(ln) < 2:
                    continue
                exp = ath.get("experience") or {}
                class_year, elig_label = map_class_year(exp, season_year)
                pos = (ath.get("position") or {}).get("abbreviation")
                bp = ath.get("birthPlace") or {}
                ht = ath.get("height")
                wt = ath.get("weight")
                jersey = ath.get("jersey")
                try:
                    jersey_i = int(jersey) if jersey not in (None, "") else None
                except Exception:
                    jersey_i = None
                players.append(
                    {
                        "espn_id": str(ath.get("id")),
                        "firstName": fn,
                        "lastName": ln,
                        "displayName": ath.get("displayName") or f"{fn} {ln}",
                        "position": pos,
                        "classYear": class_year,
                        "eligibilityLabel": elig_label,
                        "eligibilityYears": exp.get("years"),
                        "heightInches": int(ht) if ht else None,
                        "weightLbs": int(wt) if wt else None,
                        "jerseyNumber": jersey_i,
                        "hometownCity": bp.get("city"),
                        "hometownState": bp.get("state"),
                        "schoolName": team["name"],
                        "schoolLocation": team["location"],
                        "stateCode": team["state_code"],
                        "conference": team["conference"],
                        "teamId": tid,
                        "seasonYear": season_year,
                        "sourceUrl": f"https://www.espn.com/college-football/team/roster/_/id/{tid}",
                        "sourceName": "ESPN College Football Roster",
                        "sourceType": "media_public",
                        "playerLevel": "college",
                        "division": "fcs",
                        "collegeName": team["location"] or team["name"],
                    }
                )
            print(f"[{i+1}/{len(teams)}] {team['name']}: {len(items)} athletes")
        except Exception as e:
            errors.append({"team": team, "error": str(e)})
            print(f"[{i+1}/{len(teams)}] FAIL {team['name']}: {e}")
        time.sleep(0.12)

    (ROOT / "players.json").write_text(json.dumps(players))
    (ROOT / "errors.json").write_text(json.dumps(errors, indent=2))
    by_conf = {}
    for p in players:
        by_conf[p["conference"]] = by_conf.get(p["conference"], 0) + 1
    print("TOTAL_PLAYERS", len(players))
    print("BY_CONF", json.dumps(by_conf, indent=2))
    print("ERRORS", len(errors))

if __name__ == "__main__":
    main()
