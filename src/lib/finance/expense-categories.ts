export type ExpenseCategory =
  | "rent"
  | "utilities"
  | "salary"
  | "broker_commission"
  | "bonus"
  | "petty_cash"
  | "ridermo_payment"
  | "transport"
  | "fuel"
  | "operating_cost"
  | "internet_services"
  | "maintenance_repairs"
  | "office_supplies"
  | "other";

export const EXPENSE_CATEGORY_CONFIG: Record<
  ExpenseCategory,
  { label: string; badge: string; color: string }
> = {
  rent:                 { label: "Rent",                    badge: "r-badge-purple", color: "bg-purple-50 text-purple-700" },
  utilities:            { label: "Utilities",               badge: "r-badge-blue",   color: "bg-blue-50 text-blue-700" },
  salary:               { label: "Salary",                  badge: "r-badge-green",  color: "bg-emerald-50 text-emerald-700" },
  broker_commission:    { label: "Broker Commission",       badge: "r-badge-orange", color: "bg-orange-50 text-orange-700" },
  bonus:                { label: "Bonus",                   badge: "r-badge-amber",  color: "bg-amber-50 text-amber-700" },
  petty_cash:           { label: "Petty Cash",              badge: "r-badge-gray",   color: "bg-gray-100 text-gray-700" },
  ridermo_payment:      { label: "Ridermo Payment",         badge: "r-badge-orange", color: "bg-[#FF4C00]/10 text-[#FF4C00]" },
  transport:            { label: "Transport",               badge: "r-badge-blue",   color: "bg-sky-50 text-sky-700" },
  fuel:                 { label: "Fuel",                    badge: "r-badge-amber",  color: "bg-amber-50 text-amber-800" },
  operating_cost:       { label: "Operating Cost",          badge: "r-badge-gray",   color: "bg-slate-100 text-slate-700" },
  internet_services:    { label: "Internet Services",       badge: "r-badge-blue",   color: "bg-indigo-50 text-indigo-700" },
  maintenance_repairs:  { label: "Maintenance & Repairs",   badge: "r-badge-orange", color: "bg-orange-50 text-orange-800" },
  office_supplies:      { label: "Office Supplies",         badge: "r-badge-purple", color: "bg-violet-50 text-violet-700" },
  other:                { label: "Other",                   badge: "r-badge-gray",   color: "bg-slate-50 text-slate-700" },
};

export function expenseCategoryLabel(category: string): string {
  return EXPENSE_CATEGORY_CONFIG[category as ExpenseCategory]?.label ?? category.replace(/_/g, " ");
}

export function expenseCategoryColor(category: string): string {
  return EXPENSE_CATEGORY_CONFIG[category as ExpenseCategory]?.color ?? "bg-gray-100 text-gray-700";
}
