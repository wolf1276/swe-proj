import Link from "next/link";
import type { ReactNode } from "react";

/** Shared UI primitives using the design.md tokens. */

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6">
      {children}
    </main>
  );
}

export function PageHeading({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold text-ink" style={{ fontSize: "28px" }}>
        {title}
      </h1>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-card border border-line bg-surface p-4 ${className}`}
      style={{ borderRadius: "10px" }}
    >
      {children}
    </div>
  );
}

const buttonBase =
  "button-target inline-flex items-center justify-center gap-2 rounded border px-4 py-2 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60";

export function buttonClass(variant: "primary" | "secondary" | "danger" | "quiet" = "primary") {
  switch (variant) {
    case "primary":
      return `${buttonBase} border-accent bg-accent text-accent-ink hover:opacity-90`;
    case "secondary":
      return `${buttonBase} border-line bg-surface text-ink hover:bg-paper`;
    case "danger":
      return `${buttonBase} border-danger bg-danger text-white hover:opacity-90`;
    case "quiet":
      return `${buttonBase} border-transparent bg-transparent text-accent underline-offset-4 hover:underline`;
  }
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="text-center">
      <p className="text-lg font-medium text-ink">{title}</p>
      <p className="mt-1 text-ink-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  );
}

export function ErrorSummary({ messages }: { messages: string[] }) {
  if (messages.length === 0) {
    return null;
  }
  return (
    <div
      role="alert"
      className="rounded border border-danger bg-danger-soft px-4 py-3 text-danger"
      style={{ backgroundColor: "#fbe9e7", borderRadius: "10px", borderColor: "#b42318" }}
    >
      <p className="font-semibold">Please fix the following:</p>
      <ul className="mt-1 list-disc pl-5">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "danger" | "amber";
}) {
  const tones: Record<string, string> = {
    neutral: "border-line bg-paper text-ink-muted",
    accent: "border-accent text-accent",
    danger: "border-danger text-danger",
    amber: "border-amber text-amber",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "quiet";
}) {
  return (
    <Link href={href} className={buttonClass(variant)}>
      {children}
    </Link>
  );
}
