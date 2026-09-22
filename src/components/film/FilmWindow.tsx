"use client";

import { useState } from "react";
import type { PlayerFilm } from "@/types/recruiting";
import Badge from "@/components/ui/Badge";
import { publicHttpsUrl, youtubeVideo } from "@/lib/profile/links";

export default function FilmWindow({ films }: { films: PlayerFilm[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const primary = films.find(film => film.id === selectedId) ?? films[0];
  const video = primary ? youtubeVideo(primary.sourceUrl || primary.embedUrl || "") : null;
  const source = primary?.sourceUrl ? publicHttpsUrl(primary.sourceUrl)?.toString() : null;
  return <div className="overflow-hidden rounded-xl border border-border bg-field">
    {video ? <iframe key={video.videoId} src={video.embedUrl} title={primary.title} className="aspect-video w-full border-0" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> :
      <div className="flex aspect-video flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-xl text-text-primary">{primary?.title ?? "No film linked yet"}</p>
        <p className="max-w-sm text-sm text-text-secondary">{primary ? "Open this film at its source." : "The player can add YouTube highlights after their profile claim is verified."}</p>
      </div>}
    {primary && <div className="space-y-2 border-t border-border p-4">
      <p className="font-medium text-text-primary">{primary.title}</p>
      <div className="flex flex-wrap items-center gap-2"><Badge>{primary.filmType.replace(/_/g, " ")}</Badge>{primary.seasonYear && <Badge>{primary.seasonYear}</Badge>}<span className="text-xs text-text-secondary">{primary.verificationStatus === "platform_verified" ? "Platform verified" : "Player-provided film"}</span></div>
      {source && <a href={source} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-accent hover:underline">{video ? "Watch on YouTube" : "Open film source"}</a>}
    </div>}
    {films.length > 1 && <div className="flex gap-2 overflow-x-auto border-t border-border p-3">{films.map(film => <button key={film.id} type="button" aria-pressed={primary?.id === film.id} onClick={() => setSelectedId(film.id)} className={`min-h-11 shrink-0 rounded-lg border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-accent ${primary?.id === film.id ? "border-accent text-accent" : "border-border text-text-secondary hover:text-text-primary"}`}>{film.title}</button>)}</div>}
  </div>;
}
