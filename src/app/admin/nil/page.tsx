import Link from "next/link";

export default function AdminNilPage() {
  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-3xl text-text-primary">NIL Settings</h2>
      <p className="mt-2 text-text-secondary">
        Public NIL Scores:{" "}
        <Link href="/nil/scores" className="text-accent hover:underline">
          /nil/scores
        </Link>
        {" · "}
        <Link href="/college" className="text-accent hover:underline">
          College Eligibility
        </Link>
        {" · "}
        <Link href="/guides" className="text-accent hover:underline">
          Player Guides
        </Link>
      </p>
    </div>
  );
}
