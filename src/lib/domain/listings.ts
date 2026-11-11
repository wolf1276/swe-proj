import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { serializeListing, serializeMyListing, type ListingSummary } from "@/lib/serialize";
import type { ListingInput, ListingQuery, ListingUpdate } from "@/lib/validation";

/**
 * Listing domain logic (FR-4, FR-5, FR-6).
 *
 * Rules enforced server-side only:
 * - ownerId is always taken from the session actor, never the request body;
 * - moderation state and other privileged fields are never client-writable;
 * - owner deletion is a soft delete (deletedAt tombstone, data-model.md) so
 *   contact/report history stays intact;
 * - removed or deleted listings never reappear in discovery and cannot be
 *   republished by owner edits;
 * - edits require a matching version (optimistic concurrency, 409 on stale);
 * - search only returns visible listings for students.
 */

const LISTING_INCLUDE = {
  category: true,
  owner: { select: { id: true, name: true } },
} satisfies Prisma.ListingInclude;

const PAGE_SIZE = 20;

function priceForPersistence(input: ListingInput | ListingUpdate): number | null {
  // Donations persist a null price; sales store whole-paise integers.
  return input.offerType === "sale" ? (input.priceMinor ?? 0) : null;
}

function assertOfferPricing(input: ListingInput | ListingUpdate): void {
  if (input.offerType === "donation" && (input.priceMinor ?? 0) !== 0) {
    throw new ApiError(422, "PRICE_NOT_ALLOWED", "Donations cannot have a price");
  }
  if (input.offerType === "sale" && input.priceMinor === undefined) {
    throw new ApiError(422, "PRICE_REQUIRED", "Sale listings require a price");
  }
}

async function categoryOrNotFound(categoryId: string) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, active: true },
  });
  if (!category) {
    throw new ApiError(400, "CATEGORY_NOT_FOUND", "Unknown category");
  }
  return category;
}

/** Listings hidden from everyone: tombstoned or removed after review. */
function isHidden(listing: { deletedAt: Date | null; moderationState: string }): boolean {
  return listing.deletedAt !== null || listing.moderationState === "removed";
}

export async function createListing(
  actor: { userId: string },
  input: ListingInput
): Promise<ReturnType<typeof serializeListing>> {
  assertOfferPricing(input);
  await categoryOrNotFound(input.categoryId);
  const listing = await prisma.listing.create({
    data: {
      title: input.title,
      description: input.description,
      categoryId: input.categoryId,
      offerType: input.offerType,
      priceMinor: priceForPersistence(input),
      condition: input.condition,
      availability: "available",
      ownerId: actor.userId,
      version: 1,
    },
    include: LISTING_INCLUDE,
  });
  return serializeListing(listing);
}

export async function getVisibleListing(
  actor: { userId: string; role: "user" | "admin" },
  listingId: string
): Promise<ReturnType<typeof serializeListing>> {
  const listing = await prisma.listing.findFirst({
    where: { id: listingId },
    include: LISTING_INCLUDE,
  });
  if (!listing) {
    throw new ApiError(404, "NOT_FOUND", "Listing not found");
  }
  // Admin review access is separate from student visibility (api.md).
  if (isHidden(listing)) {
    throw new ApiError(404, "NOT_FOUND", "Listing not found");
  }
  return serializeListing(listing);
}

