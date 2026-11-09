import { describe, expect, it } from "vitest";
import { isAdminUser, isHodProfessor, isPrincipalUser, isTruthyFlag, isValidUserResponse } from "@/lib/auth";

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

  it("recognizes principal users", () => {
    expect(isPrincipalUser({ role: "principal" })).toBe(true);
    expect(isPrincipalUser({ role: "PRINCIPAL" })).toBe(true);
    expect(isPrincipalUser({ role: "proff", isPrincipal: true })).toBe(true);
    expect(isPrincipalUser({ role: "proff", isPrincipal: "true" })).toBe(true);
    expect(isPrincipalUser({ role: "proff", isPrincipal: false })).toBe(false);
    expect(isPrincipalUser({ role: "admin" })).toBe(false);
  });

  it("rejects backend error responses as users", () => {
    expect(isValidUserResponse({ statusCode: 401, message: "Unauthorized" })).toBe(false);
    expect(isValidUserResponse({ role: "admin" })).toBe(true);
  });
});
