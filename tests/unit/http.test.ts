import { describe, expect, it, vi } from "vitest";
import { ApiError, assertSameOrigin, handleRoute, readJson } from "@/lib/http";

function request(method: string, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/listings", { method, headers });
}

describe("CSRF same-origin guard (security.md)", () => {
  it("allows safe methods without origin signals", () => {
    expect(() => assertSameOrigin(request("GET"))).not.toThrow();
    expect(() => assertSameOrigin(request("HEAD"))).not.toThrow();
  });

  it("allows unsafe methods with the exact deployment origin", () => {
    expect(() => assertSameOrigin(request("POST", { origin: "http://localhost:3000" }))).not.toThrow();
  });

  it("rejects cross-origin unsafe requests", () => {
    expect(() => assertSameOrigin(request("POST", { origin: "https://evil.example" }))).toThrowError(
      /Cross-origin/
    );
    expect(() => assertSameOrigin(request("PATCH", { origin: "http://localhost:3000.evil.example" }))).toThrow();
  });

  it("rejects unsafe requests with no origin signal at all", () => {
    expect(() => assertSameOrigin(request("POST"))).toThrowError(/same-origin/);
    expect(() => assertSameOrigin(request("DELETE", { origin: "null" }))).toThrow();
  });

  it("accepts same-origin Sec-Fetch-Site as a fallback signal", () => {
    expect(() => assertSameOrigin(request("POST", { "sec-fetch-site": "same-origin" }))).not.toThrow();
    expect(() => assertSameOrigin(request("POST", { "sec-fetch-site": "same-site" }))).toThrow();
    expect(() => assertSameOrigin(request("POST", { "sec-fetch-site": "cross-site" }))).toThrow();
  });
});

describe("JSON body reading", () => {
  it("requires the JSON content type", async () => {
    await expect(readJson(request("POST", { "content-type": "text/plain" }))).rejects.toMatchObject({
      code: "UNSUPPORTED_MEDIA_TYPE",
    });
  });

  it("rejects malformed JSON with a client error, not a crash", async () => {
    const req = new Request("http://localhost:3000/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    await expect(readJson(req)).rejects.toMatchObject({ code: "INVALID_JSON" });
  });

  it("treats an empty body as an empty object", async () => {
    const req = new Request("http://localhost:3000/", {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    await expect(readJson(req)).resolves.toEqual({});
  });
});

describe("route error translation", () => {
  it("translates ApiError to its status and code", async () => {
    const response = await handleRoute(async () => {
      throw new ApiError(409, "VERSION_CONFLICT", "stale");
    });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: { code: "VERSION_CONFLICT", message: "stale" },
    });
  });

  it("does not leak unexpected error details", async () => {
    const response = await handleRoute(async () => {
      throw new Error("secret database string");
    });
    expect(response.status).toBe(500);
    const body = (await response.json()) as { error: { message: string; code: string } };
    expect(body.error.message).not.toContain("secret");
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });
});

describe("actor derivation never trusts submitted identity", () => {
  it("returns null without a cookie header", async () => {
    const { getActor } = await import("@/lib/http");
    expect(await getActor(request("GET"))).toBeNull();
  });
});

describe("mail sink adapter selection (fail-closed production)", () => {
  it("rejects the sink adapter in production", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "https://campus.example");
    vi.stubEnv("MAIL_ADAPTER", "sink");
    vi.stubEnv("BETTER_AUTH_SECRET", "production-secret-0123456789abcdef0123");
    try {
      await expect(import("@/lib/env")).rejects.toThrow(/mail sink is not allowed in production/);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("requires an auth secret in production", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "https://campus.example");
    vi.stubEnv("MAIL_ADAPTER", "smtp");
    vi.stubEnv("SMTP_URL", "smtp://localhost:25");
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    try {
      // Fails closed: an empty/short secret is rejected either by schema
      // validation or by the production guard.
      await expect(import("@/lib/env")).rejects.toThrow(/BETTER_AUTH_SECRET/);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
