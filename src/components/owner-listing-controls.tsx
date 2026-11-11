"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary } from "@/components/ui";
import type { ListingDetail } from "@/lib/serialize";

/**
 * Owner controls on the detail page: availability toggle and delete with
 * explicit confirmation. Never optimistic - success only after the server
 * confirms; conflicts are surfaced for retry.
 */
export function OwnerListingControls({ listing }: { listing: ListingDetail }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function toggleAvailability() {
    setBusy(true);
    setErrors([]);
    try {
      const response = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: listing.title,
          description: listing.description,
          categoryId: listing.category.id,
          offerType: listing.offerType,
          priceMinor: listing.offerType === "sale" ? listing.priceRupees * 100 : 0,
          currency: "INR",
          condition: listing.condition,
          availability: listing.availability === "available" ? "unavailable" : "available",
          version: listing.version,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
        setErrors([body.error?.message ?? "Could not update availability. Please try again."]);
        return;
      }
      router.refresh();
    } catch {
      setErrors(["Network error. The listing was not changed."]);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    setBusy(true);
    setErrors([]);
    try {
      const response = await fetch(`/api/listings/${listing.id}`, { method: "DELETE" });
      if (response.status !== 204) {
        const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
        setErrors([body.error?.message ?? "Could not delete the listing."]);
        setConfirmDelete(false);
        return;
      }
      router.push("/my-listings");
      router.refresh();
    } catch {
      setErrors(["Network error. The listing was not deleted."]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <ErrorSummary messages={errors} />
      <div className="flex flex-wrap gap-2">
        <a
          href={`/listings/${listing.id}/edit`}
          className="button-target inline-flex items-center rounded border border-line bg-surface px-4 py-2 font-medium text-ink hover:bg-paper"
        >
          Edit listing
        </a>
        <button
          type="button"
          onClick={toggleAvailability}
          disabled={busy}
          className="button-target inline-flex items-center rounded border border-line bg-surface px-4 py-2 font-medium text-ink hover:bg-paper disabled:opacity-60"
        >
          Mark as {listing.availability === "available" ? "unavailable" : "available"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          disabled={busy}
          className="button-target inline-flex items-center rounded border border-danger bg-danger px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          Delete listing
        </button>
      </div>
      {confirmDelete ? (
        <div role="alertdialog" aria-labelledby="delete-confirm-title" className="rounded border border-danger p-4" style={{ backgroundColor: "#fbe9e7" }}>
          <p id="delete-confirm-title" className="font-medium text-ink">
            Delete &quot;{listing.title}&quot; from the marketplace?
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            This removes the item from discovery. Existing contact and report records are retained.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="button-target inline-flex items-center rounded border border-danger bg-danger px-4 py-2 font-medium text-white disabled:opacity-60"
            >
              {busy ? "Deleting..." : "Confirm delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              disabled={busy}
              className="button-target inline-flex items-center rounded border border-line bg-surface px-4 py-2 font-medium text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
