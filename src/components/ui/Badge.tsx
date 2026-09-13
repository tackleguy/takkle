import { type ReactNode } from "react";

type Tone = "default" | "accent" | "turf" | "muted" | "warning";

const tones: Record<Tone, string> = {
  default: "bg-bg-card border-border text-text-secondary",
  accent: "bg-accent/15 border-accent/40 text-accent",
  turf: "bg-turf/15 border-turf/40 text-turf",
  muted: "bg-bg-card border-border text-text-muted",
  warning: "bg-status-limited/15 border-status-limited/40 text-status-limited",
};

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

export default function Badge({ children, tone = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
