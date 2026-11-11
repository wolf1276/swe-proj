import { z } from "zod";
import { handleRoute, assertSameOrigin, readJson, ApiError } from "@/lib/http";
import { auth } from "@/lib/auth";
import { isEligibleCampusEmail } from "@/lib/env";

/**
 * CampusTrade sign-up wrapper.
 *
 * Session establishment and password hashing are delegated to the auth
 * integration (auth.api.signUpEmail); no homegrown token protocol. This
 * wrapper exists to surface the approved-domain policy as an explicit,
 * actionable error (design.md: "Ineligible domain" state). The allowlist is
 * public knowledge for a single-college marketplace, so rejecting clearly
 * does not leak sensitive account information. The server-side
 * validateUserInfo hook in src/lib/auth.ts remains the authoritative gate
 * that blocks provisioning for unapproved domains even on direct API calls.
 */

const signUpSchema = z.strictObject({
  name: z.string().trim().min(1).max(80),
  email: z.email().max(255),
  password: z.string().min(8).max(128),
  callbackURL: z.string().optional(),
});

export async function POST(request: Request): Promise<Response> {
  return handleRoute(async () => {
    assertSameOrigin(request);
    const body = signUpSchema.parse(await readJson(request));
    if (!isEligibleCampusEmail(body.email)) {
      throw new ApiError(
        403,
        "EMAIL_DOMAIN_NOT_ALLOWED",
        "Only approved campus email domains can register for CampusTrade. Use your college email address."
      );
    }
    // Route through the HTTP handler so auth rate limits and safe provider
    // errors apply to the wrapper exactly as to direct auth signup.
    return auth.handler(new Request(new URL("/api/auth/sign-up/email", request.url), {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(body),
    }));
  });
}
