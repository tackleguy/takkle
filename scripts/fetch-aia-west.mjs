import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const USER_AGENT =
  "TakkleIngestionBot/1.0 (+https://takkle.com; permitted public sources only)";
const DELAY = 10000;
const AIA_CONFS = [
  { id: 12070, label: "6A" },
  { id: 12074, label: "5A" },
  { id: 12078, label: "4A" },
  { id: 12082, label: "3A" },
  { id: 12086, label: "2A" },
  { id: 12096, label: "1A" },
];
const AIA_REGIONS = [
  { id: 12161, label: "6A Central" },
  { id: 12169, label: "6A Desert Valley" },
  { id: 12159, label: "6A East Valley" },
  { id: 12157, label: "6A Fiesta" },
  { id: 12167, label: "6A Southeast" },
  { id: 12155, label: "6A Southern" },
  { id: 12101, label: "5A Central Valley" },
  { id: 12103, label: "5A Desert West" },
  { id: 12105, label: "5A Metro" },
  { id: 12107, label: "5A Northeast Valley" },
  { id: 12109, label: "5A Northwest" },
  { id: 12111, label: "5A San Tan" },
  { id: 12113, label: "5A Sonoran" },
  { id: 12115, label: "5A Southern" },
  { id: 12217, label: "4A Black Canyon" },
  { id: 12219, label: "4A Copper Sky" },
  { id: 12221, label: "4A Desert Sky" },
  { id: 12223, label: "4A Desert Southwest" },
  { id: 12227, label: "4A Gila" },
  { id: 12229, label: "4A Grand Canyon" },
  { id: 12231, label: "4A Kino" },
  { id: 12233, label: "4A Skyline" },
  { id: 12235, label: "4A Southwest" },
  { id: 12239, label: "4A West Valley" },
  { id: 12137, label: "3A East" },
  { id: 12139, label: "3A Metro" },
  { id: 12141, label: "3A Mountain" },
  { id: 12143, label: "3A North" },
  { id: 12145, label: "3A West" },
  { id: 12099, label: "2A East" },
  { id: 12260, label: "2A Metro 1" },
  { id: 12262, label: "2A Metro 2" },
  { id: 12264, label: "2A Metro 3" },
  { id: 12266, label: "2A Metro 4" },
  { id: 12268, label: "2A Metro 5" },
  { id: 12270, label: "2A North 1" },
  { id: 12272, label: "2A North 2" },
  { id: 12276, label: "2A South 1" },
  { id: 12280, label: "2A South 2" },
  { id: 12243, label: "1A East" },
  { id: 12245, label: "1A North" },
  { id: 12247, label: "1A South" },
  { id: 12249, label: "1A West" },
];
const YEARS = [
  { yearParam: 2024, seasonEnd: 2025 },
  { yearParam: 2023, seasonEnd: 2024 },
  { yearParam: 2022, seasonEnd: 2023 },
  { yearParam: 2021, seasonEnd: 2022 },
];
const POS = {
  "defensive backs": "DB",
  "defensive back": "DB",
  "defensive lineman": "DL",
  "defensive linemen": "DL",
  "offensive lineman": "OL",
  "offensive linemen": "OL",
  linebackers: "LB",
  linebacker: "LB",
  "running backs": "RB",
  "wide receivers": "WR",
  "receivers/tight ends": "WR",
  quarterbacks: "QB",
  kickers: "K",
  placekicker: "K",
  punters: "P",
  cornerbacks: "DB",
  safeties: "DB",
  "tight ends": "TE",
  athletes: "ATH",
  "kickoff returner": "ATH",
  "punt returner": "ATH",
  "long snapper": "ATH",
  "defensive utility/flex player": "ATH",
  "offensive utility/flex player": "ATH",
};
function splitName(name) {
  const p = String(name).trim().split(/\s+/).filter(Boolean);
  if (!p.length) return { firstName: "", lastName: "" };
  if (p.length === 1) return { firstName: p[0], lastName: p[0] };
  return { firstName: p[0], lastName: p.slice(1).join(" ") };
}
function normPos(raw) {
  if (!raw) return null;
  const k = String(raw).trim().toLowerCase().replace(/\s+/g, " ");
  if (/conference|player of the year|coach/i.test(k)) return null;
  return POS[k] || null;
}
function parseAia(html, seasonEnd, url, tierLabel) {
  const players = [];
  const seen = new Set();
  const groupRe =
    /<div class="column recognition-group">([\s\S]*?)(?=<div class="column recognition-group">|$)/gi;
  let g;
  while ((g = groupRe.exec(html))) {
    const chunk = g[1];
    const titleM = chunk.match(/<div class="title">\s*([^<]+)/i);
    const honor = titleM ? titleM[1].replace(/\s+/g, " ").trim() : "";
    if (/coach of the year/i.test(honor)) continue;
    const cols = [
      ...chunk.matchAll(/<div class="column is-4">\s*(?:<div>)?\s*([^<\n]+)/gi),
    ].map((m) => m[1].replace(/\s+/g, " ").trim());
    for (let i = 0; i + 2 < cols.length; i += 3) {
      const [nameRaw, schoolRaw, posRaw] = [cols[i], cols[i + 1], cols[i + 2]];
      if (!nameRaw || !schoolRaw || /^name$/i.test(nameRaw)) continue;
      if (/^coach$/i.test(posRaw) || /coach/i.test(nameRaw)) continue;
      const { firstName, lastName } = splitName(nameRaw);
      if (!firstName || !lastName || schoolRaw.length < 2) continue;
      const school = schoolRaw.trim();
      const key = `${firstName}|${lastName}|${school}|${seasonEnd}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      players.push({
        firstName,
        lastName,
        position: normPos(posRaw),
        classYear: null,
        schoolName: school,
        stateCode: "AZ",
        seasonYear: seasonEnd,
        sourceUrl: url,
        sourceName: "AIA AZPreps365 Football Recognitions",
        sourceType: "state_association",
        sourceState: "AZ",
        sourceSchool: school,
        raw: { honor, tier: tierLabel },
      });
    }
  }
  return players;
}

const tiers = process.argv.includes("--conferences-only") ? [...AIA_CONFS] : [...AIA_CONFS, ...AIA_REGIONS];
const all = [];
const seen = new Set();
const errors = [];
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = join("data/ingestion", `run-west-aia-${stamp}`);
mkdirSync(outDir, { recursive: true });
console.log("out", outDir, "pages", tiers.length * YEARS.length);
for (const year of YEARS) {
  for (const tier of tiers) {
    const url = `https://azpreps365.com/recognitions/filter?activity=football&tier=${tier.id}&year=${year.yearParam}`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        redirect: "follow",
      });
      if (!res.ok) {
        errors.push(`${url} ${res.status}`);
        console.log("ERR", tier.label, year.yearParam, res.status);
      } else {
        const html = await res.text();
        const parsed = parseAia(html, year.seasonEnd, url, tier.label);
        let added = 0;
        for (const p of parsed) {
          const key =
            `${p.firstName}|${p.lastName}|${p.schoolName}|${p.seasonYear}`.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          all.push(p);
          added++;
        }
        console.log(
          `AIA ${year.yearParam} ${tier.label}: +${added} (page ${parsed.length}) total=${all.length}`,
        );
        // checkpoint every ~10 pages
        writeFileSync(join(outDir, "players.partial.json"), JSON.stringify(all));
        writeFileSync(join(outDir, "progress.json"), JSON.stringify({total:all.length, last:`${year.yearParam} ${tier.label}`}));
      }
    } catch (e) {
      errors.push(String(e));
      console.log("EX", e.message);
    }
    await new Promise((r) => setTimeout(r, DELAY));
  }
}
writeFileSync(join(outDir, "players.json"), JSON.stringify(all, null, 2));
writeFileSync(
  join(outDir, "summary.json"),
  JSON.stringify({ players: all.length, errors, outDir }, null, 2),
);
console.log("DONE", all.length);
