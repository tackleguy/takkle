"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

export default function DisputeReviewButtons({ disputeId }: { disputeId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function resolve(revokeOwner: boolean) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disputeId,
          revokeOwner,
          notes: revokeOwner
            ? "Ownership revoked after dispute review."
            : "Dispute rejected; current owner retained.",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to resolve dispute.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save review.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <p className="mb-3 text-sm text-text-secondary">
        Revoke only when the current owner fails verification. Rejecting keeps the verified owner.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button disabled={busy} onClick={() => void resolve(true)}>
          Revoke ownership
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => void resolve(false)}>
          Keep owner / reject dispute
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
