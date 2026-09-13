#!/usr/bin/env node
const UA = "TakkleIngestionBot/1.0 (+https://takkle.com)";

const seasons = [
  "2021-22-football-11",
  "2020-21-football-11",
  "2019-20-football-11",
  "2018-19-football-11",
  "2017-18-football-11",
  "2016-17-football-11",
  "2015-16-football-11",
  "2014-15-football-11",
  "2024-25-football-8",
  "2023-24-football-8",
  "2022-23-football-8",
  "2021-22-football-8",
  "2020-21-football-8",
  "2019-20-football-8",
  "2018-19-football-8",
  "2017-18-football-8",
];

async function probeCifss() {
  console.log("=== CIF-SS season probe ===");
  for (const path of seasons) {
    const url = `https://cifss.org/allcifss/${path}/`;
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
    const html = await res.text();
    const rows = (html.match(/<tr/gi) || []).length;
    const title = (html.match(/<title>([^<]+)/i) || [, ""])[1].slice(0, 80);
    console.log(res.status, `rows=${rows}`, path, title);
    await new Promise((r) => setTimeout(r, 200));
  }
  for (const sport of ["football-11", "football-8"]) {
    const url = `https://cifss.org/allcifss/?_sports=${sport}`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    const html = await res.text();
    const hrefs = [
      ...new Set(
        [...html.matchAll(/href="(https:\/\/cifss\.org\/allcifss\/[^"?#]+)/g)].map(
          (m) => m[1],
        ),
      ),
    ];
    console.log(sport, "sample hrefs", hrefs.slice(0, 40));
  }
}

async function probeTswa() {
  console.log("=== TSWA years ===");
  const years = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 21, 22, 23, 24, 25];
  const entryRe =
    /([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)+),\s*([A-Za-z0-9 .'\-\/]+?),\s*(?:\d-\d{1,2},?\s*)?(?:\d{2,3},?\s*)?(sr|jr|so|fr|soph|senior|junior|sophomore|freshman)\.?/g;
  let total = 0;
  for (const y of years) {
    const yy = String(y).padStart(2, "0");
    const url = `https://txswa.org/allstatefootball${yy}.php`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    const html = await res.text();
    const text = html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ");
    const seen = new Set();
    let n = 0;
    let m;
    entryRe.lastIndex = 0;
    while ((m = entryRe.exec(text))) {
      const k = `${m[1]}|${m[2]}`.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      n++;
    }
    total += n;
    console.log(`tswa${yy}`, res.status, n);
    await new Promise((r) => setTimeout(r, 150));
  }
  console.log("TSWA total raw", total);
}

await probeCifss();
await probeTswa();
