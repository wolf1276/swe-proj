import { NextResponse } from "next/server";
import { handleRoute, requireStudent } from "@/lib/http";
import { listMyListings } from "@/lib/domain/listings";

/** GET /api/my-listings - own listing management incl. status metadata. */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const actor = await requireStudent(request);
    const items = await listMyListings(actor);
    return NextResponse.json({ items });
  });
}
