import type { Metadata } from "next";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Claim Your Profile",
  description: "Find and claim your collegiate football profile on Takkle (FBS/FCS).",
};

export default function OnboardingPage() {
  return (
    <div className="px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-2xl text-center mb-10">
        <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl text-text-primary">
          Claim Your Profile
        </h1>
        <p className="mt-2 text-text-secondary">
          Your player record is separate from your login. Find, claim, verify, and build your dossier.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          College athletes and their teams —{" "}
          <Link href="/guides" className="text-accent hover:underline">
            Player Guides
          </Link>
          {" · "}
          <Link href="/college" className="text-accent hover:underline">
            Eligibility
          </Link>
        </p>
      </div>
      <OnboardingWizard />
    </div>
  );
}
