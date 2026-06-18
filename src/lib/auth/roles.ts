export type AppRole = "admin" | "manager" | "worker" | "accountant";

export function normalizeRole(role: string | null | undefined): AppRole {
  const r = role?.trim().toLowerCase();
  if (r === "admin" || r === "manager" || r === "accountant") return r;
  if (r === "worker" || r === "employee") return "worker";
  return "worker";
}

export function hasFullAccess(role: AppRole): boolean {
  return role === "admin" || role === "manager";
}

const WORKER_PREFIXES = [
  "/dashboard",
  "/inventory",
  "/used-bikes",
  "/spare-parts",
  "/accessories",
  "/sales",
  "/customers",
  "/cr-plates",
  "/hr/attendance",
  "/worker",
  "/notifications",
];

const ACCOUNTANT_PREFIXES = [
  "/dashboard",
  "/finance",
  "/income",
  "/cheques",
  "/expenses",
  "/hr/employees",
  "/hr/payroll",
  "/hr/payslips",
  "/hr/leave",
  "/sales",
  "/reports",
  "/documents",
  "/notifications",
];

const WORKER_BLOCKED_PREFIXES = [
  "/finance",
  "/income",
  "/cheques",
  "/expenses",
  "/reports",
  "/documents",
  "/settings",
  "/hr/employees",
  "/hr/payroll",
  "/hr/payslips",
  "/hr/leave",
];

const ACCOUNTANT_BLOCKED_PREFIXES = [
  "/sales/new",
  "/inventory",
  "/used-bikes",
  "/spare-parts",
  "/accessories",
  "/customers",
  "/cr-plates",
  "/hr/attendance",
  "/worker",
  "/settings",
];

export function canAccessRoute(role: AppRole, pathname: string): boolean {
  if (hasFullAccess(role)) return true;
  if (pathname === "/") return true;

  const blocked = role === "accountant" ? ACCOUNTANT_BLOCKED_PREFIXES : WORKER_BLOCKED_PREFIXES;
  if (blocked.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return false;

  const prefixes = role === "accountant" ? ACCOUNTANT_PREFIXES : WORKER_PREFIXES;
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function roleLabel(role: AppRole): string {
  switch (role) {
    case "admin": return "Admin";
    case "manager": return "Manager";
    case "accountant": return "Accountant";
    default: return "Worker";
  }
}
