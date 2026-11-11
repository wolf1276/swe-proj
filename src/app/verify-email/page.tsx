import Link from "next/link";
import { getServerActor } from "@/lib/session-server";
import { Card, PageHeading, Badge } from "@/components/ui";

/**
 * Landing page after clicking the verification link. The server route has
 * already consumed the token (single-use, one hour expiry) and, on success,
 * established the session automatically before redirecting here.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const actor = await getServerActor();
  const status = typeof params["error"] === "string" ? params["error"] : "";

  const failed = Boolean(status);

  return (
    <main id="main" className="mx-auto w-full max-w-md px-4 pb-16 pt-10">
      <PageHeading title="Email verification" />
      {failed ? (
        <Card>
          <p className="font-medium text-danger">This verification link is invalid or has expired.</p>
          <p className="mt-2 text-ink-muted">
            Links expire after one hour and can be used only once. Sign in to request a fresh
            verification email.
          </p>
          <div className="mt-4">
            <Link href="/sign-in" className="text-accent underline">
              Go to sign in
            </Link>
          </div>
        </Card>
      ) : actor?.emailVerified ? (
        <Card>
          <p className="font-medium text-accent">Your campus email is verified.</p>
          <p className="mt-2 text-ink-muted">
            Welcome, {actor.name}. You can now browse, post items and contact other students.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/listings"
              className="button-target inline-flex rounded border border-accent bg-accent px-4 py-2 font-medium text-white"
            >
              Browse listings
            </Link>
            <Link
              href="/listings/new"
              className="button-target inline-flex rounded border border-line bg-surface px-4 py-2 font-medium text-ink"
            >
              Post an item
            </Link>
          </div>
          {!actor.studentEligible ? (
            <p className="mt-4">
              <Badge tone="amber">Note</Badge>{" "}
              <span className="text-ink-muted">
                Your email domain is not on the approved campus list, so marketplace features stay
                unavailable until that is resolved.
              </span>
            </p>
          ) : null}
        </Card>
      ) : (
        <Card>
          <p className="font-medium">Verification pending.</p>
          <p className="mt-2 text-ink-muted">
            If you just clicked the link, try refreshing this page. To receive a new link, sign in
            and choose &quot;resend verification email&quot;.
          </p>
          <div className="mt-4">
            <Link href="/sign-in" className="text-accent underline">
              Go to sign in
            </Link>
          </div>
        </Card>
      )}
    </main>
  );
}
