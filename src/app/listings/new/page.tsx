import { redirect } from "next/navigation";
import { getServerActor } from "@/lib/session-server";
import { listCategories } from "@/lib/categories";
import { Card, PageShell } from "@/components/ui";
import { ListingForm } from "@/components/listing-form";

export const dynamic = "force-dynamic";

/** Create listing (FR-4). Eligible verified student only. */
export default async function NewListingPage() {
  const actor = await getServerActor();
  if (!actor) {
    redirect("/sign-in");
  }
  if (!actor.studentEligible) {
    redirect("/listings");
  }
  const categories = await listCategories();
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="mb-6 text-2xl font-semibold text-ink">Post an item</h1>
        <Card>
          <ListingForm categories={categories} />
        </Card>
      </div>
    </PageShell>
  );
}
