"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ErrorSummary } from "@/components/ui";

const REASONS: { value: string; label: string }[] = [
  { value: "misleading", label: "Misleading description or price" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "prohibited_item", label: "Prohibited item" },
  { value: "spam", label: "Spam or duplicate posting" },
  { value: "other", label: "Other" },
];

/**
 * Report dialog (FR-7, design.md): reason + optional explanation.
 * A report never removes content automatically; duplicates of a pending
 * report are surfaced predictably. Focus returns to the trigger on close.
 */
export function ReportListingButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    dialogRef.current?.showModal();
    dialogRef.current?.querySelector<HTMLSelectElement>("select")?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        dialogRef.current?.close(); setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!reason) {
      setErrors(["Choose a reason for your report."]);
      return;
    }
    setBusy(true);
    setErrors([]);
    try {
      const response = await fetch(`/api/listings/${listingId}/reports`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(details.trim() ? { reason, details: details.trim() } : { reason }),
      });
      const body = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        setErrors([body.error?.message ?? "Could not submit the report. Please try again."]);
        return;
      }
      setReceipt("Report received. A reviewer will look at it; the item stays visible until a reviewed decision is made.");
      dialogRef.current?.close(); setOpen(false);
    } catch {
      setErrors(["Network error. Your report was not sent - please try again."]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setErrors([]);
          setOpen(true);
        }}
        className="button-target inline-flex items-center rounded border border-line bg-surface px-4 py-2 font-medium text-ink hover:bg-paper"
      >
        Report this listing
      </button>
      {receipt ? (
        <p role="status" className="mt-2 text-sm text-ink-muted">
          {receipt}
        </p>
      ) : null}
      {open ? (
          <dialog
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="m-auto w-[calc(100%-2rem)] max-w-md rounded border border-line bg-surface p-4 backdrop:bg-black/40"
            onCancel={(event) => { event.preventDefault(); dialogRef.current?.close(); setOpen(false); triggerRef.current?.focus(); }}
          >
            <h2 id={titleId} className="text-lg font-semibold text-ink">
              Report this listing
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Reports are reviewed by an administrator. Reporting does not remove the listing.
            </p>
            <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
              <ErrorSummary messages={errors} />
              <div>
                <label htmlFor="report-reason" className="mb-1 block font-medium">
                  Reason
                </label>
                <select
                  id="report-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="button-target w-full rounded border border-line bg-surface px-3 py-2"
                >
                  <option value="">Select a reason</option>
                  {REASONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="report-details" className="mb-1 block font-medium">
                  Explanation (optional)
                </label>
                <textarea
                  id="report-details"
                  rows={3}
                  maxLength={1000}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full rounded border border-line bg-surface px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    dialogRef.current?.close(); setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className="button-target inline-flex items-center rounded border border-line bg-surface px-4 py-2 font-medium text-ink hover:bg-paper"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="button-target inline-flex items-center rounded border border-danger bg-danger px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
                >
                  {busy ? "Sending..." : "Submit report"}
                </button>
              </div>
            </form>
          </dialog>
      ) : null}
    </div>
  );
}
