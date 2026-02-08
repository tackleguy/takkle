import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-bg-primary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <span className="text-xl font-bold font-[family-name:var(--font-heading)] text-accent">
              Takkle
            </span>
            <p className="mt-2 text-sm text-text-secondary">
              Helping parents and high school athletes navigate NIL rules across
              all 50 states.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Resources
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm text-text-secondary hover:text-accent transition-colors"
                >
                  NIL Rules Checker
                </Link>
              </li>
              <li>
                <Link
                  href="/guides"
                  className="text-sm text-text-secondary hover:text-accent transition-colors"
                >
                  Parent Guides
                </Link>
              </li>
              <li>
                <Link
                  href="/newsletter"
                  className="text-sm text-text-secondary hover:text-accent transition-colors"
                >
                  Newsletter
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Popular States
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/nil-rules/california"
                  className="text-sm text-text-secondary hover:text-accent transition-colors"
                >
                  California
                </Link>
              </li>
              <li>
                <Link
                  href="/nil-rules/texas"
                  className="text-sm text-text-secondary hover:text-accent transition-colors"
                >
                  Texas
                </Link>
              </li>
              <li>
                <Link
                  href="/nil-rules/florida"
                  className="text-sm text-text-secondary hover:text-accent transition-colors"
                >
                  Florida
                </Link>
              </li>
              <li>
                <Link
                  href="/nil-rules/ohio"
                  className="text-sm text-text-secondary hover:text-accent transition-colors"
                >
                  Ohio
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border">
          <p className="text-xs text-text-muted text-center">
            This information is for educational purposes only and is not legal
            advice. NIL rules change frequently. Consult a qualified attorney for
            specific legal guidance.
          </p>
          <p className="text-xs text-text-muted text-center mt-2">
            &copy; {new Date().getFullYear()} Takkle. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
