import { describe, expect, it } from "vitest";
import { isAdminUser, isHodProfessor, isTruthyFlag, isValidUserResponse } from "@/lib/auth";

describe("auth helpers", () => {
  it("accepts production-style truthy HOD flags", () => {
    expect(isTruthyFlag(true)).toBe(true);
    expect(isTruthyFlag("true")).toBe(true);
    expect(isTruthyFlag("1")).toBe(true);
    expect(isTruthyFlag(1)).toBe(true);
  });

  it("recognizes admins and HOD professors", () => {
    expect(isAdminUser({ role: "Admin" })).toBe(true);
    expect(isHodProfessor({ role: "PROFF", isHod: "true" })).toBe(true);
    expect(isHodProfessor({ role: "proff", isHod: false })).toBe(false);
  });

  it("rejects backend error responses as users", () => {
    expect(isValidUserResponse({ statusCode: 401, message: "Unauthorized" })).toBe(false);
    expect(isValidUserResponse({ role: "admin" })).toBe(true);
  });
});
