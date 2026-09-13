"use client";

import { useState, useTransition } from "react";

type Preview = {
  count: number;
  states: string[];
  missingSourceUrl: number;
  sample: Array<{
    firstName: string;
    lastName: string;
    schoolName: string;
    stateCode: string;
    position?: string;
  }>;
  errors: string[];
};

export default function CsvImportPanel() {
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onPreview() {
    startTransition(async () => {
      setResult(null);
      const res = await fetch("/api/admin/ingestion/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, mode: "preview" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(data.error || "Preview failed");
        return;
      }
      setPreview(data.preview);
    });
  }

  function onConfirm() {
    startTransition(async () => {
      const res = await fetch("/api/admin/ingestion/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, mode: "confirm" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(data.error || "Import failed");
        return;
      }
      setResult(`Imported ${data.imported} players (${data.duplicates} duplicates skipped).`);
    });
  }

  return (
    <section className="space-y-3">
      <h3 className="text-lg text-text-primary">CSV import (permitted data)</h3>
      <p className="text-sm text-text-secondary">
        Required columns: <code>first_name,last_name,school,state</code>. Recommended:{" "}
        <code>position,class_year,jersey_number,height,weight,source_url</code>. Preview before
        insert. Never fabricate rows.
      </p>
      <textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        rows={8}
        placeholder="first_name,last_name,school,state,position,class_year,jersey_number,height,weight,source_url"
        className="w-full rounded-xl border border-border bg-bg-primary px-3 py-2 font-mono text-xs text-text-primary"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || !csv.trim()}
          onClick={onPreview}
          className="rounded-lg bg-bg-card px-4 py-2 text-sm text-text-primary border border-border disabled:opacity-50"
        >
          Preview
        </button>
        <button
          type="button"
          disabled={pending || !preview || preview.count === 0}
          onClick={onConfirm}
          className="rounded-lg bg-accent px-4 py-2 text-sm text-bg-primary disabled:opacity-50"
        >
          Confirm import
        </button>
      </div>
      {preview ? (
        <div className="rounded-xl border border-border bg-bg-card p-3 text-sm text-text-secondary">
          <p>
            {preview.count} rows · states {preview.states.join(", ") || "—"} · missing source_url{" "}
            {preview.missingSourceUrl}
          </p>
          {preview.errors.length ? (
            <ul className="mt-2 list-disc pl-5 text-amber-200/90">
              {preview.errors.slice(0, 8).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
          <ul className="mt-2 space-y-1">
            {preview.sample.map((r, i) => (
              <li key={`${r.firstName}-${r.lastName}-${i}`}>
                {r.firstName} {r.lastName} · {r.schoolName} ({r.stateCode}) {r.position || ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {result ? <p className="text-sm text-accent">{result}</p> : null}
    </section>
  );
}
