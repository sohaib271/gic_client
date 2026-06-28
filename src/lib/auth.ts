export const normalizeRole = (role?: string | null) => String(role ?? "").trim().toLowerCase();

export const isTruthyFlag = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return ["true", "1", "yes"].includes(value.trim().toLowerCase());
  return false;
};

export const isValidUserResponse = (user: any) =>
  !!user && !user.error && !(Number(user.statusCode) >= 400) && !!normalizeRole(user.role);

export const isAdminUser = (user: any) => normalizeRole(user?.role) === "admin";

export const isHodProfessor = (user: any) =>
  normalizeRole(user?.role) === "proff" && isTruthyFlag(user?.isHod);
