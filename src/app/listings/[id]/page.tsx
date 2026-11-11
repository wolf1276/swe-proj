import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerActor } from "@/lib/session-server";
import { getVisibleListing } from "@/lib/domain/listings";
import { formatRupees } from "@/lib/money";
import { Badge, Card, PageShell } from "@/components/ui";
import { ContactOwnerForm } from "@/components/contact-owner-form";
import { ReportListingButton } from "@/components/report-listing-button";
import { OwnerListingControls } from "@/components/owner-listing-controls";
import { ApiError } from "@/lib/http";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

/** Listing detail (design.md): full info + contact/report/owner controls. */
export default async function ListingDetailPage({ params }: { params: Params }) {
  const actor = await getServerActor();
  if (!actor) {
    redirect("/sign-in");
  }
  if (!actor.studentEligible) {
    redirect("/listings");
  }
  const { id } = await params;
  let listing;
  try {
    listing = await getVisibleListing(actor, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
  const isOwner = listing.owner.id === actor.userId;

  return (
    <PageShell>
      <nav aria-label="Breadcrumb" className="mb-4 text-ink-muted">
        <Link href="/listings" className="text-accent underline">
          Back to listings
        </Link>
      </nav>
      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div>
          <div
            aria-hidden="true"
            className="flex h-56 w-full items-center justify-center rounded border border-line bg-paper text-ink-muted"
          >
            No photo
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-ink">{listing.title}</h1>
          <p className="mt-1 text-ink-muted">
            {listing.category.name} - Condition: {listing.condition}
          </p>
          <p className="mt-3 text-xl font-semibold text-ink">
            {listing.offerType === "sale" ? (
              formatRupees(listing.priceRupees * 100)
            ) : (
              <Badge tone="accent">Donation - free to take</Badge>
            )}
          </p>
          <p className="mt-3">
            {listing.availability === "available" ? (
              <Badge tone="accent">Available</Badge>
            ) : (
              <Badge tone="amber">Unavailable</Badge>
            )}
          </p>
          <div className="mt-4">
            <h2 className="font-semibold text-ink">Description</h2>
            <p className="mt-1 whitespace-pre-wrap text-ink">
              {listing.description || "No description provided."}
            </p>
          </div>
          <p className="mt-4 text-sm text-ink-muted">
            Posted by {listing.owner.name} - {new Date(listing.createdAt).toLocaleDateString()}
          </p>
        </div>
        <aside aria-label="Actions" className="space-y-4">
          <Card>
            <h2 className="font-semibold text-ink">
              {isOwner ? "Owner controls" : "This item interests you?"}
            </h2>
            {isOwner ? (
              <div className="mt-3">
                <OwnerListingControls listing={listing} />
              </div>
            ) : listing.availability === "available" ? (
              <div className="mt-3">
                <ContactOwnerForm listingId={listing.id} listingTitle={listing.title} />
              </div>
            ) : (
              <p className="mt-2 text-ink-muted">
                This listing is marked unavailable by the owner, so new interest cannot be
                expressed.
              </p>
            )}
          </Card>
          {!isOwner ? (
            <Card>
              <div className="mt-1">
                <ReportListingButton listingId={listing.id} />
              </div>
            </Card>
          ) : null}
          <p className="text-sm text-ink-muted">
            CampusTrade only connects students. Arrange payment and collection directly with the
            other student; no payments are processed on this platform.
          </p>
        </aside>
      </div>
    </PageShell>
  );
}
