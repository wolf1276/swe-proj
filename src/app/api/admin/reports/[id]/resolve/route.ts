import { NextResponse } from "next/server";
import { handleRoute, assertSameOrigin, readJson, requireAdmin } from "@/lib/http";
import { reportResolveSchema, UUID } from "@/lib/validation";
import { resolveReport } from "@/lib/domain/reports";

type Params = { params: Promise<{ id: string }> };

/** POST /api/admin/reports/:id/resolve - dismiss or remove listing. */
export async function POST(request: Request, { params }: Params): Promise<Response> {
  return handleRoute(async () => {
    assertSameOrigin(request);
    const actor = await requireAdmin(request);
    const { id } = await params;
    const body = reportResolveSchema.parse(await readJson(request));
    const report = await resolveReport(actor, UUID.parse(id), body);
    return NextResponse.json(report);
  });
}
