import { NextResponse } from "next/server";
import { handleRoute, getActor } from "@/lib/http";
import { isEligibleCampusEmail } from "@/lib/env";

/** GET /api/me - minimal current account/permissions (api.md). */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const actor = await getActor(request);
    if (!actor) {
      return NextResponse.json({ authenticated: false });
    }
    return NextResponse.json({
      authenticated: true,
      user: {
        id: actor.userId,
        name: actor.name,
        email: actor.email,
        role: actor.role,
        emailVerified: actor.emailVerified,
        active: actor.active,
      },
      permissions: {
        canBrowse: actor.studentEligible,
        canSell: actor.studentEligible,
        canContact: actor.studentEligible,
        canReport: actor.studentEligible,
        canAdmin: actor.role === "admin" && actor.active,
      },
      campusDomainEligible: isEligibleCampusEmail(actor.email),
    });
  });
}
