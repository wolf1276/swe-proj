import { notFound, redirect } from "next/navigation";
import { getServerActor } from "@/lib/session-server";
import { listCategories } from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { serializeListing } from "@/lib/serialize";
import { Card, PageShell } from "@/components/ui";
import { ListingForm } from "@/components/listing-form";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

/** Edit own listing (FR-4): owner-scoped, version concurrency handled by form. */
export default async function EditListingPage({ params }: { params: Params }) {
  const actor = await getServerActor();
  if (!actor) {
    redirect("/sign-in");
  }
  if (!actor.studentEligible) {
    redirect("/listings");
  }
  const { id } = await params;
  const row = await prisma.listing.findFirst({
    where: { id, ownerId: actor.userId, deletedAt: null },
    include: { category: true, owner: { select: { id: true, name: true } } },
  });
  if (!row || row.moderationState === "removed") {
    // Removed listings cannot be edited/republished (data-model.md).
    notFound();
  }
  const categories = await listCategories();
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="mb-6 text-2xl font-semibold text-ink">Edit listing</h1>
        <Card>
          <ListingForm categories={categories} listing={serializeListing(row)} />
        </Card>
      </div>
    </PageShell>
  );
}
