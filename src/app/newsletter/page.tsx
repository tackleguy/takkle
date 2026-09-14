import { Metadata } from "next";
import Link from "next/link";
import EmailCapture from "@/components/EmailCapture";

export const metadata: Metadata = {
  title: "Newsletter — College Football + NIL Updates | Takkle",
  description:
    "Get weekly updates on college football, their teams, NIL opportunities, and resources for athletes. Free newsletter from Takkle.",
  openGraph: {
    title: "Newsletter — College Football + NIL Updates | Takkle",
    description:
      "Weekly updates on college athletes, their teams, and NIL opportunities.",
    url: "https://takkle.com/newsletter",
    siteName: "Takkle",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Takkle Newsletter",
    description: "Weekly updates on college athletes, their teams, and NIL opportunities.",
  },
  alternates: {
    canonical: "https://takkle.com/newsletter",
  },
};

export default function NewsletterPage() {
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
                name: "Newsletter",
                item: "https://takkle.com/newsletter",
              },
            ],
          }),
        }}
      />

      <section className="py-16 sm:py-24 px-4">
        <div className="mx-auto max-w-2xl text-center">
          <nav
            className="mb-8 text-sm text-text-muted"
            aria-label="Breadcrumb"
          >
            <ol className="flex items-center justify-center gap-2">
              <li>
                <Link href="/" className="hover:text-accent transition-colors">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li className="text-text-secondary">Newsletter</li>
            </ol>
          </nav>

          <h1 className="text-4xl sm:text-5xl font-bold font-[family-name:var(--font-heading)] leading-tight">
            Stay Ahead of the{" "}
            <span className="text-accent">College Game</span>
          </h1>
          <p className="mt-4 text-lg text-text-secondary max-w-xl mx-auto">
            Weekly trends for athletes and their teams, NIL opportunities, and player resources
            for college football athletes. Completely free.
          </p>

          <div className="mt-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="bg-bg-card border border-border rounded-xl p-4">
                <div className="text-accent text-lg font-bold mb-1">
                  Eligibility
                </div>
                <p className="text-sm text-text-secondary">
                  Stay current on roster movement and eligibility timing.
                </p>
              </div>
              <div className="bg-bg-card border border-border rounded-xl p-4">
                <div className="text-accent text-lg font-bold mb-1">
                  Expert Tips
                </div>
                <p className="text-sm text-text-secondary">
                  Practical advice on contracts, taxes, branding, and more.
                </p>
              </div>
              <div className="bg-bg-card border border-border rounded-xl p-4">
                <div className="text-accent text-lg font-bold mb-1">
                  Opportunities
                </div>
                <p className="text-sm text-text-secondary">
                  Hear about NIL platforms, collectives, and deals for college
                  athletes.
                </p>
              </div>
            </div>

            <div className="max-w-lg mx-auto">
              <EmailCapture
                source="newsletter"
                headline="Join the Takkle Newsletter"
                description="One email per week. No spam. Unsubscribe anytime."
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
