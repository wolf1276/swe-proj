import { redirect } from "next/navigation";
import { getServerActor } from "@/lib/session-server";
import { listUsers } from "@/lib/domain/users";
import { Badge, Card, PageShell } from "@/components/ui";
import { AdminUserStatusControls } from "@/components/admin-user-status-controls";

export const dynamic = "force-dynamic";

/**
 * Admin user list (FR-8): minimum fields needed for moderation - display
 * name, email (verified state), role, status, listing count. No public
 * directory: this page requires admin authorization.
 */
export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
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
            Your account is not authorized to manage users.
          </p>
        </Card>
      </PageShell>
    );
  }
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 120) : "";
  const currentPage = Math.min(10000, Math.max(1, Number(params.page) || 1));
  const result = await listUsers({ q, page: Math.floor(currentPage) });
  const users = result.items;

  return (
    <PageShell>
      <h1 className="mb-6 text-2xl font-semibold text-ink">User management</h1>
      <form method="get" className="mb-6 flex flex-wrap items-end gap-2"><div><label htmlFor="user-search" className="block font-medium">Find a user</label><input id="user-search" name="q" defaultValue={q} maxLength={120} className="rounded border border-line bg-surface px-3 py-2" /></div><button className="button-target rounded border border-line px-3 py-2">Search users</button></form>
      <p className="mb-4" role="status">{result.total} users found</p>
      <ul className="space-y-4">
        {users.map((user) => (
          <li key={user.id}>
            <Card className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-ink">
                  {user.name}
                  {user.role === "admin" ? " (admin)" : ""}{" "}
                  {user.id === actor.userId ? <span className="text-ink-muted">(you)</span> : null}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {user.email} - {user.listingCount} listing(s) - joined{" "}
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
                <p className="mt-2 flex flex-wrap gap-2">
                  {user.emailVerified ? (
                    <Badge tone="accent">Email verified</Badge>
                  ) : (
                    <Badge tone="amber">Email unverified</Badge>
                  )}
                  {user.suspended ? (
                    <Badge tone="danger">
                      Suspended{user.banReason ? `: ${user.banReason}` : ""}
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Active</Badge>
                  )}
                </p>
              </div>
              <AdminUserStatusControls user={user} />
            </Card>
          </li>
        ))}
      </ul>
      <nav aria-label="User pages" className="mt-6 flex gap-4">{result.page > 1 ? <a className="text-accent underline" href={`?q=${encodeURIComponent(q)}&page=${result.page - 1}`}>Previous users</a> : null}{result.page * result.pageSize < result.total ? <a className="text-accent underline" href={`?q=${encodeURIComponent(q)}&page=${result.page + 1}`}>Next users</a> : null}</nav>
    </PageShell>
  );
}
