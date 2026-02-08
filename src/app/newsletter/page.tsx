import { Metadata } from "next";
import Link from "next/link";
import EmailCapture from "@/components/EmailCapture";

export const metadata: Metadata = {
  title: "Newsletter — Stay Ahead of the NIL Game | Takkle",
  description:
    "Get weekly updates on NIL rule changes, opportunities, and resources for parents of high school athletes. Free newsletter from Takkle.",
  openGraph: {
    title: "Newsletter — Stay Ahead of the NIL Game | Takkle",
    description:
      "Weekly NIL updates for parents of high school athletes. Rule changes, opportunities, and expert advice.",
    url: "https://takkle.com/newsletter",
    siteName: "Takkle",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Takkle Newsletter",
    description:
      "Weekly NIL updates for parents of high school athletes.",
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
            <span className="text-accent">NIL Game</span>
          </h1>
          <p className="mt-4 text-lg text-text-secondary max-w-xl mx-auto">
            Get weekly updates on NIL rule changes, new opportunities, and
            expert resources for parents of high school athletes. Completely
            free.
          </p>

          <div className="mt-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="bg-bg-card border border-border rounded-xl p-4">
                <div className="text-accent text-lg font-bold mb-1">
                  Rule Updates
                </div>
                <p className="text-sm text-text-secondary">
                  Be the first to know when your state changes its NIL rules.
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
                  Hear about new NIL platforms, camps, and deals for HS
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
