import type { Metadata } from "next";
import Link from "next/link";
import SignupForm from "@/components/auth/SignupForm";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign Up",
};

export default function SignupPage() {
  const supabaseReady = isSupabaseConfigured();

  return (
    <div className="px-4 py-16">
      <div className="mx-auto max-w-md">
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-text-primary text-center">
          Create Account
        </h1>
        <p className="mt-2 text-center text-text-secondary text-sm">
          Sign up to claim and manage your recruiting profile.
        </p>

        {!supabaseReady && (
          <div className="mt-6 rounded-lg border border-status-limited/30 bg-status-limited/5 px-4 py-3 text-sm text-text-secondary">
            Supabase not configured. Auth will activate once environment variables are set.
          </div>
        )}

        <SignupForm supabaseReady={supabaseReady} />

        <p className="mt-6 text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-accent hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
