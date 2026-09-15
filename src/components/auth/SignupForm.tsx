"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

const ACCOUNT_TYPES = [
  { value: "player", label: "I am a player" },
  { value: "parent", label: "I am a parent/guardian" },
  { value: "recruiter", label: "I am a recruiter" },
  { value: "coach", label: "I am a coach" },
  { value: "business", label: "I am a business" },
] as const;

type AccountType = (typeof ACCOUNT_TYPES)[number]["value"];

type SignupFormProps = {
  supabaseReady: boolean;
};

export default function SignupForm({ supabaseReady }: SignupFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("player");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

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
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=/onboarding`;
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo,
        data: {
          account_type: accountType,
        },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.push("/onboarding");
      router.refresh();
      return;
    }

    setMessage("Check your email to confirm your account, then log in.");
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
        autoComplete="new-password"
        required
        minLength={6}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full rounded-lg border border-border bg-field px-4 py-3 text-text-primary"
      />
      <select
        name="account_type"
        value={accountType}
        onChange={(e) => setAccountType(e.target.value as AccountType)}
        className="w-full rounded-lg border border-border bg-field px-4 py-3 text-text-primary"
      >
        {ACCOUNT_TYPES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="rounded-lg border border-status-limited/30 bg-status-limited/5 px-4 py-3 text-sm text-status-limited">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-lg border border-turf/30 bg-turf/5 px-4 py-3 text-sm text-turf">
          {message}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={!supabaseReady || loading}>
        {loading ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
