"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CategoryOption } from "@/lib/categories";

/**
 * Filter sidebar (design.md): filters saved in the URL, combined with AND,
 * reset returns to the documented baseline (available items, page 1).
 */
export function ListingFilters({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [minRupees, setMinRupees] = useState(() => {
    const minor = searchParams.get("minPriceMinor");
    return minor ? String(Number(minor) / 100) : "";
  });
  const [maxRupees, setMaxRupees] = useState(() => {
    const minor = searchParams.get("maxPriceMinor");
    return minor ? String(Number(minor) / 100) : "";
  });
  const [error, setError] = useState("");

  const categoryId = searchParams.get("categoryId") ?? "";
  const offerType = searchParams.get("offerType") ?? "";
  const condition = searchParams.get("condition") ?? "";
  const availability = searchParams.get("availability") ?? "";

  function apply(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    next.delete("page");
    startTransition(() => router.push(`/listings?${next.toString()}`));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (minRupees !== "" && maxRupees !== "" && Number(minRupees) > Number(maxRupees)) {
      setError("Minimum price cannot exceed maximum price.");
      return;
    }
    setError("");
    apply({
      q: q,
      minPriceMinor: minRupees === "" ? null : String(Math.round(Number(minRupees) * 100)),
      maxPriceMinor: maxRupees === "" ? null : String(Math.round(Number(maxRupees) * 100)),
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-label="Listing filters"
      className="space-y-4 rounded border border-line bg-surface p-4"
    >
      <fieldset disabled={pending} className="contents">
      <div>
        <label htmlFor="filter-q" className="mb-1 block font-medium">
          Search
        </label>
        <input
          id="filter-q"
          name="q"
          type="search"
          maxLength={120}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded border border-line bg-surface px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="filter-category" className="mb-1 block font-medium">
          Category
        </label>
        <select
          id="filter-category"
          value={categoryId}
          onChange={(e) => apply({ categoryId: e.target.value })}
          className="button-target w-full rounded border border-line bg-surface px-3 py-2"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="filter-offer" className="mb-1 block font-medium">
          Offer type
        </label>
        <select
          id="filter-offer"
          value={offerType}
          onChange={(e) => apply({ offerType: e.target.value })}
          className="button-target w-full rounded border border-line bg-surface px-3 py-2"
        >
          <option value="">Sale and donation</option>
          <option value="sale">Sale only</option>
          <option value="donation">Donation only</option>
        </select>
      </div>
      <fieldset>
        <legend className="mb-1 font-medium">Price range (rupees)</legend>
        <div className="flex items-center gap-2">
          <label htmlFor="filter-min" className="sr-only">
            Minimum price in rupees
          </label>
          <input
            id="filter-min"
            inputMode="numeric"
            placeholder="Min"
            value={minRupees}
            onChange={(e) => setMinRupees(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-full rounded border border-line bg-surface px-3 py-2"
          />
          <span aria-hidden="true">-</span>
          <label htmlFor="filter-max" className="sr-only">
            Maximum price in rupees
          </label>
          <input
            id="filter-max"
            inputMode="numeric"
            placeholder="Max"
            value={maxRupees}
            onChange={(e) => setMaxRupees(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-full rounded border border-line bg-surface px-3 py-2"
          />
        </div>
        <p className="mt-1 text-sm text-ink-muted">Applied with the search button.</p>
      </fieldset>
      <div>
        <label htmlFor="filter-condition" className="mb-1 block font-medium">
          Condition
        </label>
        <select
          id="filter-condition"
          value={condition}
          onChange={(e) => apply({ condition: e.target.value })}
          className="button-target w-full rounded border border-line bg-surface px-3 py-2"
        >
          <option value="">Any condition</option>
          <option value="new">New</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
        </select>
      </div>
      <div>
        <label htmlFor="filter-availability" className="mb-1 block font-medium">
          Availability
        </label>
        <select
          id="filter-availability"
          value={availability}
          onChange={(e) => apply({ availability: e.target.value })}
          className="button-target w-full rounded border border-line bg-surface px-3 py-2"
        >
          <option value="">Available (default)</option>
          <option value="unavailable">Unavailable</option>
          <option value="all">All</option>
        </select>
      </div>
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="button-target inline-flex flex-1 items-center justify-center rounded border border-accent bg-accent px-4 py-2 font-medium text-white hover:opacity-90"
        >
          Apply filters
        </button>
        <button
          type="button"
          onClick={() => {
            setQ("");
            setMinRupees("");
            setMaxRupees("");
            setError("");
            startTransition(() => router.push("/listings"));
          }}
          className="button-target inline-flex items-center rounded border border-line bg-surface px-4 py-2 font-medium text-ink hover:bg-paper"
        >
          Reset
        </button>
      </div>
      </fieldset>
    </form>
  );
}
