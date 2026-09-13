/**
 * Claim security helpers — server-side validation only.
 * Never allow a second verified owner to take over by name alone.
 */

export const CLAIM_RATE_LIMIT = {
  maxAttempts: 5,
  windowHours: 24,
} as const;

export type ClaimVerificationSignal =
  | "school_email"
  | "parent_guardian"
  | "roster_match"
  | "school_info"
  | "jersey_number"
  | "season_info"
  | "manual_review"
  | "other_trusted";

export interface ClaimSubmission {
  playerId: string;
  userId: string;
  schoolEmail?: string;
  jerseyNumber?: number;
  seasonYear?: number;
  signals: ClaimVerificationSignal[];
  notes?: string;
}

export interface ClaimDecision {
  allowed: boolean;
  reason?: string;
  requiresManualReview: boolean;
}

/** Email ownership alone does not prove the person is the athlete. */
export function evaluateClaimStrength(submission: ClaimSubmission): ClaimDecision {
  const signals = new Set(submission.signals);

  if (signals.has("manual_review")) {
    return { allowed: true, requiresManualReview: true };
  }

  const hasSchoolEmail = signals.has("school_email") && !!submission.schoolEmail;
  const hasRoster = signals.has("roster_match");
  const hasIdentity =
    signals.has("jersey_number") ||
    signals.has("season_info") ||
    signals.has("school_info") ||
    signals.has("parent_guardian");

  if (hasSchoolEmail && !hasIdentity && !hasRoster) {
    return {
      allowed: false,
      reason: "School email alone does not prove athlete identity. Add roster or jersey signals.",
      requiresManualReview: true,
    };
  }

  if ((hasSchoolEmail || hasRoster) && hasIdentity) {
    return { allowed: true, requiresManualReview: false };
  }

  if (signals.has("parent_guardian") && hasRoster) {
    return { allowed: true, requiresManualReview: false };
  }

  return {
    allowed: true,
    requiresManualReview: true,
    reason: "Insufficient automated signals — queued for manual review.",
  };
}

/**
 * Domains are NOT assumed school emails from TLD (.edu/.org/.net).
 * Must match verified school_domains registry.
 */
export function isVerifiedSchoolDomain(
  email: string,
  verifiedDomains: string[],
): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return verifiedDomains.map((d) => d.toLowerCase()).includes(domain);
}

export function isWithinRateLimit(attemptCount: number): boolean {
  return attemptCount < CLAIM_RATE_LIMIT.maxAttempts;
}
