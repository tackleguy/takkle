import Link from "next/link";
import { Metadata } from "next";
import { guides } from "@/data/guides";

export const metadata: Metadata = {
  title: "Player Guides: NIL, Taxes, Contracts & More | Takkle",
  description:
    "Free guides for athletes. Learn about NIL deals, taxes, contracts, personal branding, and nutrition.",
  openGraph: {
    title: "Player Guides: NIL, Taxes, Contracts & More | Takkle",
    description:
      "Free guides for athletes covering NIL deals, taxes, contracts, and more.",
    url: "https://takkle.com/guides",
    siteName: "Takkle",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Player Guides | Takkle",
    description:
      "Free guides for athletes covering NIL deals, taxes, contracts, and more.",
  },
  alternates: {
    canonical: "https://takkle.com/guides",
  },
};

export default function GuidesPage() {
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
                name: "Player Guides",
                item: "https://takkle.com/guides",
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
              <li className="text-text-secondary">Player Guides</li>
            </ol>
          </nav>

          <h1 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-heading)] mb-4">
            Player Guides
          </h1>
          <p className="text-lg text-text-secondary mb-12">
            Everything athletes need to know about NIL, from getting started to
            managing taxes and contracts.
          </p>

          <div className="space-y-6">
            {guides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="block bg-bg-card border border-border rounded-xl p-6 hover:bg-bg-card-hover hover:border-accent/30 transition-all group"
              >
                <h2 className="text-xl font-semibold font-[family-name:var(--font-heading)] text-text-primary group-hover:text-accent transition-colors">
                  {guide.title}
                </h2>
                <p className="text-sm text-text-secondary mt-2">
                  {guide.description}
                </p>
                <div className="flex items-center gap-4 mt-4 text-xs text-text-muted">
                  <span>By Takkle Team</span>
                  <span>&middot;</span>
                  <span>
                    Updated{" "}
                    {new Date(guide.updatedDate).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
