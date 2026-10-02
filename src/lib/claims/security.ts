/**
 * Claim security helpers — server-side validation only.
 * Never allow a second verified owner to take over by name alone.
 * Ownership is never auto-granted from these helpers; they only gate submission.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const CLAIM_RATE_LIMIT = {
  maxAttempts: 5,
  windowHours: 24,
} as const;

export const EMAIL_OTP = {
  length: 6,
  ttlMinutes: 15,
  proofTtlMinutes: 30,
  maxAttempts: 5,
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

export interface RosterMatchInput {
  submittedJersey?: number | null;
  submittedSeason?: number | null;
  playerJersey?: number | null;
  playerClassYear?: number | null;
}

/** Email ownership alone does not prove the person is the athlete. */
export function evaluateClaimStrength(submission: ClaimSubmission): ClaimDecision {
  const signals = new Set(submission.signals);

  const hasVerifiedSchoolEmail = signals.has("school_email") && !!submission.schoolEmail;
  const hasEmailContact =
    !!submission.schoolEmail &&
    (hasVerifiedSchoolEmail || signals.has("school_info"));
  const hasRoster = signals.has("roster_match");
  const hasIdentity =
    signals.has("jersey_number") ||
    signals.has("season_info") ||
    signals.has("school_info") ||
    signals.has("parent_guardian");

  if (hasVerifiedSchoolEmail && !hasIdentity && !hasRoster) {
    return {
      allowed: false,
      reason: "School email alone does not prove athlete identity. Add jersey number and season.",
      requiresManualReview: true,
    };
  }

  if (!hasEmailContact && !(signals.has("parent_guardian") && (hasRoster || hasIdentity))) {
    return {
      allowed: false,
      reason: "Verify a school email, or file a guardian claim with jersey and season details.",
      requiresManualReview: true,
    };
  }

  if (!hasIdentity && !hasRoster) {
    return {
      allowed: false,
      reason: "Include jersey number and season year so we can match the roster record.",
      requiresManualReview: true,
    };
  }

  // Strong signals still require human review before ownership is granted.
  return {
    allowed: true,
    requiresManualReview: true,
    reason: hasRoster
      ? "Roster signals matched — queued for manual review."
      : "Queued for manual review with submitted identity signals.",
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
  const domain = emailDomain(email);
  if (!domain) return false;
  return verifiedDomains.map((d) => d.toLowerCase()).includes(domain);
}

export function emailDomain(email: string): string | null {
  const domain = email.trim().toLowerCase().split("@")[1];
  return domain || null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailsMatch(a: string, b: string): boolean {
  return normalizeEmail(a) === normalizeEmail(b);
}

export function isWithinRateLimit(attemptCount: number): boolean {
  return attemptCount < CLAIM_RATE_LIMIT.maxAttempts;
}

/** Score 0–1 based on jersey/season alignment with the ingested roster row. */
export function rosterMatchScore(input: RosterMatchInput): number {
  let score = 0;
  let checks = 0;
  if (input.playerJersey != null && input.submittedJersey != null) {
    checks += 1;
    if (input.playerJersey === input.submittedJersey) score += 1;
  }
  if (input.submittedSeason != null) {
    checks += 1;
    const year = new Date().getFullYear();
    if (input.submittedSeason >= year - 1 && input.submittedSeason <= year + 1) score += 0.5;
    if (input.playerClassYear != null && Math.abs(input.submittedSeason - input.playerClassYear) <= 1) {
      score += 0.5;
    }
  }
  if (checks === 0) return 0;
  return Math.min(1, Number((score / Math.max(checks, 1)).toFixed(3)));
}

export function buildClaimSignals(input: {
  relationship: "player" | "guardian";
  schoolEmailVerified: boolean;
  domainVerified: boolean;
  jerseyNumber?: number;
  seasonYear?: number;
  rosterScore: number;
}): ClaimVerificationSignal[] {
  const signals: ClaimVerificationSignal[] = ["manual_review"];
  if (input.relationship === "guardian") signals.push("parent_guardian");
  if (input.schoolEmailVerified && input.domainVerified) signals.push("school_email");
  else if (input.schoolEmailVerified) signals.push("school_info");
  if (input.jerseyNumber != null) signals.push("jersey_number");
  if (input.seasonYear != null) signals.push("season_info");
  if (input.rosterScore >= 0.5) signals.push("roster_match");
  return [...new Set(signals)];
}

export function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function generateOtpCode(length = EMAIL_OTP.length): string {
  const max = 10 ** length;
  const n = randomBytes(4).readUInt32BE(0) % max;
  return n.toString().padStart(length, "0");
}

export function generateProofToken(): string {
  return randomBytes(32).toString("base64url");
}

export function safeEqualHash(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function currentSeasonYear(now = new Date()): number {
  return now.getFullYear();
}
