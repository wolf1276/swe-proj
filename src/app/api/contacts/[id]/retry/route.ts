import { handleRoute, assertSameOrigin, requireStudent } from "@/lib/http";
import { UUID } from "@/lib/validation";
import { limitMutation } from "@/lib/rate-limit";
import { retryContactNotification } from "@/lib/domain/contacts";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    assertSameOrigin(request);
    const actor = await requireStudent(request);
    await limitMutation(actor.userId, "notification-retry", 5);
    return Response.json(await retryContactNotification(actor, UUID.parse((await params).id)));
  });
}
