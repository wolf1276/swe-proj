import Link from "next/link";
import type { ListingSummary } from "@/lib/serialize";
import { formatRupees } from "@/lib/money";
import { Badge, Card } from "@/components/ui";

/**
 * Listing card (design.md): title, category, condition, sale price or
 * Donation label, availability, detail link. Neutral placeholder is used
 * because image storage is deferred (architecture.md). Never shows owner
 * email or payment buttons.
 */
export function ListingCard({ listing }: { listing: ListingSummary }) {
  return (
    <Card className="flex h-full w-full flex-col gap-3">
      <div
        aria-hidden="true"
        className="flex h-32 w-full items-center justify-center rounded bg-paper text-sm text-ink-muted"
      >
        No photo
      </div>
      <div>
        <h3 className="text-lg font-semibold text-ink">
          <Link href={`/listings/${listing.id}`} className="hover:text-accent">
            {listing.title}
          </Link>
        </h3>
        <p className="mt-1 text-ink-muted">
          {listing.category.name} - {listing.condition}
        </p>
        <p className="mt-2">
          {listing.offerType === "sale" ? (
            <span className="font-semibold text-ink">{formatRupees(listing.priceRupees * 100)}</span>
          ) : (
            <Badge tone="accent">Donation</Badge>
          )}
        </p>
        <p className="mt-2">
          {listing.availability === "available" ? (
            <Badge tone="accent">Available</Badge>
          ) : (
            <Badge tone="amber">Unavailable</Badge>
          )}
        </p>
      </div>
      <div className="mt-auto">
        <Link
          href={`/listings/${listing.id}`}
          className="button-target inline-flex items-center rounded border border-line bg-surface px-4 py-2 font-medium text-ink hover:bg-paper"
        >
          View details
        </Link>
      </div>
    </Card>
  );
}
