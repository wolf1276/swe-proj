"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function RetryNotificationButton({ contactId }: { contactId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function retry() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/contacts/${contactId}/retry`, { method: "POST" });
      if (!response.ok) { setError("Could not retry. Try again later."); return; }
      const contact = await response.json();
      if (contact.notificationStatus === "failed") setError("Mail is still unavailable. You can email the owner directly.");
      router.refresh();
    } catch { setError("Could not confirm notification status. Try again later."); }
    finally { setBusy(false); }
  }
  return <div className="mt-2"><button type="button" className="button-target rounded border border-line px-3 py-2" disabled={busy} onClick={retry}>{busy ? "Retrying..." : "Retry owner notification"}</button>{error ? <p role="alert" className="text-danger">{error}</p> : null}</div>;
}
