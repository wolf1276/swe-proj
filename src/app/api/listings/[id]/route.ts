import { NextResponse } from "next/server";
import { handleRoute, assertSameOrigin, readJson, requireStudent } from "@/lib/http";
import { listingUpdateSchema, UUID } from "@/lib/validation";
import { getVisibleListing, updateListing, deleteOwnListing } from "@/lib/domain/listings";

type Params = { params: Promise<{ id: string }> };

/** GET /api/listings/:id - read visible item (admin review access separate). */
export async function GET(request: Request, { params }: Params): Promise<Response> {
  return handleRoute(async () => {
    const actor = await requireStudent(request);
    const { id } = await params;
    const listing = await getVisibleListing(actor, UUID.parse(id));
    return NextResponse.json(listing);
  });
}

/** PATCH /api/listings/:id - edit details/availability (owner, version match). */
export async function PATCH(request: Request, { params }: Params): Promise<Response> {
  return handleRoute(async () => {
    assertSameOrigin(request);
    const actor = await requireStudent(request);
    const { id } = await params;
    const body = listingUpdateSchema.parse(await readJson(request));
    const listing = await updateListing(actor, UUID.parse(id), body);
    return NextResponse.json(listing);
  });
}

/** DELETE /api/listings/:id - delete own listing (preserve history). */
export async function DELETE(request: Request, { params }: Params): Promise<Response> {
  return handleRoute(async () => {
    assertSameOrigin(request);
    const actor = await requireStudent(request);
    const { id } = await params;
    await deleteOwnListing(actor, UUID.parse(id));
    return new NextResponse(null, { status: 204 });
  });
}
