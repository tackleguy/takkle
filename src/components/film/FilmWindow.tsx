import type { PlayerFilm } from "@/types/recruiting";
import Badge from "@/components/ui/Badge";

interface FilmWindowProps {
  films: PlayerFilm[];
}

export default function FilmWindow({ films }: FilmWindowProps) {
  const primary = films[0];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-field">
      <div className="relative aspect-video bg-gradient-to-br from-field via-bg-primary to-field">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,106,0,0.12),transparent_60%)]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-accent/60 bg-accent/10">
            <svg className="h-8 w-8 text-accent" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <p className="font-[family-name:var(--font-display)] text-xl tracking-wide text-text-primary">
            {primary?.title ?? "No film uploaded"}
          </p>
          <p className="mt-2 max-w-md text-sm text-text-muted">
            Film window — live embed when verified film is linked.
          </p>
          {primary && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Badge tone="accent">{primary.filmType.replace(/_/g, " ")}</Badge>
              {primary.seasonYear && <Badge>{primary.seasonYear}</Badge>}
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-60" />
      </div>
      {films.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-t border-border p-3">
          {films.map((film) => (
            <div
              key={film.id}
              className="min-w-[140px] rounded-lg border border-border bg-bg-card px-3 py-2 text-xs text-text-secondary"
            >
              {film.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
