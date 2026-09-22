"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Player } from "@/types/recruiting";
import { STAT_PROVIDERS } from "@/lib/profile/links";
import Button from "@/components/ui/Button";
import FilmWindow from "@/components/film/FilmWindow";
import { playerSchoolName } from "@/lib/player-display";

const inputClass = "mt-1 w-full rounded-lg border border-border bg-field px-3 py-2.5 text-text-primary focus-visible:outline-2 focus-visible:outline-accent";

export default function PlayerProfileEditor({ player }: { player: Player }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function save(payload: Record<string, unknown>, form?: HTMLFormElement) {
    setBusy(true); setNotice(""); setError("");
    try {
      const response = await fetch(`/api/players/${player.id}/content`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Couldn’t save. Please try again.");
      setNotice("Saved to your public profile.");
      form?.reset();
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Connection lost. Please try again."); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>, action: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    if (action === "details") {
      void save({ ...fields, action, heightInches: fields.heightInches ? Number(fields.heightInches) : null, weightLbs: fields.weightLbs ? Number(fields.weightLbs) : null });
    } else {
      void save({ ...fields, action, ...(action === "film" ? { seasonYear: Number(fields.seasonYear) } : {}) }, form);
    }
  }

  return (
    <div className="space-y-8">
      <div aria-live="polite" className="sticky top-2 z-10">
        {notice && <p className="rounded-lg border border-turf bg-field p-3 text-text-primary" role="status">{notice}</p>}
        {error && <p className="rounded-lg border border-status-limited bg-field p-3 text-text-primary" role="alert">{error}</p>}
      </div>
      <form onSubmit={event => submit(event, "details")} className="rounded-xl border border-border bg-bg-card p-5 sm:p-6">
        <h2 className="text-2xl">Player details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-text-secondary">First name<input name="firstName" required maxLength={80} defaultValue={player.firstName} className={inputClass} /></label>
          <label className="text-sm text-text-secondary">Last name<input name="lastName" required maxLength={80} defaultValue={player.lastName} className={inputClass} /></label>
          <label className="text-sm text-text-secondary sm:col-span-2">College / school<input name="collegeName" required minLength={2} maxLength={160} defaultValue={playerSchoolName(player) === "School not listed" ? "" : playerSchoolName(player)} className={inputClass} /></label>
          <label className="text-sm text-text-secondary">Height (inches)<input name="heightInches" type="number" min={48} max={96} step="0.1" placeholder="e.g. 74" defaultValue={player.heightInches || ""} className={inputClass} /></label>
          <label className="text-sm text-text-secondary">Weight (lbs)<input name="weightLbs" type="number" min={80} max={500} step="1" placeholder="e.g. 215" defaultValue={player.weightLbs || ""} className={inputClass} /></label>
        </div>
        <p className="mt-3 text-sm text-text-secondary">Leave a measurement blank if it isn’t available.</p>
        <Button type="submit" disabled={busy} className="mt-5">{busy ? "Saving…" : "Save player details"}</Button>
      </form>

      <section className="rounded-xl border border-border bg-bg-card p-5 sm:p-6">
        <h2 className="text-2xl">Connect stats & recruiting profiles</h2>
        <p className="mt-2 max-w-prose text-sm text-text-secondary">Link your player or stats page so coaches can see your record. Links are player-provided; stats aren’t automatically imported or verified.</p>
        <ul className="mt-4 divide-y divide-border">
          {(player.externalProfiles ?? []).map(source => <li key={source.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer" className="min-w-0 break-words text-accent hover:underline">{source.label}</a>
            <Button variant="secondary" disabled={busy} onClick={() => void save({ action: "remove_source", id: source.id })}>Remove {STAT_PROVIDERS[source.provider].label}</Button>
          </li>)}
        </ul>
        <form onSubmit={event => submit(event, "source")} className="mt-5 space-y-4">
          <label className="block text-sm text-text-secondary">Source<select name="provider" className={inputClass}>{Object.entries(STAT_PROVIDERS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
          <label className="block text-sm text-text-secondary">Link title<input name="label" required maxLength={100} placeholder="e.g. Senior season stats" className={inputClass} /></label>
          <label className="block text-sm text-text-secondary">Player or stats page URL<input name="url" type="url" required maxLength={2048} placeholder="https://www.maxpreps.com/…" className={inputClass} /></label>
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Connect stats page"}</Button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-bg-card p-5 sm:p-6">
        <h2 className="text-2xl">YouTube film</h2>
        <p className="mt-2 text-sm text-text-secondary">Add a public or unlisted YouTube video with embedding enabled. Your film will appear on your profile.</p>
        {player.film.length > 0 && <div className="mt-4"><FilmWindow films={player.film} /></div>}
        <ul className="mt-3 divide-y divide-border">{player.film.map(film => <li key={film.id} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="break-words">{film.title}</span><Button variant="secondary" disabled={busy} onClick={() => void save({ action: "remove_film", id: film.id })}>Remove film</Button></li>)}</ul>
        <form onSubmit={event => submit(event, "film")} className="mt-5 space-y-4">
          <label className="block text-sm text-text-secondary">Film title<input name="title" required maxLength={140} placeholder="e.g. 2026 season highlights" className={inputClass} /></label>
          <label className="block text-sm text-text-secondary">YouTube video URL<input name="url" type="url" required maxLength={2048} placeholder="https://youtu.be/…" className={inputClass} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-text-secondary">Film type<select name="filmType" className={inputClass}><option value="highlights">Highlights</option><option value="full_game">Full game</option><option value="game_film">Game film</option><option value="individual_clips">Individual clips</option><option value="training">Training</option><option value="camp">Camp</option><option value="combine">Combine</option></select></label>
            <label className="text-sm text-text-secondary">Season year<input name="seasonYear" type="number" required min={2000} max={2100} defaultValue={new Date().getFullYear()} className={inputClass} /></label>
          </div>
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Add YouTube film"}</Button>
        </form>
      </section>
    </div>
  );
}
