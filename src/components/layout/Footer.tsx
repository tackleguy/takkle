import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-field">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <span className="font-[family-name:var(--font-display)] text-2xl tracking-wider text-accent">
              TAKKLE
            </span>
            <p className="mt-2 text-sm text-text-secondary">
              Player-first high school football recruiting. Build your profile, showcase film,
              earn your Tackle Score™.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Recruiting</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/discover" className="text-sm text-text-secondary hover:text-accent transition-colors">
                  Discover Players
                </Link>
              </li>
              <li>
                <Link href="/rankings" className="text-sm text-text-secondary hover:text-accent transition-colors">
                  Rankings
                </Link>
              </li>
              <li>
                <Link href="/onboarding" className="text-sm text-text-secondary hover:text-accent transition-colors">
                  Claim Profile
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/nil-rules" className="text-sm font-medium text-accent hover:text-accent-hover transition-colors">
                  High School NIL Rules
                </Link>
              </li>
              <li>
                <Link href="/guides" className="text-sm text-text-secondary hover:text-accent transition-colors">
                  Parent Guides
                </Link>
              </li>
              <li>
                <Link href="/newsletter" className="text-sm text-text-secondary hover:text-accent transition-colors">
                  Newsletter
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Popular States</h3>
            <ul className="space-y-2">
              {["california", "texas", "florida", "ohio"].map((slug) => (
                <li key={slug}>
                  <Link
                    href={`/nil-rules/${slug}`}
                    className="text-sm text-text-secondary hover:text-accent transition-colors capitalize"
                  >
                    {slug.replace(/^\w/, (c) => c.toUpperCase())}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border space-y-3">
          <p className="text-xs text-text-muted text-center max-w-3xl mx-auto">
            <strong className="text-text-secondary">NIL varies by state.</strong> High school Name,
            Image, and Likeness rules differ across all 50 states and change frequently. Always verify
            current rules with your state athletic association before pursuing NIL opportunities.
          </p>
          <p className="text-xs text-text-muted text-center">
            This information is for educational purposes only and is not legal advice. Consult a
            qualified attorney for specific legal guidance.
          </p>
          <p className="text-xs text-text-muted text-center">
            &copy; {new Date().getFullYear()} Takkle. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
