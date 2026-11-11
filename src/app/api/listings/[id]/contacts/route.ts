import { limitMutation } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { handleRoute, assertSameOrigin, readJson, requireStudent } from "@/lib/http";
import { contactInputSchema, UUID } from "@/lib/validation";
import { expressInterest } from "@/lib/domain/contacts";

type Params = { params: Promise<{ id: string }> };

/** POST /api/listings/:id/contacts - express interest (non-owner, visible+available). */
export async function POST(request: Request, { params }: Params): Promise<Response> {
  return handleRoute(async () => {
    assertSameOrigin(request);
    const actor = await requireStudent(request);
    await limitMutation(actor.userId, "contacts");
    const { id } = await params;
    const body = contactInputSchema.parse(await readJson(request));
    const result = await expressInterest(actor, UUID.parse(id), body);
    return NextResponse.json(
      {
        contactId: result.contact.id,
        notificationStatus: result.contact.notificationStatus,
        contact: result.contact,
        created: result.created,
      },
      { status: result.created ? 201 : 200 }
    );
  });
}
