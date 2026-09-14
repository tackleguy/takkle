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
              Player-first college football recruiting. Build your profile, showcase film,
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
                <Link href="/college" className="text-sm font-medium text-accent hover:text-accent-hover transition-colors">
                  College Eligibility
                </Link>
              </li>
              <li>
                <Link href="/nil-rules" className="text-sm text-text-secondary hover:text-accent transition-colors">
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
            <h3 className="text-sm font-semibold text-text-primary mb-3">College</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/discover" className="text-sm text-text-secondary hover:text-accent transition-colors">
                  Transfer Portal
                </Link>
              </li>
              <li>
                <Link href="/rankings" className="text-sm text-text-secondary hover:text-accent transition-colors">
                  College Rankings
                </Link>
              </li>
              <li>
                <Link href="/college" className="text-sm text-text-secondary hover:text-accent transition-colors">
                  Eligibility Calculator
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border space-y-3">
          <p className="text-xs text-text-muted text-center max-w-3xl mx-auto">
            <strong className="text-text-secondary">Eligibility is school-specific.</strong> The
            college calculator is an educational estimate. Confirm remaining seasons and transfer
            status with your compliance office. High school NIL still varies by state.
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
