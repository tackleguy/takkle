import Link from "next/link";
import PasswordRecoveryForm from "@/components/auth/PasswordRecoveryForm";
import { isSupabaseConfigured } from "@/lib/supabase/server";
export const metadata = { title: "Reset your password" };
export default function ForgotPasswordPage() {
  const available = isSupabaseConfigured();
  return <div className="mx-auto w-full max-w-md px-4 py-16"><h1 className="text-4xl">Reset your password</h1><p className="mt-2 text-text-secondary">We’ll email you a link to choose a new password.</p>{!available && <p role="status" className="mt-4 text-text-secondary">Account services are temporarily unavailable. Please try again later.</p>}<PasswordRecoveryForm mode="request" available={available} /><Link href="/auth/login" className="mt-6 inline-block text-sm text-accent hover:underline">Back to login</Link></div>;
}
