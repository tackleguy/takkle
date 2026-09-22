import { callbackNext } from "@/lib/auth/flow";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next = callbackNext(nextParam);

  if (code) {
    try {
      const supabase = await createClient();
      if (supabase) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          return NextResponse.redirect(`${origin}${next}`);
        }
      }
    } catch { /* Invalid or unavailable links return to login with recovery options. */ }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=confirm&next=${encodeURIComponent(next)}`);
}
