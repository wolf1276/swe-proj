import { limitMutation } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { handleRoute, assertSameOrigin, readJson, requireStudent } from "@/lib/http";
import { reportInputSchema, UUID } from "@/lib/validation";
import { reportListing } from "@/lib/domain/reports";

type Params = { params: Promise<{ id: string }> };

/** POST /api/listings/:id/reports - report content (non-owner, visible). */
export async function POST(request: Request, { params }: Params): Promise<Response> {
  return handleRoute(async () => {
    assertSameOrigin(request);
    const actor = await requireStudent(request);
    await limitMutation(actor.userId, "reports");
    const { id } = await params;
    const body = reportInputSchema.parse(await readJson(request));
    const result = await reportListing(actor, UUID.parse(id), body);
    return NextResponse.json(result, { status: 201 });
  });
}
