import Link from "next/link";
import { type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover shadow-[0_0_24px_rgba(255,106,0,0.25)]",
  secondary: "bg-field text-text-primary hover:bg-bg-card-hover border border-border",
  ghost: "text-text-secondary hover:text-text-primary hover:bg-bg-card",
  outline:
    "border border-accent/60 text-accent hover:bg-accent/10 hover:border-accent",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

interface ButtonProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  href?: string;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  href,
  className = "",
  onClick,
  type = "button",
  disabled,
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 ${variants[variant]} ${sizes[size]} ${className} ${disabled ? "opacity-50 pointer-events-none" : ""}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
