import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerActor } from "@/lib/session-server";
import { searchListings } from "@/lib/domain/listings";
import { listCategories } from "@/lib/categories";
import { listingQuerySchema } from "@/lib/validation";
import { ListingCard } from "@/components/listing-card";
import { ListingFilters } from "@/components/listing-filters";
import { Card, EmptyState, PageShell } from "@/components/ui";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const dynamic = "force-dynamic";

/** Browse grid (FR-2/FR-5): search, filters, count, pagination. */
export default async function ListingsPage({ searchParams }: { searchParams: SearchParams }) {
  const actor = await getServerActor();
  if (!actor) {
    redirect("/sign-in");
  }
  if (!actor.active) {
    return (
      <PageShell>
        <Card>
          <h1 className="text-xl font-semibold text-ink">Account suspended</h1>
          <p className="mt-2 text-ink-muted">
            Your CampusTrade account has been suspended. Contact the administrator if you believe
            this is an error.
          </p>
        </Card>
      </PageShell>
    );
  }
  if (!actor.emailVerified) {
    return (
      <PageShell>
        <Card>
          <h1 className="text-xl font-semibold text-ink">Verify your email to browse</h1>
          <p className="mt-2 text-ink-muted">
            Your mailbox is not verified yet. Sign in again to resend the verification email, then
            follow the link.
          </p>
          <div className="mt-4">
            <Link href="/sign-in" className="text-accent underline">
              Go to sign in
            </Link>
          </div>
        </Card>
      </PageShell>
    );
  }

  if (!actor.studentEligible) {
    return <PageShell><Card><h1 className="text-xl font-semibold">Campus access required</h1><p>Your email domain is not approved for marketplace access.</p></Card></PageShell>;
  }

  const params = await searchParams;
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value !== "") {
      flat[key] = value;
    }
  }
  // Invalid filter values degrade to the documented baseline rather than
  // leaking a raw validation error (api.md: safe errors only).
  const query = listingQuerySchema.safeParse(flat);
  const listingQuery = query.success ? query.data : { page: 1 };
  const page = await searchListings(listingQuery);
  const categories = await listCategories();
  const totalPages = Math.max(1, Math.ceil(page.total / page.pageSize));

  function pageHref(target: number) {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(flat)) {
      next.set(key, value);
    }
    next.set("page", String(target));
    return `/listings?${next.toString()}`;
  }

  return (
    <PageShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-ink">Browse listings</h1>
        <Link
          href="/listings/new"
          className="button-target inline-flex items-center rounded border border-accent bg-accent px-4 py-2 font-medium text-white hover:opacity-90"
        >
          Post an item
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <aside>
          <ListingFilters key={JSON.stringify(flat)} categories={categories} />
        </aside>
        <section aria-label="Search results">
          <p className="mb-4 text-ink-muted" role="status">
            {page.total} {page.total === 1 ? "listing" : "listings"} found
            {listingQuery.q ? ` for "${listingQuery.q}"` : ""}
          </p>
          {page.items.length === 0 ? (
            <EmptyState
              title="No listings match"
              description="Try changing or clearing the filters to see more items."
            />
          ) : (
            <ul className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {page.items.map((listing) => (
                <li key={listing.id} className="flex">
                  <div className="flex w-full">
                    <ListingCard listing={listing} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {totalPages > 1 ? (
            <nav
              aria-label="Pagination"
              className="mt-6 flex items-center justify-between border-t border-line pt-4"
            >
              {page.page > 1 ? (
                <Link href={pageHref(page.page - 1)} className="text-accent underline">
                  Previous page
                </Link>
              ) : (
                <span className="text-ink-muted">Previous page</span>
              )}
              <span className="text-ink-muted">
                Page {page.page} of {totalPages}
              </span>
              {page.page < totalPages ? (
                <Link href={pageHref(page.page + 1)} className="text-accent underline">
                  Next page
                </Link>
              ) : (
                <span className="text-ink-muted">Next page</span>
              )}
            </nav>
          ) : null}
        </section>
      </div>
    </PageShell>
  );
}
