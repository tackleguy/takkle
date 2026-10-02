"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";

export default function DisputeClaimForm({ playerSlug }: { playerSlug: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/claims/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerSlug, reason: fields.reason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn’t file dispute.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection lost. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="mt-4 text-sm text-text-secondary" role="status">
        Dispute filed. An admin will review ownership.
      </p>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" className="mt-4" onClick={() => setOpen(true)}>
        Dispute ownership
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border border-border bg-field p-4">
      <h3 className="text-lg text-text-primary">Dispute ownership</h3>
      <p className="text-sm text-text-secondary">
        Explain why this profile’s owner is wrong. Don’t upload private ID documents here.
      </p>
      <label className="block text-sm text-text-secondary">
        Reason
        <textarea
          name="reason"
          required
          minLength={20}
          maxLength={2000}
          rows={4}
          className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-text-primary focus-visible:outline-accent"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-text-primary">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Filing…" : "File dispute"}
        </Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
