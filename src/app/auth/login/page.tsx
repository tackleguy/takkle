import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Log In",
};

export default function LoginPage() {
  const supabaseReady = isSupabaseConfigured();

  return (
    <div className="px-4 py-16">
      <div className="mx-auto max-w-md">
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-text-primary text-center">
          Log In
        </h1>
        <p className="mt-2 text-center text-text-secondary text-sm">
          Access your claimed player profile. player_id ≠ user_id.
        </p>

        {!supabaseReady && (
          <div className="mt-6 rounded-lg border border-status-limited/30 bg-status-limited/5 px-4 py-3 text-sm text-text-secondary">
            Supabase not configured. Add{" "}
            <code className="text-accent">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="text-accent">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable auth.
          </div>
        )}

        <LoginForm supabaseReady={supabaseReady} />

        <p className="mt-6 text-center text-sm text-text-muted">
          No account?{" "}
          <Link href="/auth/signup" className="text-accent hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
