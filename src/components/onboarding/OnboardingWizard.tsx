"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { searchPlayers } from "@/lib/players";
import { computeTackleScore } from "@/lib/scoring/tackle-score";
import TackleScoreDisplay from "@/components/ui/TackleScoreDisplay";
import SyntheticNotice from "@/components/ui/SyntheticNotice";

const STEPS = [
  "Your name",
  "Your school",
  "Find profile",
  "Claim profile",
  "Verify",
  "Add film",
  "Find My Film",
  "Score preview",
] as const;

export default function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [school, setSchool] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const matches = searchQuery.length >= 2
    ? searchPlayers({ query: searchQuery }, 1, 5).players
    : [];

  const previewScore = computeTackleScore({
    filmEvaluation: 7,
    production: 6.5,
    athleticism: 7.5,
    measurables: 6,
    competitionLevel: 7,
    consistency: 6.5,
    recruitingSignals: 5,
  });

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex gap-1 overflow-x-auto">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`shrink-0 rounded-full px-3 py-1 text-xs ${
              i === step
                ? "bg-accent text-white"
                : i < step
                  ? "bg-turf/20 text-turf"
                  : "bg-bg-card text-text-muted border border-border"
            }`}
          >
            {i + 1}. {label}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-bg-card p-6 sm:p-8">
        {step === 0 && (
          <>
            <h2 className="font-[family-name:var(--font-display)] text-2xl">What&apos;s your name?</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <input
                className="rounded-lg border border-border bg-field px-4 py-3 text-text-primary"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <input
                className="rounded-lg border border-border bg-field px-4 py-3 text-text-primary"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="font-[family-name:var(--font-display)] text-2xl">Where do you play?</h2>
            <input
              className="mt-6 w-full rounded-lg border border-border bg-field px-4 py-3 text-text-primary"
              placeholder="School name"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
            />
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-[family-name:var(--font-display)] text-2xl">Find your profile</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Search our database for an existing player record to claim.
            </p>
            <input
              className="mt-4 w-full rounded-lg border border-border bg-field px-4 py-3 text-text-primary"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <SyntheticNotice compact />
            <ul className="mt-4 space-y-2">
              {matches.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedSlug(p.slug)}
                    className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                      selectedSlug === p.slug
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-accent/40"
                    }`}
                  >
                    {p.displayName} — {p.position}, {p.school.name}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-[family-name:var(--font-display)] text-2xl">Claim your profile</h2>
            <p className="mt-2 text-text-secondary">
              Confirm this is your recruiting profile. player_id is separate from your login account.
            </p>
            {selectedSlug ? (
              <p className="mt-4 rounded-lg border border-turf/40 bg-turf/10 px-4 py-3 text-sm">
                Selected: {selectedSlug}
              </p>
            ) : (
              <p className="mt-4 text-sm text-text-muted">No profile selected — go back to search.</p>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="font-[family-name:var(--font-display)] text-2xl">Verify identity</h2>
            <p className="mt-2 text-text-secondary">
              Upload roster proof, school email, or parent verification. No facial recognition for minors.
            </p>
            <div className="mt-6 rounded-lg border border-dashed border-border bg-field p-8 text-center text-sm text-text-muted">
              Verification upload placeholder
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h2 className="font-[family-name:var(--font-display)] text-2xl">Add your film</h2>
            <p className="mt-2 text-text-secondary">
              Link Hudl, YouTube, or upload clips. Film drives your Tackle Score™ evaluation.
            </p>
            <input
              className="mt-4 w-full rounded-lg border border-border bg-field px-4 py-3 text-text-primary"
              placeholder="Paste film URL..."
            />
          </>
        )}

        {step === 6 && (
          <>
            <h2 className="font-[family-name:var(--font-display)] text-2xl">Find My Film</h2>
            <p className="mt-2 text-text-secondary">
              We&apos;ll suggest film matches from public sources. Review and confirm before linking.
            </p>
            <div className="mt-4 space-y-2">
              {["Season Highlights — suggested match 92%", "Game vs Central — suggested match 78%"].map(
                (label) => (
                  <label key={label} className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm">
                    <input type="checkbox" className="accent-accent" />
                    {label}
                  </label>
                ),
              )}
            </div>
          </>
        )}

        {step === 7 && (
          <>
            <h2 className="font-[family-name:var(--font-display)] text-2xl">Your Tackle Score™ preview</h2>
            <p className="mt-2 text-text-secondary">
              Preliminary score based on available data. Scores cannot be purchased or boosted.
            </p>
            <div className="mt-6">
              <TackleScoreDisplay
                score={previewScore.score}
                confidence={previewScore.confidence}
                size="lg"
              />
            </div>
          </>
        )}

        <div className="mt-8 flex justify-between">
          <Button variant="ghost" onClick={back} disabled={step === 0}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>Continue</Button>
          ) : (
            <Button href="/auth/signup">Create account</Button>
          )}
        </div>
      </div>
    </div>
  );
}