export async function updateListing(
  actor: { userId: string; role: "user" | "admin" },
  listingId: string,
  input: ListingUpdate
): Promise<ReturnType<typeof serializeListing>> {
  assertOfferPricing(input);
  await categoryOrNotFound(input.categoryId);
  const existing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!existing || existing.ownerId !== actor.userId) {
    // Do not leak existence of other users' listings via 403 vs 404.
    throw new ApiError(404, "NOT_FOUND", "Listing not found");
  }
  if (isHidden(existing)) {
    // Removed/deleted listings cannot be republished by owner edits.
    throw new ApiError(
      409,
      "LISTING_NOT_EDITABLE",
      "This listing is no longer editable."
    );
  }
  if (existing.version !== input.version) {
    throw new ApiError(
      409,
      "VERSION_CONFLICT",
      "This listing was changed by someone else. Reload and try again."
    );
  }
  try {
    const listing = await prisma.listing.update({
      where: { id: listingId, ownerId: actor.userId, version: input.version, deletedAt: null, moderationState: "visible" },
      data: {
        title: input.title,
        description: input.description,
        categoryId: input.categoryId,
        offerType: input.offerType,
        priceMinor: priceForPersistence(input),
        condition: input.condition,
        availability: input.availability ?? existing.availability,
        version: { increment: 1 },
      },
      include: LISTING_INCLUDE,
    });
    return serializeListing(listing);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2025" || error.code === "P2002")
    ) {
      // Version-filtered update missed: the row changed concurrently.
      throw new ApiError(
        409,
        "VERSION_CONFLICT",
        "This listing was changed by someone else. Reload and try again."
      );
    }
    throw error;
  }
}

export async function deleteOwnListing(
  actor: { userId: string; role: "user" | "admin" },
  listingId: string
): Promise<void> {
  const existing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!existing || existing.ownerId !== actor.userId) {
    throw new ApiError(404, "NOT_FOUND", "Listing not found");
  }
  if (existing.deletedAt !== null) {
    return; // idempotent: already tombstoned
  }
  // Soft delete keeps referenced contact/report history intact (api.md).
  await prisma.listing.update({
    where: { id: listingId },
    data: { deletedAt: new Date(), availability: "unavailable", version: { increment: 1 } },
  });
}

export interface ListingPage {
  items: ListingSummary[];
  page: number;
  pageSize: number;
  total: number;
  appliedFilters: ListingQuery;
}

export async function searchListings(query: ListingQuery): Promise<ListingPage> {
  const page = query.page ?? 1;
  const availability = query.availability === "all" ? undefined : query.availability ?? "available";
  const where: Prisma.ListingWhereInput = {
    deletedAt: null,
    moderationState: "visible",
    ...(availability ? { availability } : {}),
    ...(query.offerType ? { offerType: query.offerType } : {}),
    ...(query.condition ? { condition: query.condition } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.minPriceMinor !== undefined || query.maxPriceMinor !== undefined
      ? { AND: [{ OR: [
          { priceMinor: { ...(query.minPriceMinor !== undefined ? { gte: query.minPriceMinor } : {}), ...(query.maxPriceMinor !== undefined ? { lte: query.maxPriceMinor } : {}) } },
          ...((query.minPriceMinor ?? 0) === 0 ? [{ offerType: "donation" as const, priceMinor: null }] : []),
        ] }] }
      : {}),
    ...(query.q
      ? {
          OR: [
            { title: { contains: query.q, mode: "insensitive" } },
            { description: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: LISTING_INCLUDE,
    }),
  ]);
  return {
    items: rows.map(serializeListing),
    page,
    pageSize: PAGE_SIZE,
    total,
    appliedFilters: query,
  };
}

export async function listMyListings(
  actor: { userId: string }
): Promise<ReturnType<typeof serializeMyListing>[]> {
  const rows = await prisma.listing.findMany({
    where: { ownerId: actor.userId, deletedAt: null },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: { ...LISTING_INCLUDE, _count: { select: { reports: true } } },
  });
  return rows.map(serializeMyListing);
}

/** Sets availability without a full edit (used by quick toggles). */
export async function setAvailability(
  actor: { userId: string; role: "user" | "admin" },
  listingId: string,
  availability: "available" | "unavailable"
): Promise<ReturnType<typeof serializeListing>> {
  const existing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!existing || existing.ownerId !== actor.userId) {
    throw new ApiError(404, "NOT_FOUND", "Listing not found");
  }
  if (isHidden(existing)) {
    throw new ApiError(409, "LISTING_NOT_EDITABLE", "This listing is no longer editable.");
  }
  const listing = await prisma.listing.update({
    where: { id: listingId, version: existing.version, deletedAt: null, moderationState: "visible" },
    data: { availability, version: { increment: 1 } },
    include: LISTING_INCLUDE,
  });
  return serializeListing(listing);
}
