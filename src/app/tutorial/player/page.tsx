import type { Metadata } from "next";
import TutorialFlow from "@/components/tutorial/TutorialFlow";

export const metadata: Metadata = {
  title: "Player walkthrough",
  description: "See how Takkle dossiers, Tackle Score™, and claiming work — then explore live players.",
  robots: { index: false },
};

const STEPS = [
  {
    title: "See the field first",
    body: "Takkle is built around live player dossiers — not a stats warehouse. Open Discover and scan real college athletes with film, school, and Tackle Score™.",
    detail: "You don’t need a claimed profile to browse. Discovery is the product.",
  },
  {
    title: "Tackle Score™, not stars",
    body: "Every dossier carries a proprietary 1.0–10.0 Tackle Score™ with confidence. No star ratings, no pay-to-boost.",
    detail: "Rankings and rising lists help you see where a player sits relative to peers.",
  },
  {
    title: "Film lives on the dossier",
    body: "When you claim and verify your roster record, you unlock editing: school and measurements, stats links, and YouTube film in the live film window.",
    detail: "Your login is separate from the player record. Claiming links them after review.",
  },
  {
    title: "Claim when you’re ready",
    body: "Search your name or school, submit verification with a school email, and wait for approval. Then build the dossier recruiters actually open.",
    detail: "Parents and guardians can help claim. Private IDs stay off the claim form.",
  },
];

export default function PlayerTutorialPage() {
  return (
    <div className="hero-atmosphere px-4 py-12 sm:py-16">
      {/*
        THESIS: Orientation that ends in discovery — claim is secondary.
        OWN-WORLD: Night-field navy, orange accent, Bebas display, dossier language.
        STORY: New players understand dossiers, score, film, then browse or claim.
        FIRST VIEWPORT: Heading + skip + progress + first step panel.
        FORM: Discovery-first onboard (user lock aha-discovery).
        FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
      */}
      <TutorialFlow
        heading="Player walkthrough"
        intro="About two minutes. Skip anytime and go straight to live players."
        steps={STEPS}
        finishTitle="Go see real dossiers"
        finishBody="Browse trending college players, or claim your roster record when you’re ready to build."
        primary={{ href: "/discover", label: "Find players" }}
        secondary={{ href: "/onboarding", label: "Claim profile" }}
        skipHref="/discover"
      />
    </div>
  );
}
