import { NextResponse } from "next/server";
import { handleRoute } from "@/lib/http";
import { isDevelopmentMailboxEnabled, readMailSink } from "@/lib/mail";

/**
 * GET /api/dev/mailbox - development-only sink reader.
 *
 * Exists ONLY while MAIL_ADAPTER=sink in a non-production deployment so the
 * verification flow can be demonstrated locally. It is a mail transport
 * inspection tool, not a verification bypass: tokens are still consumed via
 * the normal verification endpoints. Production rejects the sink adapter at
 * startup (env.ts), so this route returns 404 there.
 */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async () => {
    if (!isDevelopmentMailboxEnabled()) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Not found" } },
        { status: 404 }
      );
    }
    const limitParam = new URL(request.url).searchParams.get("limit");
    const limit = Math.min(Math.max(Number(limitParam) || 25, 1), 100);
    const messages = await readMailSink(limit);
    return NextResponse.json({ items: messages });
  });
}
