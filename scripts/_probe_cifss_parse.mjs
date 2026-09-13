#!/usr/bin/env node
const UA = "TakkleIngestionBot/1.0 (+https://takkle.com)";

const urls = [
  "https://cifss.org/allcifss/2025-26-football-11/",
  "https://cifss.org/allcifss/2025-26-football-8/",
  "https://cifss.org/allcifss/2024-25-football-11/",
  "https://cifss.org/allcifss/2024-25-football-8/",
  "https://cifss.org/allcifss/2023-24-football-11/",
  "https://cifss.org/allcifss/2023-24-football-8/",
  "https://cifss.org/allcifss/2022-23-football-11/",
  "https://cifss.org/allcifss/2022-23-football-8/",
  "https://cifss.org/allcifss/2021-22-football-11/",
  "https://cifss.org/allcifss/2021-football-8/",
  "https://cifss.org/allcifss/2019-football/",
  "https://cifss.org/allcifss/2018-19-football/",
  "https://cifss.org/allcifss/2017-18-football/",
  "https://cifss.org/allcifss/2016-17-football/",
  "https://cifss.org/allcifss/2015-16-football/",
  "https://cifss.org/allcifss/2014-15-football/",
  "https://cifss.org/allcifss/2013-14-football/",
  "https://cifss.org/allcifss/50536/",
  "https://cifss.org/allcifss/2019-8-man-football/",
  "https://cifss.org/allcifss/2017-8-man-football/",
  "https://cifss.org/allcifss/2016-8-man-football/",
  "https://cifss.org/allcifss/2015-8-man-football/",
  "https://cifss.org/allcifss/2014-8-man-football/",
  "https://cifss.org/allcifss/2013-8-man-football/",
  "https://cifss.org/allcifss/2012-8-man-football/",
  "https://cifss.org/allcifss/2011-8-man-football/",
  "https://cifss.org/allcifss/2009-8-man-football/",
  "https://cifss.org/allcifss/2008-8-man-football/",
  "https://cifss.org/allcifss/2007-8-man-football/",
  "https://cifss.org/allcifss/2006-8-man-football/",
];

function decodeHtml(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;|&quot;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRows(html) {
  const rowRe =
    /<tr[^>]*>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<\/tr>/gi;
  let n = 0;
  let m;
  while ((m = rowRe.exec(html))) {
    const name = decodeHtml(m[1]);
    const school = decodeHtml(m[2]);
    if (!name || /^name$/i.test(name) || !school || /^school$/i.test(school)) continue;
    n++;
  }
  return n;
}

for (const url of urls) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const html = await res.text();
  const parsed = parseRows(html);
  const title = (html.match(/<title>([^<]+)/i) || [, ""])[1].slice(0, 70);
  const hasPdf = /application\/pdf|\.pdf/i.test(html);
  console.log(res.status, `parsed=${parsed}`, hasPdf ? "pdf?" : "", url.replace("https://cifss.org/allcifss/", ""), title);
  await new Promise((r) => setTimeout(r, 150));
}
