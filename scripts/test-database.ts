/** Destructive tests are restricted to a separate, local, explicitly named DB. */
export function assertTestDatabase(testUrl: string, applicationUrl?: string): void {
  const url = new URL(testUrl);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || !["campustrade_test", "campustrade_e2e", "campustrade_perf"].includes(url.pathname.slice(1))) {
    throw new Error("Tests require a local campustrade_test, campustrade_e2e, or campustrade_perf database");
  }
  if (applicationUrl) {
    const app = new URL(applicationUrl);
    if (["localhost", "127.0.0.1", "[::1]"].includes(app.hostname) && (app.port || "5432") === (url.port || "5432") && app.pathname === url.pathname) throw new Error("Test database must differ from application database");
  }
}
