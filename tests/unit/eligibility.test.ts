import { describe, expect, it } from "vitest";
import { isEligibleCampusEmail } from "@/lib/env";

describe("campus email eligibility (FR-2, exact domain matching)", () => {
  it("accepts approved campus addresses", () => {
    expect(isEligibleCampusEmail("a.student@campus.example")).toBe(true);
  });

  it("normalizes case and surrounding whitespace", () => {
    expect(isEligibleCampusEmail("A.Student@CAMPUS.Example")).toBe(true);
    expect(isEligibleCampusEmail("  a.student@campus.example  ")).toBe(true);
  });

  it("rejects suffix lookalikes of approved domains", () => {
    expect(isEligibleCampusEmail("a@campus.example.attacker.example")).toBe(false);
    expect(isEligibleCampusEmail("a@notcampus.example")).toBe(false);
  });

  it("rejects subdomains of approved domains (exact match only)", () => {
    expect(isEligibleCampusEmail("a@mail.campus.example")).toBe(false);
  });

  it("rejects malformed addresses", () => {
    expect(isEligibleCampusEmail("no-at-sign")).toBe(false);
    expect(isEligibleCampusEmail("@campus.example")).toBe(false);
    expect(isEligibleCampusEmail("a@")).toBe(false);
    expect(isEligibleCampusEmail("a@@campus.example")).toBe(false);
    expect(isEligibleCampusEmail("")).toBe(false);
  });
});
