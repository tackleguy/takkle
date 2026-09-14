interface EmailCaptureProps {
  stateName?: string;
  source?: string;
  headline?: string;
  description?: string;
}

const BEEHIIV_URL = "https://takklenil.beehiiv.com/subscribe";

export default function EmailCapture({
  stateName,
  headline,
  description,
}: EmailCaptureProps) {
  const defaultHeadline = stateName
    ? `Want the Full ${stateName} NIL Playbook?`
    : "Get Your Free College NIL Playbook";
  const defaultDescription = stateName
    ? `Get a free guide covering NIL deals, taxes, and compliance tips for athletes in ${stateName}.`
    : "Get a free guide covering NIL deals, taxes, and contracts for college athletes.";

  return (
    <div className="bg-bg-card-hover border border-border rounded-xl p-6">
      <h4 className="text-lg font-semibold text-text-primary font-[family-name:var(--font-heading)]">
        {headline || defaultHeadline}
      </h4>
      <p className="text-sm text-text-secondary mt-1 mb-4">
        {description || defaultDescription}
      </p>
      <a
        href={BEEHIIV_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors text-sm"
      >
        Subscribe Free
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </a>
    </div>
  );
}
