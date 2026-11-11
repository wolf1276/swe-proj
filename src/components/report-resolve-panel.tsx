"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary } from "@/components/ui";
import type { ReportSummary } from "@/lib/serialize";

/**
 * Admin review panel (FR-8, design.md): dismiss or remove with a recorded
 * reason. Removal is atomic with report resolution and audited server-side;
 * conflicts (already resolved) are surfaced for reload.
 */
export function ReportResolvePanel({ report }: { report: ReportSummary }) {
  const router = useRouter();
  const [action, setAction] = useState<"dismiss" | "remove">("dismiss");
  const [reviewReason, setReviewReason] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (reviewReason.trim().length < 3) {
      setErrors(["Enter a review reason (at least 3 characters)."]);
      return;
    }
    setBusy(true);
    setErrors([]);
    try {
      const response = await fetch(`/api/admin/reports/${report.id}/resolve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, reviewReason: reviewReason.trim() }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
        setErrors([body.error?.message ?? "Could not resolve the report. Reload and try again."]);
        return;
      }
      router.refresh();
    } catch {
      setErrors(["Network error. The report was not resolved - please retry."]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-3 border-t border-line pt-3" noValidate>
      <ErrorSummary messages={errors} />
      <fieldset>
        <legend className="mb-1 font-medium">Decision</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name={`action-${report.id}`}
              checked={action === "dismiss"}
              onChange={() => setAction("dismiss")}
            />
            Dismiss report
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name={`action-${report.id}`}
              checked={action === "remove"}
              onChange={() => setAction("remove")}
            />
            Remove listing
          </label>
        </div>
      </fieldset>
      <div>
        <label htmlFor={`reason-${report.id}`} className="mb-1 block font-medium">
          Review reason (recorded in the audit log)
        </label>
        <input
          id={`reason-${report.id}`}
          type="text"
          maxLength={1000}
          value={reviewReason}
          onChange={(e) => setReviewReason(e.target.value)}
          className="w-full rounded border border-line bg-surface px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="button-target inline-flex items-center rounded border border-accent bg-accent px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Submitting decision..." : action === "remove" ? "Remove listing" : "Dismiss report"}
      </button>
    </form>
  );
}
