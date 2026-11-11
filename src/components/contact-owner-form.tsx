"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary } from "@/components/ui";

/**
 * Contact initiation (FR-6, design.md): durable interest record with an
 * optional bounded message. Success only after the server persists the
 * contact; notification delivery status is reported separately. This is
 * coordination only - "Arrange payment and collection directly with the
 * owner."
 */
export function ContactOwnerForm({
  listingId,
  listingTitle,
}: {
  listingId: string;
  listingTitle: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ notificationStatus: string; created: boolean } | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors([]);
    try {
      const response = await fetch(`/api/listings/${listingId}/contacts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(message.trim() ? { message: message.trim() } : {}),
      });
      const body = (await response.json()) as {
        notificationStatus?: string;
        created?: boolean;
        error?: { message?: string };
      };
      if (!response.ok) {
        setErrors([body.error?.message ?? "Could not send your interest. Please try again."]);
        return;
      }
      setDone({
        notificationStatus: body.notificationStatus ?? "pending",
        created: body.created ?? true,
      });
      router.refresh();
    } catch {
      setErrors(["Network error. Your interest has not been sent - please try again."]);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div
        role="status"
        className="rounded border border-accent bg-accent-soft p-4"
        style={{ backgroundColor: "#e2efec", borderColor: "#146356" }}
      >
        <p className="font-medium text-ink">
          Interest recorded for &quot;{listingTitle}&quot;.
        </p>
        <p className="mt-1 text-ink-muted">
          Arrange payment and collection directly with the owner.
        </p>
        <a href="/contacts" className="text-accent underline">Open My contacts to email the owner</a>
        <p className="mt-1 text-sm text-ink-muted">
          Owner notification:{" "}
          {done.notificationStatus === "sent"
            ? "accepted by mail adapter"
            : done.notificationStatus === "failed"
              ? "delivery failed - open My contacts to email the owner directly"
              : "pending"}
          {done.created ? "" : " (you had already expressed interest; your earlier record is kept)"}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <ErrorSummary messages={errors} />
      <div>
        <label htmlFor="contact-message" className="mb-1 block font-medium">
          Message to the owner (optional)
        </label>
        <textarea
          id="contact-message"
          rows={4}
          maxLength={1000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded border border-line bg-surface px-3 py-2"
        />
      </div>
      <p className="text-sm text-ink-muted">Expressing interest shares your campus email with the owner and their email with you in My contacts.</p>
      <button
        type="submit"
        disabled={busy}
        className="button-target inline-flex items-center rounded border border-accent bg-accent px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Sending..." : "Express interest"}
      </button>
    </form>
  );
}
