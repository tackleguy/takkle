"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";

export default function PasswordRecoveryForm({ mode, available }: { mode: "request" | "update"; available: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      const client = createClient();
      if (!client) throw new Error("Account services are temporarily unavailable. Please try again later.");
      if (mode === "request") {
        const { error } = await client.auth.resetPasswordForEmail(String(fields.get("email")).trim(), { redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password` });
        if (error) throw error;
        setSent(true);
      } else {
        const password = String(fields.get("password"));
        if (password !== fields.get("confirmPassword")) throw new Error("Your passwords don’t match.");
        const { data, error: authError } = await client.auth.getUser();
        if (authError || !data.user) throw new Error("This reset link has expired. Request a new password reset email.");
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        form.reset(); router.replace("/account?password=updated"); router.refresh();
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn’t complete the request. Check your connection and try again."); }
    finally { setBusy(false); }
  }
  if (sent) return <p role="status" className="mt-6 text-text-secondary">If an account exists for that address, you’ll receive a password reset link. Check your inbox and spam folder.</p>;
  const inputClass = "mt-1 w-full rounded-lg border border-border bg-field px-4 py-3 text-text-primary focus-visible:outline-accent";
  return <form className="mt-6 space-y-4" onSubmit={submit}>
    {mode === "request" ? <label className="block text-sm text-text-secondary">Email<input name="email" type="email" autoComplete="email" required className={inputClass} /></label> : <>
      <label className="block text-sm text-text-secondary">New password<input name="password" type="password" autoComplete="new-password" required minLength={8} className={inputClass} /></label>
      <label className="block text-sm text-text-secondary">Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} className={inputClass} /></label>
    </>}
    {error && <p role="alert" className="text-sm">{error}</p>}
    <Button type="submit" disabled={!available || busy}>{busy ? "Please wait…" : mode === "request" ? "Send reset link" : "Save new password"}</Button>
    {mode === "update" && <Link href="/auth/forgot-password" className="block text-sm text-accent hover:underline">Request a new reset link</Link>}
  </form>;
}
