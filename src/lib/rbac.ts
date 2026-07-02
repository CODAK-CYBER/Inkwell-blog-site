import { roles } from "@/lib/permissions";

type RoleName = keyof typeof roles;

type Statements = Parameters<(typeof roles)[RoleName]["authorize"]>[0];

/** Check a role against the RBAC table, e.g. hasPermission(role, { article: ["publish"] }) */
export function hasPermission(role: string | null | undefined, perms: Statements): boolean {
  if (!role) return false;
  const r = roles[role as RoleName];
  if (!r) return false;
  return r.authorize(perms).success;
}

export const canWrite = (role?: string | null) =>
  hasPermission(role, { article: ["create"] });

export const canPublish = (role?: string | null) =>
  hasPermission(role, { article: ["publish"] });

export const canModerate = (role?: string | null) =>
  hasPermission(role, { comment: ["moderate"] });

export const isAdminRole = (role?: string | null) =>
  role === "admin" || role === "superadmin";
