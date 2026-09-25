import Link from "next/link";
import Button from "@/components/ui/Button";
import type { AccountType } from "@/types/recruiting";

function copyFor(role: AccountType | null) {
  switch (role) {
    case "player":
    case "parent":
      return {
        title: role === "parent" ? "Help your athlete get discovered" : "Your recruiting identity starts here",
        body: "Browse live dossiers, then claim your profile and add film.",
        primary: { href: "/tutorial/player", label: "Player walkthrough" },
        secondary: { href: "/onboarding", label: "Claim profile" },
      };
    case "business":
      return {
        title: "Find athletes ready for NIL",
        body: "Explore NIL Scores and open player dossiers with film and Tackle Score™.",
        primary: { href: "/tutorial/business", label: "Business walkthrough" },
        secondary: { href: "/nil/scores", label: "NIL Scores" },
      };
    case "recruiter":
    case "coach":
      return {
        title: "Discover college talent",
        body: "Search by position and school, or compare Tackle Score™ rankings.",
        primary: { href: "/discover", label: "Open Discover" },
        secondary: { href: "/rankings", label: "Rankings" },
      };
    default:
      return {
        title: "You’re in",
        body: "Start with live players — tutorials are optional and skippable.",
        primary: { href: "/discover", label: "Find players" },
        secondary: { href: "/account", label: "My account" },
      };
  }
}

export default function WelcomeBand({
  role,
  email,
}: {
  role: AccountType | null;
  email: string | null | undefined;
}) {
  const copy = copyFor(role);
  return (
    <section className="border-b border-border bg-field/40 px-4 py-5">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-text-primary">
            {copy.title}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {email ? <span className="break-all">{email}</span> : null}
            {email ? " · " : null}
            {copy.body}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button href={copy.primary.href} size="sm">
            {copy.primary.label}
          </Button>
          <Button href={copy.secondary.href} variant="outline" size="sm">
            {copy.secondary.label}
          </Button>
          <Link
            href="/discover"
            className="inline-flex items-center text-sm text-text-muted hover:text-accent transition-colors"
          >
            Browse only
          </Link>
        </div>
      </div>
    </section>
  );
}
