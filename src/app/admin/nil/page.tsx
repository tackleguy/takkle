import Link from "next/link";

export default function AdminNilPage() {
  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-3xl text-text-primary">NIL Settings</h2>
      <p className="mt-2 text-text-secondary">
        NIL resource links and state content are managed separately. Public resource:{" "}
        <Link href="/nil-rules" className="text-accent hover:underline">
          High School NIL Rules
        </Link>
      </p>
    </div>
  );
}
