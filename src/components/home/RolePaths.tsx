import Link from "next/link";

const PATHS = [
  {
    href: "/tutorial/player",
    title: "Players & parents",
    body: "See how dossiers work, then claim yours when you’re ready.",
  },
  {
    href: "/tutorial/business",
    title: "Business & NIL",
    body: "Find athletes with NIL presence and open their profiles.",
  },
  {
    href: "/discover",
    title: "Recruiters & coaches",
    body: "Jump straight into live college players and rankings.",
  },
] as const;

export default function RolePaths() {
  return (
    <section className="px-4 py-12 border-t border-border">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl tracking-wide text-text-primary">
          New here? Pick your path
        </h2>
        <p className="mt-2 max-w-2xl text-text-secondary">
          Short orientation — or skip and browse players now.
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {PATHS.map((path) => (
            <li key={path.href}>
              <Link
                href={path.href}
                className="group block h-full rounded-xl border border-border bg-field/60 p-5 transition-all duration-300 hover:border-accent/50 hover:bg-bg-card focus-visible:outline-accent"
              >
                <h3 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-text-primary group-hover:text-accent transition-colors">
                  {path.title}
                </h3>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">{path.body}</p>
                <span className="mt-4 inline-block text-sm text-accent">Continue →</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
