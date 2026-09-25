import type { Metadata } from "next";
import TutorialFlow from "@/components/tutorial/TutorialFlow";

export const metadata: Metadata = {
  title: "Business walkthrough",
  description: "Learn how to find college athletes on Takkle for NIL discovery using scores and dossiers.",
  robots: { index: false },
};

const STEPS = [
  {
    title: "Athletes, not directories",
    body: "Takkle shows college football dossiers with film and Tackle Score™ — the same surfaces recruiters use. Start by seeing who’s live on the platform.",
    detail: "No CRM setup required. Browse first, then dig into NIL Scores.",
  },
  {
    title: "NIL Scores surface",
    body: "NIL Scores highlights athletes with brand-relevant presence. Open a profile to see school, position, score, and film in one place.",
    detail: "High School NIL Rules stay linked in the nav whenever you need compliance context.",
  },
  {
    title: "Open the full dossier",
    body: "Each athlete page is a recruiting identity: measurements, rankings context, and a film window. Use Discover filters when you know position or school.",
    detail: "You’re evaluating presence and story — not inventing a deal flow inside Takkle yet.",
  },
  {
    title: "Save the path you need",
    body: "Bookmark NIL Scores for brand scans and Discover for roster search. Create an account so your next visit lands on the right next steps.",
    detail: "Walkthroughs are optional. Experienced users can skip straight to the tools.",
  },
];

export default function BusinessTutorialPage() {
  return (
    <div className="hero-atmosphere px-4 py-12 sm:py-16">
      {/*
        THESIS: Business activation via live athlete discovery, not ceremony.
        OWN-WORLD: Same night-field system as the rest of Takkle.
        STORY: Brand users learn NIL Scores → dossier → Discover.
        FIRST VIEWPORT: Heading + skip + progress + first step.
        FORM: Discovery-first onboard (user lock aha-discovery).
        FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
      */}
      <TutorialFlow
        heading="Business walkthrough"
        intro="A quick orientation to finding athletes. Skip anytime."
        steps={STEPS}
        finishTitle="Open the athlete field"
        finishBody="Start with NIL Scores for brand-relevant athletes, or Discover for full roster search."
        primary={{ href: "/nil/scores", label: "NIL Scores" }}
        secondary={{ href: "/discover", label: "Find athletes" }}
        skipHref="/nil/scores"
      />
    </div>
  );
}
