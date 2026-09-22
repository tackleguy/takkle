import { safeNext } from "@/lib/auth/flow";
import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Log In",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const query = await searchParams;
  const next = safeNext(query.next);
  const supabaseReady = isSupabaseConfigured();

  return (
    <div className="px-4 py-16">
      <div className="mx-auto max-w-md">
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-text-primary text-center">
          Log In
        </h1>
        <p className="mt-2 text-center text-text-secondary text-sm">
          Access your Takkle account, player profiles, and college recruiting tools.
        </p>

        {!supabaseReady && (
          <div className="mt-6 rounded-lg border border-status-limited/30 bg-status-limited/5 px-4 py-3 text-sm text-text-secondary">
            Account services are temporarily unavailable. Please try again later.
          </div>
        )}

        <LoginForm supabaseReady={supabaseReady} next={next} confirmationError={query.error === "confirm"} />

        <p className="mt-6 text-center text-sm text-text-muted">
          No account?{" "}
          <Link href={`/auth/signup?next=${encodeURIComponent(next)}`} className="text-accent hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
