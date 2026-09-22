"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
export default function ClaimReviewButtons({ claimId }: { claimId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function review(approve: boolean) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/claims", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ claimId, approve }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save review."); }
    finally { setBusy(false); }
  }
  return <div className="mt-4"><p className="mb-3 text-sm text-text-secondary">Approve only after independently verifying the player’s identity and school details.</p><div className="flex gap-3"><Button disabled={busy} onClick={() => void review(true)}>Approve verified claim</Button><Button variant="secondary" disabled={busy} onClick={() => void review(false)}>Reject claim</Button></div>{error && <p role="alert" className="mt-2 text-sm">{error}</p>}</div>;
}
