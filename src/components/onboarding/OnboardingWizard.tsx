"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import ClaimProfileSearch, { type ClaimProfileSelection } from "@/components/onboarding/ClaimProfileSearch";

export default function OnboardingWizard({ initialPlayer = null, signedIn = false, available = false }: { initialPlayer?: ClaimProfileSelection | null; signedIn?: boolean; available?: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<ClaimProfileSelection | null>(initialPlayer);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true); setError("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/claims", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...fields, playerSlug: selected.slug }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn’t submit your claim.");
      setSubmitted(true); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Connection lost. Try again."); }
    finally { setBusy(false); }
  }
  const next = `/onboarding${selected ? `?player=${encodeURIComponent(selected.slug)}` : ""}`;
  return <div className="mx-auto max-w-2xl rounded-xl border border-border bg-bg-card p-5 sm:p-8">
    {submitted ? <div role="status">
      <h2 className="text-2xl">Your claim is under review</h2>
      <p className="mt-2 text-text-secondary">We’ll check your details before unlocking editing. Once approved, you can update your school and measurements, connect stats pages, and add YouTube film.</p>
      <Link href={`/site/player/${selected?.slug}/edit`} className="mt-4 inline-block text-accent hover:underline">Check profile access</Link>
    </div> : <>
      <h2 className="text-2xl">Find your college profile</h2>
      <p className="mt-2 text-sm text-text-secondary">Search your name or school, then select your roster record.</p>
      <ClaimProfileSearch className="mt-4" selectedSlug={selected?.slug ?? null} initialQuery={initialPlayer?.displayName} onSelect={player => { setSelected(player); setError(""); }} />
      {selected && <div className="mt-6 border-t border-border pt-6">
        <h3 className="text-2xl">{selected.displayName}</h3>
        <p className="mt-1 text-text-secondary">{selected.schoolName} · {selected.position}</p>
        <Link href={`/site/player/${selected.slug}`} className="mt-2 inline-block text-sm text-accent hover:underline">View player profile</Link>
        {!available ? <p className="mt-4 text-sm text-text-secondary">Claim submissions are temporarily unavailable. You can still browse player profiles.</p> : !signedIn ? <div className="mt-4"><p className="mb-3 text-sm text-text-secondary">Sign in to securely submit and track your claim.</p><Button href={`/auth/login?next=${encodeURIComponent(next)}`}>Sign in to claim</Button><Link href={`/auth/signup?next=${encodeURIComponent(next)}`} className="ml-4 text-accent hover:underline">Create account</Link></div> :
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block text-sm text-text-secondary">School email<input name="schoolEmail" type="email" autoComplete="email" required maxLength={254} className="mt-1 w-full rounded-lg border border-border bg-field px-4 py-3 text-text-primary focus-visible:outline-accent" /></label>
            <label className="block text-sm text-text-secondary">Verification details<textarea name="notes" required minLength={20} maxLength={2000} rows={4} aria-describedby="verification-help" className="mt-1 w-full rounded-lg border border-border bg-field px-4 py-3 text-text-primary focus-visible:outline-accent" /></label>
            <p id="verification-help" className="text-sm text-text-secondary">Include an official roster link, your jersey number and season, or a school contact who can verify you. Don’t include private identity documents here.</p>
            <label className="flex items-start gap-3 text-sm text-text-secondary"><input type="checkbox" required className="mt-1 accent-accent" />I am this player or their authorized guardian. I understand that editing unlocks after verification.</label>
            {error && <p role="alert" className="text-sm text-text-primary">{error}</p>}
            <Button type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit claim for review"}</Button>
          </form>}
      </div>}
    </>}
  </div>;
}
