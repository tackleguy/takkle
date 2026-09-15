"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

type LoginFormProps = {
  supabaseReady: boolean;
};

export default function LoginForm({ supabaseReady }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!supabaseReady) {
      setError("Supabase is not configured.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/onboarding");
    router.refresh();
  }

  return (
    <form className="mt-8 space-y-4" onSubmit={onSubmit}>
      <input
        type="email"
        name="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full rounded-lg border border-border bg-field px-4 py-3 text-text-primary"
      />
      <input
        type="password"
        name="password"
        autoComplete="current-password"
        required
        minLength={6}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full rounded-lg border border-border bg-field px-4 py-3 text-text-primary"
      />
      {error && (
        <p className="rounded-lg border border-status-limited/30 bg-status-limited/5 px-4 py-3 text-sm text-status-limited">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={!supabaseReady || loading}>
        {loading ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
