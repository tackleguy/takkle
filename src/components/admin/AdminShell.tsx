"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/claims", label: "Claims" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/scores", label: "Score Weights" },
  { href: "/admin/ingestion", label: "Ingestion" },
  { href: "/admin/nil", label: "NIL Settings" },
  { href: "/admin/audit", label: "Audit Log" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 lg:flex-row lg:px-8">
      <aside className="lg:w-56 shrink-0">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-accent">Admin</h1>
        <nav className="mt-4 space-y-1">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                pathname === href
                  ? "bg-accent/15 text-accent"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-card"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
