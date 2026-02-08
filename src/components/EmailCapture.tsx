"use client";

import { useState } from "react";

interface EmailCaptureProps {
  stateName?: string;
  stateSlug?: string;
  source: string;
  headline?: string;
  description?: string;
}

export default function EmailCapture({
  stateName,
  stateSlug,
  source,
  headline,
  description,
}: EmailCaptureProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const defaultHeadline = stateName
    ? `Want the Full ${stateName} NIL Playbook?`
    : "Get Your Free NIL Playbook";
  const defaultDescription = stateName
    ? `Get a free PDF guide covering everything parents need to know about NIL rules in ${stateName}.`
    : "Get a free guide covering everything parents need to know about high school NIL rules.";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          stateSlug: stateSlug || "",
          source,
        }),
      });

      if (!res.ok) {
        throw new Error("Something went wrong. Please try again.");
      }

      setStatus("success");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong."
      );
    }
  }

  if (status === "success") {
    return (
      <div className="bg-status-permitted/10 border border-status-permitted/30 rounded-xl p-6 text-center">
        <svg
          className="w-8 h-8 text-status-permitted mx-auto mb-2"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-status-permitted font-semibold">You&apos;re in!</p>
        <p className="text-sm text-text-secondary mt-1">
          Check your email for your free guide.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-bg-card-hover border border-border rounded-xl p-6">
      <h4 className="text-lg font-semibold text-text-primary font-[family-name:var(--font-heading)]">
        {headline || defaultHeadline}
      </h4>
      <p className="text-sm text-text-secondary mt-1 mb-4">
        {description || defaultDescription}
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          required
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-bg-primary border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors disabled:opacity-50 text-sm shrink-0"
        >
          {status === "loading" ? "Sending..." : "Get Free Guide"}
        </button>
      </form>
      {status === "error" && (
        <p className="text-sm text-status-prohibited mt-2">{errorMessage}</p>
      )}
    </div>
  );
}
