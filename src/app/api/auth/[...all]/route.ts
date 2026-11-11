import { consumeVerificationProof } from "@/lib/verification-proof";
import { assertSameOrigin, readJson, handleRoute } from "@/lib/http";
import { env, isEligibleCampusEmail } from "@/lib/env";
import { auth } from "@/lib/auth";

// Expose only the authentication surface this application uses. The admin
// plugin's generic role/ban/delete/impersonation endpoints must never bypass
// CampusTrade's review, audit, and last-admin rules.
const allowed = new Set([
  "sign-in/email", "sign-up/email", "sign-out", "get-session",
  "verify-email", "send-verification-email",
]);
async function handler(request: Request) {
  return handleRoute(async () => {
  assertSameOrigin(request);
  const path = new URL(request.url).pathname.replace(/^\/api\/auth\//, "");
  if (!allowed.has(path)) return Response.json({ error: { code: "NOT_FOUND", message: "Not found" } }, { status: 404 });
  if (path === "sign-up/email" && request.method === "POST") {
    const body = await readJson(request.clone()) as Record<string, unknown> | null;
    if (!body || !isEligibleCampusEmail(String(body.email ?? ""))) return Response.json({ error: { code: "EMAIL_DOMAIN_NOT_ALLOWED", message: "Only approved campus email domains can register" } }, { status: 403 });
    if (["role", "banned", "emailVerified", "emailVerifiedAt", "userId"].some(key => key in body)) return Response.json({ error: { code: "PRIVILEGED_FIELDS", message: "Account privilege fields cannot be submitted" } }, { status: 400 });
  }
  if (path === "verify-email" && !(await consumeVerificationProof(new URL(request.url).searchParams.get("token") ?? ""))) {
    return Response.redirect(new URL("/verify-email?error=INVALID_TOKEN", env.appUrl));
  }
  return auth.handler(request);
  });
}
export { handler as GET, handler as POST };
