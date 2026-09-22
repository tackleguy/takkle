"use client";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { SIGNUP_ROLES, signUpAccount, safeNext, type SignupRole } from "@/lib/auth/flow";

const inputClass = "mt-1 w-full rounded-lg border border-border bg-field px-4 py-3 text-text-primary focus-visible:outline-accent";
export default function SignupForm({ supabaseReady, next = "/account" }: { supabaseReady: boolean; next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<SignupRole>("player");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [resent, setResent] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const client = createClient();
      if (!client) throw new Error("Account services are temporarily unavailable. Please try again later.");
      const result = await signUpAccount(client, { email, password, role, origin: window.location.origin, next });
      if (result.state === "confirmation_required") { setConfirmation(true); setPassword(""); }
      else { router.replace(result.next); router.refresh(); }
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn’t create your account. Check your connection and try again."); }
    finally { setLoading(false); }
  }
  async function resend() {
    setLoading(true); setError("");
    try {
      const client = createClient();
      if (!client) throw new Error("Account services are temporarily unavailable.");
      const { error } = await client.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext(next))}` } });
      if (error) throw error;
      setResent(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn’t resend the email. Please try again."); }
    finally { setLoading(false); }
  }
  if (confirmation) return <div className="mt-8 space-y-4">
    <h2 className="text-2xl">Check your email</h2>
    <p role="status" className="text-text-secondary">If this address is eligible for signup, a confirmation link has been sent to {email.trim()}. Open it to finish creating your account. Check spam if it hasn’t arrived.</p>
    <Button variant="secondary" disabled={loading || resent} onClick={() => void resend()}>{resent ? "Confirmation email resent" : loading ? "Sending…" : "Resend confirmation email"}</Button>
    <p className="text-sm text-text-secondary">Already registered? <Link className="text-accent hover:underline" href={`/auth/login?next=${encodeURIComponent(safeNext(next))}`}>Log in</Link> or <Link className="text-accent hover:underline" href="/auth/forgot-password">reset your password</Link>.</p>
    {error && <p role="alert">{error}</p>}
  </div>;
  return <form className="mt-8 space-y-4" onSubmit={onSubmit}>
    <label className="block text-sm text-text-secondary">Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputClass} /></label>
    <label className="block text-sm text-text-secondary">Password<input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} aria-describedby="password-help" className={inputClass} /></label>
    <p id="password-help" className="text-sm text-text-secondary">Use at least 8 characters.</p>
    <label className="block text-sm text-text-secondary">Account type<select value={role} onChange={e => setRole(e.target.value as SignupRole)} className={inputClass}>{SIGNUP_ROLES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    {error && <p role="alert" className="text-sm text-text-primary">{error}</p>}
    <Button type="submit" className="w-full" disabled={!supabaseReady || loading}>{loading ? "Creating account…" : "Create account"}</Button>
  </form>;
}
