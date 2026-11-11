import { NextResponse } from "next/server";
import { handleRoute, requireStudent } from "@/lib/http";
import { listMyContacts } from "@/lib/domain/contacts";

/** GET /api/contacts - participant-scoped contact records. */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const actor = await requireStudent(request);
    const items = await listMyContacts(actor);
    return NextResponse.json({ items });
  });
}
