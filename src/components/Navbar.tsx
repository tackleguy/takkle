"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg-primary/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold font-[family-name:var(--font-heading)]">
              <span className="text-accent">Takkle</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              NIL Rules Checker
            </Link>
            <Link
              href="/guides"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Parent Guides
            </Link>
            <Link
              href="/newsletter"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Newsletter
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-text-secondary hover:text-text-primary"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link
              href="/"
              className="block px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              NIL Rules Checker
            </Link>
            <Link
              href="/guides"
              className="block px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Parent Guides
            </Link>
            <Link
              href="/newsletter"
              className="block px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Newsletter
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
