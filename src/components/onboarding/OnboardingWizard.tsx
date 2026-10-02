"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import ClaimProfileSearch, { type ClaimProfileSelection } from "@/components/onboarding/ClaimProfileSearch";

type EmailProof =
  | { method: "account_email"; domainVerified: boolean }
  | { method: "otp"; challengeId: string; proofToken?: string; domainVerified: boolean; devCode?: string };

export default function OnboardingWizard({
  initialPlayer = null,
  signedIn = false,
  available = false,
}: {
  initialPlayer?: ClaimProfileSelection | null;
  signedIn?: boolean;
  available?: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<ClaimProfileSelection | null>(initialPlayer);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [emailProof, setEmailProof] = useState<EmailProof | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpMessage, setOtpMessage] = useState("");

  async function startEmailProof() {
    if (!selected || !schoolEmail.trim()) return;
    setBusy(true);
    setError("");
    setOtpMessage("");
    try {
      const response = await fetch("/api/claims/email-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerSlug: selected.slug, schoolEmail: schoolEmail.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn’t start email verification.");
      if (data.verified && data.method === "account_email") {
        setEmailProof({ method: "account_email", domainVerified: Boolean(data.domainVerified) });
        setOtpMessage(data.message || "School email verified via your account.");
      } else {
        setEmailProof({
          method: "otp",
          challengeId: data.challengeId,
          domainVerified: Boolean(data.domainVerified),
          devCode: data.devCode,
        });
        setOtpMessage(data.message || "Enter the code sent to your school email.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection lost. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmOtp() {
    if (!emailProof || emailProof.method !== "otp") return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/claims/email-challenge/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: emailProof.challengeId, code: otpCode.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Incorrect code.");
      setEmailProof({ ...emailProof, proofToken: data.proofToken });
      setOtpMessage("School email verified. Continue with jersey and season details.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection lost. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const emailReady =
      emailProof?.method === "account_email" ||
      (emailProof?.method === "otp" && Boolean(emailProof.proofToken));
    if (!emailReady) {
      setError("Verify your school email before submitting.");
      return;
    }
    setBusy(true);
    setError("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fields,
          playerSlug: selected.slug,
          schoolEmail: schoolEmail.trim(),
          emailProofToken: emailProof?.method === "otp" ? emailProof.proofToken : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn’t submit your claim.");
      setSubmitted(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection lost. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const next = `/onboarding${selected ? `?player=${encodeURIComponent(selected.slug)}` : ""}`;
  const emailVerified =
    emailProof?.method === "account_email" ||
    (emailProof?.method === "otp" && Boolean(emailProof.proofToken));

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-border bg-bg-card p-5 sm:p-8">
      {submitted ? (
        <div role="status">
          <h2 className="text-2xl">Your claim is under review</h2>
          <p className="mt-2 text-text-secondary">
            We verify school email, jersey/season signals, and your notes before unlocking editing.
            Identity fields on the roster stay locked after approval.
          </p>
          <Link href={`/site/player/${selected?.slug}/edit`} className="mt-4 inline-block text-accent hover:underline">
            Check profile access
          </Link>
        </div>
      ) : (
        <>
          <h2 className="text-2xl">Find your player profile</h2>
          <p className="mt-2 text-sm text-text-secondary">
            High school and college players: search your name or school, then select your roster record.
            Claims require a verified school email plus jersey and season details.
          </p>
          <ClaimProfileSearch
            className="mt-4"
            selectedSlug={selected?.slug ?? null}
            initialQuery={initialPlayer?.displayName}
            onSelect={(player) => {
              setSelected(player);
              setError("");
              setEmailProof(null);
              setOtpCode("");
              setOtpMessage("");
            }}
          />
          {selected && (
            <div className="mt-6 border-t border-border pt-6">
              <h3 className="text-2xl">{selected.displayName}</h3>
              <p className="mt-1 text-text-secondary">
                {selected.schoolName} · {selected.position}
              </p>
              <Link
                href={`/site/player/${selected.slug}`}
                className="mt-2 inline-block text-sm text-accent hover:underline"
              >
                View player profile
              </Link>
              {!available ? (
                <p className="mt-4 text-sm text-text-secondary">
                  Claim submissions are temporarily unavailable. You can still browse player profiles.
                </p>
              ) : !signedIn ? (
                <div className="mt-4">
                  <p className="mb-3 text-sm text-text-secondary">
                    Sign in to securely submit and track your claim.
                  </p>
                  <Button href={`/auth/login?next=${encodeURIComponent(next)}`}>Sign in to claim</Button>
                  <Link
                    href={`/auth/signup?next=${encodeURIComponent(next)}`}
                    className="ml-4 text-accent hover:underline"
                  >
                    Create account
                  </Link>
                </div>
              ) : (
                <form onSubmit={submit} className="mt-5 space-y-4">
                  <label className="block text-sm text-text-secondary">
                    School email (use the same address as your Takkle account when possible)
                    <input
                      name="schoolEmail"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                      value={schoolEmail}
                      onChange={(event) => {
                        setSchoolEmail(event.target.value);
                        setEmailProof(null);
                        setOtpMessage("");
                      }}
                      className="mt-1 w-full rounded-lg border border-border bg-field px-4 py-3 text-text-primary focus-visible:outline-accent"
                    />
                  </label>
                  <p className="text-sm text-text-secondary">
                    Fastest path: sign up / sign in with your school email. Newsletter signup (Beehiiv) is separate and does not verify claims.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" variant="secondary" disabled={busy || !schoolEmail.trim()} onClick={() => void startEmailProof()}>
                      {busy ? "Working…" : emailVerified ? "Re-verify school email" : "Verify school email"}
                    </Button>
                    {emailVerified && (
                      <p className="text-sm text-turf" role="status">
                        School email verified
                        {emailProof && !emailProof.domainVerified
                          ? " (domain pending registry review)"
                          : ""}
                      </p>
                    )}
                  </div>
                  {emailProof?.method === "otp" && !emailProof.proofToken && (
                    <div className="space-y-3 rounded-lg border border-border bg-field p-4">
                      <p className="text-sm text-text-secondary">{otpMessage}</p>
                      {emailProof.devCode && (
                        <p className="text-xs text-text-secondary">Dev code: {emailProof.devCode}</p>
                      )}
                      <label className="block text-sm text-text-secondary">
                        Verification code
                        <input
                          value={otpCode}
                          onChange={(event) => setOtpCode(event.target.value)}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={12}
                          className="mt-1 w-full rounded-lg border border-border bg-bg-card px-4 py-3 text-text-primary focus-visible:outline-accent"
                        />
                      </label>
                      <Button type="button" disabled={busy || otpCode.trim().length < 4} onClick={() => void confirmOtp()}>
                        Confirm code
                      </Button>
                    </div>
                  )}
                  {otpMessage && emailProof?.method === "account_email" && (
                    <p className="text-sm text-text-secondary" role="status">
                      {otpMessage}
                    </p>
                  )}
                  <fieldset className="space-y-2">
                    <legend className="text-sm text-text-secondary">I am claiming as</legend>
                    <label className="flex items-center gap-2 text-sm text-text-secondary">
                      <input type="radio" name="relationship" value="player" defaultChecked className="accent-accent" />
                      The player
                    </label>
                    <label className="flex items-center gap-2 text-sm text-text-secondary">
                      <input type="radio" name="relationship" value="guardian" className="accent-accent" />
                      Parent / guardian
                    </label>
                  </fieldset>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm text-text-secondary">
                      Jersey number
                      <input
                        name="jerseyNumber"
                        type="number"
                        required
                        min={0}
                        max={99}
                        className="mt-1 w-full rounded-lg border border-border bg-field px-4 py-3 text-text-primary focus-visible:outline-accent"
                      />
                    </label>
                    <label className="block text-sm text-text-secondary">
                      Season year
                      <input
                        name="seasonYear"
                        type="number"
                        required
                        min={2000}
                        max={2100}
                        defaultValue={new Date().getFullYear()}
                        className="mt-1 w-full rounded-lg border border-border bg-field px-4 py-3 text-text-primary focus-visible:outline-accent"
                      />
                    </label>
                  </div>
                  <label className="block text-sm text-text-secondary">
                    Verification details
                    <textarea
                      name="notes"
                      required
                      minLength={20}
                      maxLength={2000}
                      rows={4}
                      aria-describedby="verification-help"
                      className="mt-1 w-full rounded-lg border border-border bg-field px-4 py-3 text-text-primary focus-visible:outline-accent"
                    />
                  </label>
                  <p id="verification-help" className="text-sm text-text-secondary">
                    Include an official roster link or a school contact who can verify you. Don’t include
                    private identity documents here.
                  </p>
                  <label className="flex items-start gap-3 text-sm text-text-secondary">
                    <input type="checkbox" required className="mt-1 accent-accent" />
                    I am this player or their authorized guardian. I understand editing unlocks only after
                    review, and roster name/school stay locked.
                  </label>
                  {error && (
                    <p role="alert" className="text-sm text-text-primary">
                      {error}
                    </p>
                  )}
                  <Button type="submit" disabled={busy || !emailVerified}>
                    {busy ? "Submitting…" : "Submit claim for review"}
                  </Button>
                </form>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
