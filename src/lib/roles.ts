export type MemberRole = "viewer" | "agent" | "admin" | "owner";

const ROLE_RANK: Record<MemberRole, number> = {
  viewer: 0,
  agent: 1,
  admin: 2,
  owner: 3,
};

/** Pure role comparison. Unknown roles are denied everything. */
export function roleAtLeast(role: string, min: MemberRole): boolean {
  return (ROLE_RANK[role as MemberRole] ?? -1) >= ROLE_RANK[min];
}

export const PERMISSION_ERROR =
  "Your role doesn't allow this action. Ask a workspace admin.";
