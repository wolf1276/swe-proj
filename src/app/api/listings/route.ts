import { NextResponse } from "next/server";
import { handleRoute, assertSameOrigin, readJson, requireStudent } from "@/lib/http";
import { listingInputSchema, parseListingQuery } from "@/lib/validation";
import { createListing, searchListings } from "@/lib/domain/listings";

/** GET /api/listings - search/filter/page (verified active student). */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async () => {
    await requireStudent(request);
    const query = parseListingQuery(new URL(request.url).searchParams);
    const result = await searchListings(query);
    return NextResponse.json(result);
  });
}

/** POST /api/listings - create listing (owner derived from session). */
export async function POST(request: Request): Promise<Response> {
  return handleRoute(async () => {
    assertSameOrigin(request);
    const actor = await requireStudent(request);
    const body = listingInputSchema.parse(await readJson(request));
    const listing = await createListing(actor, body);
    return NextResponse.json(listing, { status: 201 });
  });
}
