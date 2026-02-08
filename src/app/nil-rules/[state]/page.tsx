import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import {
  getStateBySlug,
  getAllSlugs,
  getStatusColor,
  getStatusLabel,
} from "@/data/states";
import { generateStateContent, generateFAQs } from "@/lib/stateContent";
import StateResultServer from "@/components/StateResultServer";
import EmailCapture from "@/components/EmailCapture";

interface PageProps {
  params: Promise<{ state: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ state: slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { state: slug } = await params;
  const state = getStateBySlug(slug);
  if (!state) return {};

  const title = `${state.name} High School NIL Rules 2026 | Takkle`;
  const description = state.seoDescription;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://takkle.com/nil-rules/${state.slug}`,
      siteName: "Takkle",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: `https://takkle.com/nil-rules/${state.slug}`,
    },
  };
}

export default async function StatePage({ params }: PageProps) {
  const { state: slug } = await params;
  const state = getStateBySlug(slug);

  if (!state) {
    notFound();
  }

  const content = generateStateContent(state);
  const faqs = generateFAQs(state);
  const statusColor = getStatusColor(state.status);
  const statusLabel = getStatusLabel(state.status);
  const neighbors = state.neighbors
    .map((n) => getStateBySlug(n))
    .filter(Boolean);

  // Split content into sections by ## headings
  const sections = content.split(/(?=^## )/m).filter(Boolean);

  return (
    <>
      {/* BreadcrumbList Schema */}
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
                name: "NIL Rules",
                item: "https://takkle.com/#states",
              },
              {
                "@type": "ListItem",
                position: 3,
                name: state.name,
                item: `https://takkle.com/nil-rules/${state.slug}`,
              },
            ],
          }),
        }}
      />

      {/* FAQPage Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          }),
        }}
      />

      <article className="py-8 sm:py-12 px-4">
        <div className="mx-auto max-w-3xl">
          {/* Breadcrumbs */}
          <nav className="mb-6 text-sm text-text-muted" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/" className="hover:text-accent transition-colors">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/" className="hover:text-accent transition-colors">
                  NIL Rules
                </Link>
              </li>
              <li>/</li>
              <li className="text-text-secondary">{state.name}</li>
            </ol>
          </nav>

          <h1 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-heading)] mb-2">
            {state.name} High School NIL Rules
          </h1>
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: statusColor }}
            >
              {statusLabel}
            </span>
            <span className="text-sm text-text-muted">
              Last verified: {state.lastVerified}
            </span>
          </div>

          {/* Results card */}
          <StateResultServer state={state} />

          {/* SEO Content */}
          <div className="mt-12 prose-custom">
            {sections.map((section, i) => {
              const lines = section.trim().split("\n");
              const heading = lines[0];
              const body = lines.slice(1).join("\n").trim();

              if (heading.startsWith("## ")) {
                return (
                  <div key={i} className="mb-8">
                    <h2 className="text-2xl font-bold font-[family-name:var(--font-heading)] text-text-primary mb-4">
                      {heading.replace("## ", "")}
                    </h2>
                    <div className="text-text-secondary text-sm leading-relaxed space-y-4">
                      {body.split("\n\n").map((paragraph, j) => {
                        if (paragraph.startsWith("**")) {
                          return (
                            <p key={j}>
                              {paragraph.split(/(\*\*[^*]+\*\*)/).map((part, k) =>
                                part.startsWith("**") && part.endsWith("**") ? (
                                  <strong key={k} className="text-text-primary">
                                    {part.replace(/\*\*/g, "")}
                                  </strong>
                                ) : (
                                  <span key={k}>{part}</span>
                                )
                              )}
                            </p>
                          );
                        }
                        return <p key={j}>{paragraph}</p>;
                      })}
                    </div>
                  </div>
                );
              }

              // Intro paragraph (no heading)
              return (
                <div key={i} className="mb-8">
                  <div className="text-text-secondary text-sm leading-relaxed space-y-4">
                    {section
                      .trim()
                      .split("\n\n")
                      .map((paragraph, j) => (
                        <p key={j}>{paragraph}</p>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* FAQ Section */}
          <div className="mt-12 mb-12">
            <h2 className="text-2xl font-bold font-[family-name:var(--font-heading)] text-text-primary mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="bg-bg-card border border-border rounded-xl p-6"
                >
                  <h3 className="text-base font-semibold text-text-primary mb-2">
                    {faq.question}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Email Capture */}
          <div className="mb-12">
            <EmailCapture
              stateName={state.name}
              stateSlug={state.slug}
              source="state-page"
            />
          </div>

          {/* Neighboring States */}
          {neighbors.length > 0 && (
            <div className="mb-12">
              <h2 className="text-xl font-bold font-[family-name:var(--font-heading)] text-text-primary mb-4">
                NIL Rules in Nearby States
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {neighbors.map((n) =>
                  n ? (
                    <Link
                      key={n.slug}
                      href={`/nil-rules/${n.slug}`}
                      className="flex items-center gap-2 px-4 py-3 bg-bg-card border border-border rounded-lg hover:bg-bg-card-hover transition-colors text-sm"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: getStatusColor(n.status),
                        }}
                      />
                      <span className="text-text-secondary hover:text-text-primary">
                        {n.name}
                      </span>
                    </Link>
                  ) : null
                )}
              </div>
            </div>
          )}

          {/* Related Guides */}
          <div>
            <h2 className="text-xl font-bold font-[family-name:var(--font-heading)] text-text-primary mb-4">
              Related Guides
            </h2>
            <div className="space-y-3">
              <Link
                href="/guides/how-to-get-nil-deals-high-school"
                className="block px-4 py-3 bg-bg-card border border-border rounded-lg hover:bg-bg-card-hover transition-colors text-sm text-text-secondary hover:text-text-primary"
              >
                How to Get NIL Deals as a High School Athlete &rarr;
              </Link>
              <Link
                href="/guides/nil-taxes-for-minors"
                className="block px-4 py-3 bg-bg-card border border-border rounded-lg hover:bg-bg-card-hover transition-colors text-sm text-text-secondary hover:text-text-primary"
              >
                NIL Taxes for Minors: What Every Parent Needs to Know &rarr;
              </Link>
              <Link
                href="/guides/red-flags-nil-contracts"
                className="block px-4 py-3 bg-bg-card border border-border rounded-lg hover:bg-bg-card-hover transition-colors text-sm text-text-secondary hover:text-text-primary"
              >
                Red Flags in NIL Contracts: A Parent&apos;s Checklist &rarr;
              </Link>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
