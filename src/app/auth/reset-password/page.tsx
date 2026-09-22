import Link from "next/link";
import PasswordRecoveryForm from "@/components/auth/PasswordRecoveryForm";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export const metadata = { title: "Choose a new password", robots: { index: false } };
export default async function ResetPasswordPage() {
  const client = await createClient();
  const result = client ? await client.auth.getUser().catch(() => null) : null;
  const available = Boolean(result?.data.user);
  return <div className="mx-auto w-full max-w-md px-4 py-16"><h1 className="text-4xl">Choose a new password</h1>{available ? <><p className="mt-2 text-text-secondary">Use at least 8 characters.</p><PasswordRecoveryForm mode="update" available /></> : <><p className="mt-4 text-text-secondary">Open the link in your password reset email. If the link has expired, request a new one.</p><Link href="/auth/forgot-password" className="mt-4 inline-block text-accent hover:underline">Request a reset link</Link></>}</div>;
}
