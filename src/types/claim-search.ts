export type ClaimSearchHit = {
  id: string;
  slug: string;
  displayName: string;
  firstName: string;
  lastName: string;
  position: string | null;
  classYear: number | null;
  stateCode: string | null;
  jerseyNumber: number | null;
  status: string;
  verificationStatus: string | null;
  schoolName: string | null;
  schoolCity: string | null;
  source: "supabase" | "seed";
};
