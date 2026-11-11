import { z } from "zod";
import { NextResponse } from "next/server";
import { handleRoute, requireAdmin } from "@/lib/http";
import { listUsers } from "@/lib/domain/users";

/** GET /api/admin/users - user management list (minimum fields). */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async () => {
    await requireAdmin(request);
    const query = z.object({ q: z.string().trim().max(120).optional(), page: z.coerce.number().int().min(1).max(10000).optional() }).parse(Object.fromEntries(new URL(request.url).searchParams));
    return NextResponse.json(await listUsers(query));
  });
}
