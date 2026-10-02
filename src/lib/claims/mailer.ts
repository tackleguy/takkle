import { EMAIL_OTP } from "@/lib/claims/security";

type SendResult =
  | { ok: true; delivered: true }
  | { ok: true; delivered: false; devCode?: string }
  | { ok: false; error: string };

/**
 * Claim OTP is transactional mail — separate from Beehiiv (newsletter subscribe only).
 * Prefer claimants signing in with a confirmed school email (no OTP send needed).
 * Optional: RESEND_API_KEY (or any SMTP-backed transactional provider) for OTP to a
 * different school mailbox. Beehiiv / Kit are not used here.
 */
export async function sendClaimOtpEmail(to: string, code: string): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CLAIM_OTP_FROM_EMAIL || "Takkle Claims <claims@takkle.com>";

  if (apiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: "Your Takkle profile claim code",
          text: `Your Takkle verification code is ${code}. It expires in ${EMAIL_OTP.ttlMinutes} minutes. If you did not request this, ignore this email.`,
        }),
      });
      if (!response.ok) {
        console.error("claim otp email failed", response.status);
        return { ok: false, error: "Couldn’t send the verification email. Try again shortly." };
      }
      return { ok: true, delivered: true };
    } catch (error) {
      console.error("claim otp email error", error);
      return { ok: false, error: "Couldn’t send the verification email. Try again shortly." };
    }
  }

  const allowDev =
    process.env.CLAIM_OTP_DEV_LOG === "1" || process.env.NODE_ENV !== "production";
  if (allowDev) {
    console.info(`[claim-otp] ${to} code=${code}`);
    return {
      ok: true,
      delivered: false,
      devCode: process.env.NODE_ENV !== "production" ? code : undefined,
    };
  }

  return {
    ok: false,
    error:
      "Sign in with your school email as your account email to verify, or ask support to enable claim codes.",
  };
}
