"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";

export type TutorialStep = {
  title: string;
  body: string;
  detail?: string;
};

type TutorialFlowProps = {
  heading: string;
  intro: string;
  steps: TutorialStep[];
  finishTitle: string;
  finishBody: string;
  primary: { href: string; label: string };
  secondary: { href: string; label: string };
  skipHref?: string;
};

export default function TutorialFlow({
  heading,
  intro,
  steps,
  finishTitle,
  finishBody,
  primary,
  secondary,
  skipHref = "/discover",
}: TutorialFlowProps) {
  const [index, setIndex] = useState(0);
  const total = steps.length + 1;
  const done = index >= steps.length;
  const step = done ? null : steps[index];
  const progress = ((index + 1) / total) * 100;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl tracking-wide text-text-primary">
            {heading}
          </h1>
          <p className="mt-3 max-w-prose text-text-secondary">{intro}</p>
        </div>
        <Link
          href={skipHref}
          className="shrink-0 pt-2 text-sm text-text-muted transition-colors hover:text-accent focus-visible:outline-accent"
        >
          Skip
        </Link>
      </div>

      <div
        className="mt-8 h-1 overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={Math.min(index + 1, total)}
        aria-label="Tutorial progress"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-xs tabular-nums text-text-muted">
        {Math.min(index + 1, total)} of {total}
      </p>

      <div
        key={done ? "finish" : index}
        className="tutorial-panel mt-8 rounded-xl border border-border bg-bg-card p-6 sm:p-8"
      >
        {done ? (
          <>
            <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-text-primary">
              {finishTitle}
            </h2>
            <p className="mt-3 max-w-prose text-text-secondary">{finishBody}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href={primary.href} size="lg">
                {primary.label}
              </Button>
              <Button href={secondary.href} variant="outline" size="lg">
                {secondary.label}
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-text-primary">
              {step!.title}
            </h2>
            <p className="mt-3 max-w-prose text-text-secondary">{step!.body}</p>
            {step!.detail ? (
              <p className="mt-4 border-t border-border pt-4 text-sm text-text-muted">{step!.detail}</p>
            ) : null}
            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setIndex((n) => Math.max(0, n - 1))}
                disabled={index === 0}
                className="text-sm text-text-secondary transition-colors hover:text-text-primary disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-accent"
              >
                Back
              </button>
              <Button type="button" onClick={() => setIndex((n) => n + 1)} size="lg">
                {index === steps.length - 1 ? "Finish" : "Next"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
