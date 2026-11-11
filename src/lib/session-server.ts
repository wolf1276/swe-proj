import { headers } from "next/headers";
import { getActor, type Actor } from "@/lib/http";

/**
 * Session helper for React Server Components. Derives the actor from the
 * request cookies on the server - identity is never read from the client.
 *
 * (API route handlers use getActor(request) directly so they stay
 * importable by integration tests without Next.js runtime magic.)
 */
export async function getServerActor(): Promise<Actor | null> {
  const headerList = await headers();
  const cookie = headerList.get("cookie");
  if (!cookie) {
    return null;
  }
  return getActor(new Request("http://server/", { headers: { cookie } }));
}
