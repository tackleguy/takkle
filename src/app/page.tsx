"use client";

import { useState } from "react";
import StateSelector from "@/components/StateSelector";
import StateResult from "@/components/StateResult";
import { getStatusCounts, type StateData } from "@/data/states";

export default function HomePage() {
  const [selectedState, setSelectedState] = useState<StateData | null>(null);
  const counts = getStatusCounts();

  return (
    <>
      {/* JSON-LD for WebApplication */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Takkle NIL Rules Checker",
            description:
              "Free tool to check high school NIL rules for all 50 states and D.C.",
            url: "https://takkle.com",
            applicationCategory: "EducationalApplication",
            operatingSystem: "All",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
          }),
        }}
      />

      {/* Hero */}
      <section className="py-16 sm:py-24 px-4">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-[family-name:var(--font-heading)] leading-tight">
            Can Your High School Athlete{" "}
            <span className="text-accent">Get NIL Deals?</span>
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto">
            Find out in 10 seconds. Select your state for a clear breakdown of
            what your athlete can and can&apos;t do.
          </p>

          {/* Stats bar */}
          <div className="mt-8 flex flex-wrap justify-center gap-4 sm:gap-8">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-status-permitted" />
              <span className="text-sm text-text-secondary">
                <span className="font-semibold text-text-primary">
                  {counts.permitted}
                </span>{" "}
                Permit NIL
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-status-prohibited" />
              <span className="text-sm text-text-secondary">
                <span className="font-semibold text-text-primary">
                  {counts.prohibited}
                </span>{" "}
                Prohibit NIL
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-status-limited" />
              <span className="text-sm text-text-secondary">
                <span className="font-semibold text-text-primary">
                  {counts.limited}
                </span>{" "}
                Limited
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-status-unclear" />
              <span className="text-sm text-text-secondary">
                <span className="font-semibold text-text-primary">
                  {counts.unclear}
                </span>{" "}
                Unclear
              </span>
            </div>
          </div>

          {/* Updated badge */}
          <div className="mt-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-bg-card border border-border text-xs text-text-muted">
              Updated February 2026 &middot; All 50 States + D.C.
            </span>
          </div>
        </div>
      </section>

      {/* State Selector */}
      <section className="pb-8 px-4">
        <div className="mx-auto max-w-6xl">
          <StateSelector
            onSelect={setSelectedState}
            selectedSlug={selectedState?.slug}
          />
        </div>
      </section>

      {/* Results */}
      {selectedState && (
        <section className="pb-16 px-4" id="results">
          <div className="mx-auto max-w-3xl">
            <StateResult state={selectedState} />
          </div>
        </section>
      )}

      {/* Disclaimer */}
      <section className="pb-16 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs text-text-muted">
            This information is for educational purposes only and is not legal
            advice. NIL rules change frequently. Always verify current rules with
            your state&apos;s athletic association and consult a qualified
            attorney for specific legal guidance.
          </p>
        </div>
      </section>
    </>
  );
}
