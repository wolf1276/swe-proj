import { NextResponse } from "next/server";
import { handleRoute, assertSameOrigin, readJson, requireAdmin } from "@/lib/http";
import { adminUserStatusSchema, USER_ID } from "@/lib/validation";
import { setUserStatus } from "@/lib/domain/users";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/admin/users/:id/status - suspend/reactivate (reason/audit). */
export async function PATCH(request: Request, { params }: Params): Promise<Response> {
  return handleRoute(async () => {
    assertSameOrigin(request);
    const actor = await requireAdmin(request);
    const { id } = await params;
    const body = adminUserStatusSchema.parse(await readJson(request));
    const user = await setUserStatus(actor, USER_ID.parse(id), body);
    return NextResponse.json(user);
  });
}
