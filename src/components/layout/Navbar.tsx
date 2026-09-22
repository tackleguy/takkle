"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

const LINKS: { href: string; label: string; highlight?: boolean }[] = [
  { href: "/discover", label: "Discover" },
  { href: "/rankings", label: "Rankings" },
  { href: "/nil/scores", label: "NIL Scores" },
  { href: "/cfb/scores", label: "CFB Scores" },
  { href: "/college", label: "College", highlight: true },
  { href: "/guides", label: "Player Guides" },
];

export default function Navbar() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setEmail(data.user?.email ?? null);
    }).catch(() => { /* Public navigation remains available during auth outages. */ });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    setSigningOut(true);
    setAuthError(null);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Account services unavailable");
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      setEmail(null);
      setMobileOpen(false);
      router.push("/");
      router.refresh();
    } catch {
      setAuthError("We couldn’t log you out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg-primary/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="shrink-0">
            <span className="font-[family-name:var(--font-display)] text-3xl tracking-wider text-accent">
              TAKKLE
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {LINKS.map(({ href, label, highlight }) => (
              <Link
                key={href}
                href={href}
                className={`text-sm transition-colors ${
                  highlight
                    ? "font-medium text-accent hover:text-accent-hover"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button href={email ? "/account" : "/onboarding"} variant="primary" size="sm">
              {email ? "My account" : "Claim Profile"}
            </Button>
            {email ? (
              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                {signingOut ? "Logging out…" : "Log out"}
              </button>
            ) : (
              <Link
                href="/auth/login"
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Log in
              </Link>
            )}
          </div>

          <button
            className="md:hidden p-2 text-text-secondary hover:text-text-primary"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-1 border-t border-border pt-3">
            {LINKS.map(({ href, label, highlight }) => (
              <Link
                key={href}
                href={href}
                className={`block px-3 py-2 text-sm transition-colors ${
                  highlight ? "text-accent font-medium" : "text-text-secondary hover:text-text-primary"
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </Link>
            ))}
            <div className="px-3 pt-3 flex flex-col gap-2">
              <Button href={email ? "/account" : "/onboarding"} size="sm" className="w-full">
                {email ? "My account" : "Claim Profile"}
              </Button>
              {email ? (
                <button
                  type="button"
                  onClick={signOut}
                  disabled={signingOut}
                  className="block text-center text-sm text-text-secondary py-2"
                >
                  {signingOut ? "Logging out…" : "Log out"}
                </button>
              ) : (
                <Link
                  href="/auth/login"
                  className="block text-center text-sm text-text-secondary py-2"
                  onClick={() => setMobileOpen(false)}
                >
                  Log in
                </Link>
              )}
            </div>
          </div>
        )}
        {authError && <p role="alert" className="pb-3 text-sm text-red-400">{authError}</p>}
      </div>
    </nav>
  );
}
