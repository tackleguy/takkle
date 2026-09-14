import Link from "next/link";
import { Metadata } from "next";
import Button from "@/components/ui/Button";
import EligibilityCalculator from "@/components/college/EligibilityCalculator";
import { CURRENT_SEASON_YEAR } from "@/lib/eligibility";

export const metadata: Metadata = {
  title: `College Football Eligibility Calculator (${CURRENT_SEASON_YEAR}) | Takkle`,
  description:
    "Estimate remaining NCAA Division I football eligibility seasons, five-year clock, and redshirt impact. Built for college athletes on Takkle.",
  openGraph: {
    title: `College Football Eligibility Calculator (${CURRENT_SEASON_YEAR}) | Takkle`,
    description:
      "Estimate remaining NCAA D1 football seasons, redshirt impact, and eligibility end year.",
    url: "https://takkle.com/college",
    siteName: "Takkle",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "College Football Eligibility Calculator | Takkle",
    description:
      "Estimate remaining NCAA D1 football seasons, redshirt impact, and eligibility end year.",
  },
  alternates: {
    canonical: "https://takkle.com/college",
  },
};

export default function CollegePage() {
  return (
    <>
      {/*
        THESIS: College athletes get a working eligibility clock, not another NIL state map.
        OWN-WORLD: Night-game navy / orange / turf; Bebas display digits for seasons left.
        STORY: Enter enrollment + seasons used → see remaining seasons and end year → discover/rankings.
        FIRST VIEWPORT: Brand-adjacent H1, short line, calculator form + live result pane.
        FORM: Established Takkle operate surface; seed n/a (extension).
        FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://takkle.com",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "College",
                item: "https://takkle.com/college",
              },
            ],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Takkle College Eligibility Calculator",
            applicationCategory: "SportsApplication",
            operatingSystem: "Web",
            url: "https://takkle.com/college",
            description:
              "Educational estimate of remaining NCAA Division I football competition seasons.",
          }),
        }}
      />

      <section className="hero-atmosphere field-lights relative overflow-hidden px-4 pt-12 pb-10 sm:pt-16 sm:pb-12">
        <div className="mx-auto max-w-4xl">
          <nav className="mb-6 text-sm text-text-muted" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/" className="hover:text-accent transition-colors">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li className="text-text-secondary">College</li>
            </ol>
          </nav>

          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl tracking-wide text-text-primary">
            College Eligibility Calculator
          </h1>
          <p className="mt-4 text-lg text-text-secondary max-w-2xl">
            Estimate remaining NCAA Division I football seasons for {CURRENT_SEASON_YEAR} —
            redshirts, COVID years, and the five-year clock in one place.
          </p>
        </div>
      </section>

      <section className="px-4 pb-16">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-xl border border-border bg-bg-card p-6 sm:p-8">
            <EligibilityCalculator />
          </div>

          <p className="mt-4 text-xs text-text-muted leading-relaxed max-w-3xl">
            Educational estimate only — not official NCAA or school compliance advice. Transfer
            rules, graduate eligibility, and conference policies can change your situation. Confirm
            with your compliance office before making roster or portal decisions.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <div className="border-t border-border pt-6">
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-text-primary tracking-wide">
                Transfer Portal + NIL Portal
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                Browse FBS and FCS athletes with Tackle Score™, eligibility year, and portal status.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button href="/discover" size="sm">
                  Discover players
                </Button>
                <Button href="/rankings" variant="outline" size="sm">
                  College rankings
                </Button>
              </div>
            </div>
            <div className="border-t border-border pt-6">
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-text-primary tracking-wide">
                High School NIL Rules
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                State-by-state NIL status for high school athletes still lives at its own resource.
              </p>
              <div className="mt-4">
                <Button href="/nil-rules" variant="ghost" size="sm">
                  Check HS NIL rules →
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
