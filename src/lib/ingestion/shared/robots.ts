/**
 * Lightweight robots.txt checker for ingestion adapters.
 * Never bypasses disallow rules.
 */

export interface RobotsDecision {
  allowed: boolean;
  robotsUrl: string;
  matchedRule?: string;
  notes: string;
}

const cache = new Map<string, { fetchedAt: number; body: string | null; status: number }>();

const USER_AGENT = "TakkleIngestionBot/1.0 (+https://takkle.com; permitted public sources only)";

export async function fetchRobotsTxt(origin: string): Promise<{ body: string | null; status: number }> {
  const robotsUrl = new URL("/robots.txt", origin).toString();
  const cached = cache.get(robotsUrl);
  if (cached && Date.now() - cached.fetchedAt < 6 * 60 * 60 * 1000) {
    return { body: cached.body, status: cached.status };
  }

  try {
    const res = await fetch(robotsUrl, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/plain,*/*" },
      redirect: "follow",
    });
    const text = res.ok ? await res.text() : null;
    const entry = { fetchedAt: Date.now(), body: text, status: res.status };
    cache.set(robotsUrl, entry);
    return { body: entry.body, status: entry.status };
  } catch {
    const entry = { fetchedAt: Date.now(), body: null, status: 0 };
    cache.set(robotsUrl, entry);
    return entry;
  }
}

function pathAllowed(robotsBody: string, path: string, userAgent = USER_AGENT): boolean {
  const lines = robotsBody.split(/\r?\n/);
  let inRelevant = false;
  const allows: string[] = [];
  const disallows: string[] = [];

  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    const k = key.toLowerCase();
    if (k === "user-agent") {
      const ua = value.toLowerCase();
      inRelevant = ua === "*" || USER_AGENT.toLowerCase().includes(ua.replace("*", ""));
      continue;
    }
    if (!inRelevant) continue;
    if (k === "disallow") disallows.push(value);
    if (k === "allow") allows.push(value);
  }

  const matches = (rule: string) => {
    if (rule === "") return false; // empty Disallow = allow all
    if (rule === "/") return true;
    return path.startsWith(rule);
  };

  // Longest Allow wins over Disallow when both match (common convention).
  let bestAllow = -1;
  let bestDisallow = -1;
  for (const a of allows) if (matches(a)) bestAllow = Math.max(bestAllow, a.length);
  for (const d of disallows) {
    if (d === "") continue;
    if (matches(d)) bestDisallow = Math.max(bestDisallow, d.length);
  }
  if (bestAllow < 0 && bestDisallow < 0) return true;
  if (bestAllow >= bestDisallow) return true;
  return false;
}

export async function isUrlAllowed(url: string): Promise<RobotsDecision> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      allowed: false,
      robotsUrl: "",
      notes: "Invalid URL",
    };
  }

  const robotsUrl = `${parsed.origin}/robots.txt`;
  const { body, status } = await fetchRobotsTxt(parsed.origin);

  if (status === 404 || body == null) {
    return {
      allowed: true,
      robotsUrl,
      notes: "No robots.txt (or unreachable) — proceeding cautiously for public association pages only.",
    };
  }

  const allowed = pathAllowed(body, parsed.pathname + parsed.search);
  return {
    allowed,
    robotsUrl,
    matchedRule: allowed ? undefined : "disallow matched",
    notes: allowed ? "Allowed by robots.txt" : "Blocked by robots.txt",
  };
}

export { USER_AGENT };
