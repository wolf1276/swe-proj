import { describe, it, expect } from "vitest";
import { assessSearch } from "../../scripts/measurement";
import { assertTestDatabase } from "../../scripts/test-database";
describe("TC-B01-B03 search threshold classification", () => {
  it.each([[4990, true], [5000, true], [5010, false]])("%sms accepted=%s", (ms, expected) => {
    expect(assessSearch([{ ms, ok: true }]).allWithinFiveSeconds).toBe(expected);
  });
  it("does not pass no samples, failed requests, nonfinite or negative timing", () => {
    for (const samples of [[], [{ ms: 10, ok: false }], [{ ms: NaN, ok: true }], [{ ms: -1, ok: true }]]) expect(assessSearch(samples).allWithinFiveSeconds).toBe(false);
  });
});
describe("test database safeguards", () => {
  it("rejects remote, application and unapproved database names", () => {
    for (const url of ["postgresql://u:p@remote.example/campustrade_test", "postgresql://u:p@localhost/campustrade"]) expect(() => assertTestDatabase(url)).toThrow();
    expect(() => assertTestDatabase("postgresql://u:p@localhost/campustrade_test", "postgresql://u:p@localhost/campustrade_test?schema=public")).toThrow();
    expect(() => assertTestDatabase("postgresql://u:p@localhost/campustrade_test", "postgresql://u:p@127.0.0.1/campustrade_test")).toThrow();
  });
  it("allows a separate local synthetic test database", () => {
    expect(() => assertTestDatabase("postgresql://u:p@localhost/campustrade_test", "postgresql://u:p@localhost/campustrade")).not.toThrow();
  });
});
