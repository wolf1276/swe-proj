"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary } from "@/components/ui";
import type { CategoryOption } from "@/lib/categories";
import type { ListingDetail } from "@/lib/serialize";

/**
 * Create/edit form (design.md): donation hides the editable sale price;
 * inline validation with an error summary; entered data is preserved on
 * network failure (no page reload on submit).
 */
export function ListingForm({
  categories,
  listing,
}: {
  categories: CategoryOption[];
  listing?: ListingDetail;
}) {
  const router = useRouter();
  const editing = Boolean(listing);
  const [title, setTitle] = useState(listing?.title ?? "");
  const [description, setDescription] = useState(listing?.description ?? "");
  const [categoryId, setCategoryId] = useState(listing?.category.id ?? categories[0]?.id ?? "");
  const [offerType, setOfferType] = useState<"sale" | "donation">(listing?.offerType ?? "sale");
  const [priceRupees, setPriceRupees] = useState(
    listing ? String(listing.priceRupees) : ""
  );
  const [condition, setCondition] = useState<"new" | "good" | "fair">(listing?.condition ?? "good");
  const [availability, setAvailability] = useState<"available" | "unavailable">(
    listing?.availability ?? "available"
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const fieldErrors: string[] = [];
    if (title.trim().length < 3) {
      fieldErrors.push("Title must be at least 3 characters.");
    }
    if (offerType === "sale" && !/^\d+$/.test(priceRupees.trim())) {
      fieldErrors.push("Enter a whole-rupee price for sale listings.");
    }
    if (offerType === "sale" && Number(priceRupees) > 1_000_000) {
      fieldErrors.push("Price cannot exceed Rs 1,000,000.");
    }
    if (fieldErrors.length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors([]);
    setBusy(true);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      categoryId,
      offerType,
      priceMinor: offerType === "sale" ? Number(priceRupees) * 100 : 0,
      currency: "INR",
      condition,
      ...(editing ? { availability, version: listing!.version } : {}),
    };
    try {
      const response = await fetch(editing ? `/api/listings/${listing!.id}` : "/api/listings", {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok && response.status !== 201) {
        const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
        setErrors([body.error?.message ?? "Could not save the listing. Please try again."]);
        return;
      }
      const saved = (await response.json()) as { id: string };
      router.push(`/listings/${saved.id}`);
      router.refresh();
    } catch {
      setErrors(["Network error. The listing was not saved - your entered data is preserved."]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <ErrorSummary messages={errors} />
      <div>
        <label htmlFor="listing-title" className="mb-1 block font-medium">
          Title
        </label>
        <input
          id="listing-title"
          type="text"
          required
          minLength={3}
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border border-line bg-surface px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="listing-description" className="mb-1 block font-medium">
          Description
        </label>
        <textarea
          id="listing-description"
          rows={5}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded border border-line bg-surface px-3 py-2"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="listing-category" className="mb-1 block font-medium">
            Category
          </label>
          <select
            id="listing-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="button-target w-full rounded border border-line bg-surface px-3 py-2"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="listing-condition" className="mb-1 block font-medium">
            Condition
          </label>
          <select
            id="listing-condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value as "new" | "good" | "fair")}
            className="button-target w-full rounded border border-line bg-surface px-3 py-2"
          >
            <option value="new">New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
          </select>
        </div>
      </div>
      <fieldset>
        <legend className="mb-1 font-medium">Offer type</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="offerType"
              value="sale"
              checked={offerType === "sale"}
              onChange={() => setOfferType("sale")}
            />
            For sale
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="offerType"
              value="donation"
              checked={offerType === "donation"}
              onChange={() => setOfferType("donation")}
            />
            Donation
          </label>
        </div>
      </fieldset>
      {offerType === "sale" ? (
        <div>
          <label htmlFor="listing-price" className="mb-1 block font-medium">
            Price (rupees)
          </label>
          <input
            id="listing-price"
            inputMode="numeric"
            required={offerType === "sale"}
            value={priceRupees}
            onChange={(e) => setPriceRupees(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-full max-w-xs rounded border border-line bg-surface px-3 py-2"
          />
          <p className="mt-1 text-sm text-ink-muted">Whole rupees, up to Rs 1,000,000.</p>
        </div>
      ) : (
        <p className="text-ink-muted">
          Donations are offered for free; no price is entered.
        </p>
      )}
      {editing ? (
        <div>
          <label htmlFor="listing-availability" className="mb-1 block font-medium">
            Availability
          </label>
          <select
            id="listing-availability"
            value={availability}
            onChange={(e) => setAvailability(e.target.value as "available" | "unavailable")}
            className="button-target w-full max-w-xs rounded border border-line bg-surface px-3 py-2"
          >
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </div>
      ) : (
        <p className="text-ink-muted">New listings start as available; you can change that later.</p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="button-target inline-flex items-center rounded border border-accent bg-accent px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Saving..." : editing ? "Save changes" : "Create listing"}
        </button>
        <button
          type="button"
          onClick={() => router.push(editing ? `/listings/${listing!.id}` : "/listings")}
          className="button-target inline-flex items-center rounded border border-line bg-surface px-4 py-2 font-medium text-ink hover:bg-paper"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
