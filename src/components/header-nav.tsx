"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient, type SessionUser } from "@/lib/auth-client";

/** Top navigation with sign-out. Shows admin links for admins only. */
export function HeaderNav() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const { data } = authClient.useSession();
  const user = (data?.user as SessionUser | undefined) ?? null;

  async function signOut() {
    setBusy(true);
    try {
      await authClient.signOut();
      router.push("/sign-in");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/listings" className="text-lg font-semibold text-accent">
          CampusTrade
        </Link>
        <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {user ? (
            <>
              <Link href="/listings" className="text-ink hover:text-accent">
                Browse
              </Link>
              <Link href="/listings/new" className="text-ink hover:text-accent">
                Post item
              </Link>
              <Link href="/my-listings" className="text-ink hover:text-accent">
                My items
              </Link>
              <Link href="/contacts" className="text-ink hover:text-accent">
                Contacts
              </Link>
              {user.role === "admin" ? (
                <>
                  <Link href="/admin/reports" className="text-ink hover:text-accent">
                    Reports
                  </Link>
                  <Link href="/admin/users" className="text-ink hover:text-accent">
                    Users
                  </Link>
                </>
              ) : null}
            </>
          ) : (
            <Link href="/listings" className="text-ink hover:text-accent">
              Browse
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <span className="text-ink-muted">
                {user.name}
                {user.role === "admin" ? " (admin)" : ""}
              </span>
              <button
                type="button"
                onClick={signOut}
                disabled={busy}
                className="button-target rounded border border-line bg-surface px-4 py-2 font-medium text-ink hover:bg-paper disabled:opacity-60"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="button-target inline-flex items-center rounded border border-line bg-surface px-4 py-2 font-medium text-ink hover:bg-paper"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="button-target inline-flex items-center rounded border border-accent bg-accent px-4 py-2 font-medium text-white hover:opacity-90"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
