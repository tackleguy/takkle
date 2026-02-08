"use client";

import Link from "next/link";
import { getStatusColor, getStatusLabel, type StateData } from "@/data/states";
import EmailCapture from "./EmailCapture";

interface StateResultProps {
  state: StateData;
  showFullLink?: boolean;
}

export default function StateResult({
  state,
  showFullLink = true,
}: StateResultProps) {
  const statusColor = getStatusColor(state.status);
  const statusLabel = getStatusLabel(state.status);

  return (
    <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      {/* Status header */}
      <div
        className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        style={{ borderBottom: `2px solid ${statusColor}` }}
      >
        <div>
          <h2 className="text-2xl font-bold font-[family-name:var(--font-heading)] text-text-primary">
            {state.name}
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            {state.athleticAssociationFull} ({state.athleticAssociation})
          </p>
          <p className="text-xs text-text-muted mt-1">{state.ruleCitation}</p>
        </div>
        <span
          className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold text-white shrink-0 self-start"
          style={{ backgroundColor: statusColor }}
        >
          {statusLabel}
        </span>
      </div>

      <div className="p-6 space-y-6">
        {/* Can Do */}
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-status-permitted mb-3">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            What Your Athlete CAN Do
          </h3>
          <ul className="space-y-2">
            {state.canDo.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="text-status-permitted mt-0.5 shrink-0">+</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Cannot Do */}
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-status-prohibited mb-3">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            What Your Athlete CANNOT Do
          </h3>
          <ul className="space-y-2">
            {state.cannotDo.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="text-status-prohibited mt-0.5 shrink-0">&minus;</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Notes */}
        {state.notes.length > 0 && (
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-accent mb-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              Important Notes
            </h3>
            <ul className="space-y-2">
              {state.notes.map((note, i) => (
                <li key={i} className="text-sm text-text-secondary">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Email capture */}
        <EmailCapture stateName={state.name} stateSlug={state.slug} source="tool" />

        {/* Full page link */}
        {showFullLink && (
          <div className="text-center pt-2">
            <Link
              href={`/nil-rules/${state.slug}`}
              className="text-sm text-accent hover:text-accent-hover transition-colors underline underline-offset-4"
            >
              View full {state.name} NIL rules guide &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
