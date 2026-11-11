"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary } from "@/components/ui";
import type { AdminUserSummary } from "@/lib/serialize";

/**
 * Admin user management action (FR-8): suspend/reactivate with a reason.
 * Confirmation is explicit; self-suspension and last-admin suspension are
 * rejected server-side. Every action is audited.
 */
export function AdminUserStatusControls({ user }: { user: AdminUserSummary }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit(action: "suspend" | "reactivate") {
    setBusy(true);
    setErrors([]);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(reason.trim() ? { action, reason: reason.trim() } : { action }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
        setErrors([body.error?.message ?? "Could not update the account status."]);
        return;
      }
      setReason("");
      setConfirming(false);
      router.refresh();
    } catch {
      setErrors(["Network error. The status was not changed - please retry."]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <ErrorSummary messages={errors} />
      {user.suspended ? (
        <button
          type="button"
          onClick={() => submit("reactivate")}
          disabled={busy}
          className="button-target inline-flex items-center rounded border border-accent bg-accent px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Reactivating..." : "Reactivate account"}
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setConfirming((value) => !value)}
            disabled={busy}
            className="button-target inline-flex items-center rounded border border-danger bg-danger px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            Suspend account
          </button>
          {confirming ? (
            <div className="space-y-2">
              <label htmlFor={`user-reason-${user.id}`} className="block font-medium">
                Reason (recorded in the audit log)
              </label>
              <input
                id={`user-reason-${user.id}`}
                type="text"
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded border border-line bg-surface px-3 py-2"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => submit("suspend")}
                  disabled={busy}
                  className="button-target inline-flex items-center rounded border border-danger bg-danger px-4 py-2 font-medium text-white disabled:opacity-60"
                >
                  {busy ? "Suspending..." : "Confirm suspension"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="button-target inline-flex items-center rounded border border-line bg-surface px-4 py-2 font-medium text-ink"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
