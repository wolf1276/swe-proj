import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerActor } from "@/lib/session-server";
import { listMyListings } from "@/lib/domain/listings";
import { formatRupees } from "@/lib/money";
import { Badge, Card, EmptyState, PageShell } from "@/components/ui";

export const dynamic = "force-dynamic";

/** Owner listing management (FR-4/FR-5): edit, availability, delete, status. */
export default async function MyListingsPage() {
  const actor = await getServerActor();
  if (!actor) {
    redirect("/sign-in");
  }
  if (!actor.studentEligible) {
    redirect("/listings");
  }
  const items = await listMyListings(actor);

  return (
    <PageShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-ink">My items</h1>
        <Link
          href="/listings/new"
          className="button-target inline-flex items-center rounded border border-accent bg-accent px-4 py-2 font-medium text-white hover:opacity-90"
        >
          Post an item
        </Link>
      </div>
      {items.length === 0 ? (
        <EmptyState
          title="You have not posted anything yet"
          description="Posting an item takes a minute: title, category, condition and a price or donation choice."
          action={
            <Link
              href="/listings/new"
              className="button-target inline-flex items-center rounded border border-accent bg-accent px-4 py-2 font-medium text-white"
            >
              Post your first item
            </Link>
          }
        />
      ) : (
        <ul className="space-y-4">
          {items.map((listing) => (
            <li key={listing.id}>
              <Card className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-ink">
                    <Link href={`/listings/${listing.id}`} className="hover:text-accent">
                      {listing.title}
                    </Link>
                  </h2>
                  <p className="mt-1 text-ink-muted">
                    {listing.category.name} - {listing.condition} -{" "}
                    {listing.offerType === "sale" ? formatRupees(listing.priceRupees * 100) : "Donation"}
                  </p>
                  <p className="mt-2 flex flex-wrap gap-2">
                    {listing.moderationState === "removed" ? (
                      <Badge tone="danger">Removed after review</Badge>
                    ) : listing.availability === "available" ? (
                      <Badge tone="accent">Available</Badge>
                    ) : (
                      <Badge tone="amber">Unavailable</Badge>
                    )}
                    {listing.reportCount > 0 ? (
                      <Badge tone="amber">{listing.reportCount} report(s)</Badge>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {listing.moderationState === "removed" ? (
                    <span className="text-ink-muted">Locked after review</span>
                  ) : (
                    <Link
                      href={`/listings/${listing.id}/edit`}
                      className="button-target inline-flex items-center rounded border border-line bg-surface px-4 py-2 font-medium text-ink hover:bg-paper"
                    >
                      Edit
                    </Link>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
