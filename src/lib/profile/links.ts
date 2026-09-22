export const STAT_PROVIDERS = {
  maxpreps: { label: "MaxPreps", hosts: ["maxpreps.com"] },
  "247sports": { label: "247Sports", hosts: ["247sports.com"] },
  on3: { label: "On3", hosts: ["on3.com"] },
  espn: { label: "ESPN", hosts: ["espn.com"] },
  hudl: { label: "Hudl", hosts: ["hudl.com"] },
  other: { label: "Other stats or school roster", hosts: [] },
} as const;
export type StatProvider = keyof typeof STAT_PROVIDERS;

export function publicHttpsUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || url.port ||
      !host.includes(".") || host.endsWith(".local") || host.endsWith(".localhost") ||
      /^[\d.]+$/.test(host) || host.includes(":")) return null;
    return url;
  } catch { return null; }
}

export function normalizeStatsUrl(provider: StatProvider, raw: string): string | null {
  const url = publicHttpsUrl(raw);
  if (!url || url.pathname === "/") return null;
  const hosts: readonly string[] = STAT_PROVIDERS[provider]?.hosts ?? [];
  if (provider !== "other" && !hosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) return null;
  url.hash = "";
  return url.toString();
}

export function youtubeVideo(raw: string): { sourceUrl: string; embedUrl: string; videoId: string } | null {
  const url = publicHttpsUrl(raw);
  if (!url) return null;
  let id: string | null = null;
  if (["youtu.be", "www.youtu.be"].includes(url.hostname)) {
    id = url.pathname.slice(1);
  } else if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(url.hostname)) {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else id = url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})\/?$/)?.[1] ?? null;
  }
  if (!id || !/^[\w-]{11}$/.test(id)) return null;
  return { videoId: id, sourceUrl: `https://www.youtube.com/watch?v=${id}`, embedUrl: `https://www.youtube-nocookie.com/embed/${id}` };
}
