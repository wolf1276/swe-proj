import { redirect } from "next/navigation";
import { getServerActor } from "@/lib/session-server";
import { listReports } from "@/lib/domain/reports";
import { Badge, Card, PageShell } from "@/components/ui";
import { ReportResolvePanel } from "@/components/report-resolve-panel";

export const dynamic = "force-dynamic";

/** Admin report review queue (FR-7/FR-8): pending first, resolved history. */
export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ state?: string; page?: string }> }) {
  const actor = await getServerActor();
  if (!actor) {
    redirect("/sign-in");
  }
  if (actor.role !== "admin" || !actor.active) {
    return (
      <PageShell>
        <Card>
          <h1 className="text-xl font-semibold text-ink">Administrator access required</h1>
          <p className="mt-2 text-ink-muted">
            Your account is not authorized to review reports.
          </p>
        </Card>
      </PageShell>
    );
  }
  const params = await searchParams;
  const state = params.state === "pending" || params.state === "dismissed" || params.state === "actioned" ? params.state : undefined;
  const page = Math.floor(Math.min(10000, Math.max(1, Number(params.page) || 1)));
  const result = await listReports({ state, page });
  const reports = result.items;
  const pending = reports.filter((report) => report.state === "pending");
  const resolved = reports.filter((report) => report.state !== "pending");

  return (
    <PageShell>
      <h1 className="mb-6 text-2xl font-semibold text-ink">Report review queue</h1>
      <nav aria-label="Report states" className="mb-4 flex flex-wrap gap-4"><a href="/admin/reports" className="text-accent underline">All reports</a><a href="?state=pending" className="text-accent underline">Pending only</a><a href="?state=dismissed" className="text-accent underline">Dismissed</a><a href="?state=actioned" className="text-accent underline">Removed</a></nav>
      <p className="mb-4" role="status">{result.total} reports found; page {result.page}</p>
      <section aria-labelledby="pending-heading">
        <h2 id="pending-heading" className="mb-3 text-lg font-semibold text-ink">
          Pending review ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <Card>
            <p className="text-ink-muted">No reports are waiting for review.</p>
          </Card>
        ) : (
          <ul className="space-y-4">
            {pending.map((report) => (
              <li key={report.id}>
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-ink">
                      {report.reason.replace(/_/g, " ")} -{" "}
                      <a href={`/listings/${report.listing.id}`} className="text-accent underline">
                        {report.listing.title}
                      </a>
                    </h3>
                    <Badge tone="amber">Pending</Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    Reported by {report.reporter.name} -{" "}
                    {new Date(report.createdAt).toLocaleString()}
                  </p>
                  {report.details ? (
                    <p className="mt-2 whitespace-pre-wrap text-ink">{report.details}</p>
                  ) : null}
                  <div className="mt-3 rounded border border-line p-3"><h4 className="font-medium">Listing context</h4><p className="whitespace-pre-wrap">{report.listing.description || "No description provided."}</p><p className="mt-1 text-sm">{report.listing.offerType === "donation" ? "Donation" : `Rs ${(report.listing.priceMinor ?? 0) / 100}`} · {report.listing.condition} · {report.listing.availability}</p></div>
                  <ReportResolvePanel report={report} />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="resolved-heading" className="mt-8">
        <h2 id="resolved-heading" className="mb-3 text-lg font-semibold text-ink">
          Resolved ({resolved.length})
        </h2>
        {resolved.length === 0 ? (
          <p className="text-ink-muted">No resolved reports yet.</p>
        ) : (
          <ul className="space-y-3">
            {resolved.map((report) => (
              <li key={report.id}>
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-ink">
                      {report.reason.replace(/_/g, " ")} - {report.listing.title}
                    </h3>
                    <Badge tone={report.state === "actioned" ? "danger" : "neutral"}>
                      {report.state === "actioned" ? "Listing removed" : "Dismissed"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    Reviewed by {report.reviewedBy?.name ?? "unknown"} -{" "}
                    {report.resolvedAt ? new Date(report.resolvedAt).toLocaleString() : ""} -{" "}
                    reason: {report.reviewReason ?? "(none recorded)"}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
      <nav aria-label="Report pages" className="mt-6 flex gap-4">{result.page > 1 ? <a className="text-accent underline" href={`?state=${state ?? ""}&page=${result.page - 1}`}>Previous reports</a> : null}{result.page * result.pageSize < result.total ? <a className="text-accent underline" href={`?state=${state ?? ""}&page=${result.page + 1}`}>Next reports</a> : null}</nav>
    </PageShell>
  );
}
