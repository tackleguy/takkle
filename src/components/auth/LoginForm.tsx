"use client";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/auth/flow";

export default function LoginForm({ supabaseReady, next = "/account", confirmationError = false }: { supabaseReady: boolean; next?: string; confirmationError?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(confirmationError ? "This email link is invalid or has expired. Log in, request a new confirmation email, or reset your password." : "");
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(confirmationError);
  const [notice, setNotice] = useState("");
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice(""); setLoading(true);
    try {
      const client = createClient();
      if (!client) throw new Error("Account services are temporarily unavailable. Please try again later.");
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) { setNeedsConfirmation(error.code === "email_not_confirmed"); throw error; }
      router.replace(safeNext(next)); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn’t log in. Check your connection and try again."); }
    finally { setLoading(false); }
  }
  async function resend() {
    setError(""); setNotice(""); setLoading(true);
    try {
      const client = createClient();
      if (!client) throw new Error("Account services are temporarily unavailable.");
      const { error } = await client.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext(next))}` } });
      if (error) throw error;
      setNotice("If your account needs confirmation, a new email has been sent. Check your inbox and spam folder.");
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn’t send a confirmation email."); }
    finally { setLoading(false); }
  }
  return <form className="mt-8 space-y-4" onSubmit={onSubmit}>
    <label className="block text-sm text-text-secondary">Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-field px-4 py-3 text-text-primary focus-visible:outline-accent" /></label>
    <label className="block text-sm text-text-secondary">Password<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-field px-4 py-3 text-text-primary focus-visible:outline-accent" /></label>
    <Link href="/auth/forgot-password" className="inline-block text-sm text-accent hover:underline">Forgot your password?</Link>
    {error && <p role="alert" className="text-sm text-text-primary">{error}</p>}
    {notice && <p role="status" className="text-sm text-text-secondary">{notice}</p>}
    {needsConfirmation && <Button variant="secondary" disabled={loading || !email.trim() || !supabaseReady} onClick={() => void resend()}>Resend confirmation email</Button>}
    <Button type="submit" className="w-full" disabled={!supabaseReady || loading}>{loading ? "Logging in…" : "Log in"}</Button>
  </form>;
}
