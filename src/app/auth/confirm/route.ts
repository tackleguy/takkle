import { callbackNext } from "@/lib/auth/flow";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");
  const next = type === "recovery" ? "/auth/reset-password" : callbackNext(nextParam);

  if (token_hash && type && ["signup", "invite", "magiclink", "recovery", "email", "email_change"].includes(type)) {
    try {
      const supabase = await createClient();
      if (supabase) {
        const { error } = await supabase.auth.verifyOtp({ type, token_hash });
        if (!error) {
          return NextResponse.redirect(`${origin}${next}`);
        }
      }
    } catch { /* Invalid or unavailable links return to login with recovery options. */ }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=confirm&next=${encodeURIComponent(next)}`);
}
