import { NextResponse } from "next/server";
import { z } from "zod";
import { handleRoute, requireAdmin } from "@/lib/http";
import { REPORT_FILTER_STATES } from "@/lib/validation";
import { listReports } from "@/lib/domain/reports";

/** GET /api/admin/reports - review queue (active authorized admin). */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async () => {
    await requireAdmin(request);
    const stateParam = new URL(request.url).searchParams.get("state");
    const state = stateParam ? z.enum(REPORT_FILTER_STATES).parse(stateParam) : undefined;
    const page = z.coerce.number().int().min(1).max(10000).parse(new URL(request.url).searchParams.get("page") ?? 1);
    return NextResponse.json(await listReports({ state, page }));
  });
}
