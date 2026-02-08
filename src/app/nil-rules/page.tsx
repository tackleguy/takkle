import Link from "next/link";
import { Metadata } from "next";
import { states, getStatusColor, getStatusLabel } from "@/data/states";

export const metadata: Metadata = {
  title: "High School NIL Rules by State (2026) | Takkle",
  description:
    "Check high school NIL rules for all 50 states and Washington D.C. Find out if your state permits, prohibits, or limits NIL deals for high school athletes.",
  openGraph: {
    title: "High School NIL Rules by State (2026) | Takkle",
    description:
      "Check high school NIL rules for all 50 states and Washington D.C.",
    url: "https://takkle.com/nil-rules",
    siteName: "Takkle",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "High School NIL Rules by State | Takkle",
    description:
      "Check high school NIL rules for all 50 states and Washington D.C.",
  },
  alternates: {
    canonical: "https://takkle.com/nil-rules",
  },
};

export default function NILRulesIndex() {
  const permitted = states.filter((s) => s.status === "permitted");
  const prohibited = states.filter((s) => s.status === "prohibited");
  const limited = states.filter((s) => s.status === "limited");
  const unclear = states.filter((s) => s.status === "unclear");

  return (
    <>
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
                name: "NIL Rules by State",
                item: "https://takkle.com/nil-rules",
              },
            ],
          }),
        }}
      />

      <section className="py-12 sm:py-16 px-4">
        <div className="mx-auto max-w-4xl">
          <nav className="mb-6 text-sm text-text-muted" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/" className="hover:text-accent transition-colors">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li className="text-text-secondary">NIL Rules by State</li>
            </ol>
          </nav>

          <h1 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-heading)] mb-4">
            High School NIL Rules by State
          </h1>
          <p className="text-lg text-text-secondary mb-12">
            Select your state to see a full breakdown of NIL rules, restrictions,
            and what your athlete can and can&apos;t do.
          </p>

          {/* Permitted */}
          <div className="mb-10">
            <h2 className="flex items-center gap-2 text-xl font-bold font-[family-name:var(--font-heading)] text-text-primary mb-4">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getStatusColor("permitted") }}
              />
              {getStatusLabel("permitted")} ({permitted.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {permitted.map((state) => (
                <Link
                  key={state.slug}
                  href={`/nil-rules/${state.slug}`}
                  className="flex items-center gap-2 px-4 py-3 bg-bg-card border border-border rounded-lg hover:bg-bg-card-hover hover:border-status-permitted/40 transition-all text-sm text-text-secondary hover:text-text-primary"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: getStatusColor("permitted") }}
                  />
                  {state.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Prohibited */}
          <div className="mb-10">
            <h2 className="flex items-center gap-2 text-xl font-bold font-[family-name:var(--font-heading)] text-text-primary mb-4">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getStatusColor("prohibited") }}
              />
              {getStatusLabel("prohibited")} ({prohibited.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {prohibited.map((state) => (
                <Link
                  key={state.slug}
                  href={`/nil-rules/${state.slug}`}
                  className="flex items-center gap-2 px-4 py-3 bg-bg-card border border-border rounded-lg hover:bg-bg-card-hover hover:border-status-prohibited/40 transition-all text-sm text-text-secondary hover:text-text-primary"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: getStatusColor("prohibited") }}
                  />
                  {state.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Limited */}
          <div className="mb-10">
            <h2 className="flex items-center gap-2 text-xl font-bold font-[family-name:var(--font-heading)] text-text-primary mb-4">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getStatusColor("limited") }}
              />
              {getStatusLabel("limited")} ({limited.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {limited.map((state) => (
                <Link
                  key={state.slug}
                  href={`/nil-rules/${state.slug}`}
                  className="flex items-center gap-2 px-4 py-3 bg-bg-card border border-border rounded-lg hover:bg-bg-card-hover hover:border-status-limited/40 transition-all text-sm text-text-secondary hover:text-text-primary"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: getStatusColor("limited") }}
                  />
                  {state.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Unclear */}
          <div className="mb-10">
            <h2 className="flex items-center gap-2 text-xl font-bold font-[family-name:var(--font-heading)] text-text-primary mb-4">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getStatusColor("unclear") }}
              />
              {getStatusLabel("unclear")} ({unclear.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {unclear.map((state) => (
                <Link
                  key={state.slug}
                  href={`/nil-rules/${state.slug}`}
                  className="flex items-center gap-2 px-4 py-3 bg-bg-card border border-border rounded-lg hover:bg-bg-card-hover hover:border-status-unclear/40 transition-all text-sm text-text-secondary hover:text-text-primary"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: getStatusColor("unclear") }}
                  />
                  {state.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
