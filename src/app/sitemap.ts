import { MetadataRoute } from "next";
import { getAllSlugs } from "@/data/states";
import { getAllGuideSlugs } from "@/data/guides";
import { getAllPlayerSlugs } from "@/lib/players";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://takkle.com";

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/discover`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/rankings`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/onboarding`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/nil-rules`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/guides`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/newsletter`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/auth/login`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/auth/signup`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  const statePages: MetadataRoute.Sitemap = getAllSlugs().map((slug) => ({
    url: `${baseUrl}/nil-rules/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  const guidePages: MetadataRoute.Sitemap = getAllGuideSlugs().map((slug) => ({
    url: `${baseUrl}/guides/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const playerPages: MetadataRoute.Sitemap = getAllPlayerSlugs()
    .slice(0, 200)
    .map((slug) => ({
      url: `${baseUrl}/site/player/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  return [...staticPages, ...statePages, ...guidePages, ...playerPages];
}
