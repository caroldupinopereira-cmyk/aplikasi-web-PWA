export const ROLES = ["Administrator", "Pimpinan", "Staf", "Viewer"] as const;
export type StaffRole = (typeof ROLES)[number];

export type Capability =
  | "read"
  | "writeOperational"
  | "approve"
  | "manageFinance"
  | "deletePermanent"
  | "manageAccounts";

export const ROLE_CAPABILITIES: Record<StaffRole, Capability[]> = {
  Administrator: [
    "read", "writeOperational", "approve", "manageFinance",
    "deletePermanent", "manageAccounts",
  ],
  Pimpinan: ["read", "writeOperational", "approve", "manageFinance"],
  Staf: ["read", "writeOperational"],
  Viewer: ["read"],
};

export function roleHasCapability(
  role: string | null | undefined,
  capability: Capability,
) {
  return (
    ROLES.includes(role as StaffRole) &&
    ROLE_CAPABILITIES[role as StaffRole].includes(capability)
  );
}

export const rolesWith = (capability: Capability): StaffRole[] =>
  ROLES.filter((role) => roleHasCapability(role, capability));
