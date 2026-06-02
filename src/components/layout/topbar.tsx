"use client";

import { Bell, Search } from "lucide-react";
import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/sales": "Sales History",
  "/sales/new": "New Sale",
  "/sales/invoices": "Invoices",
  "/customers": "Customers",
  "/inventory/bikes": "TVS Bikes",
  "/inventory/used": "Used Vehicles",
  "/inventory/parts": "Spare Parts",
  "/inventory/accessories": "Accessories",
  "/finance/companies": "Finance Companies",
  "/finance/insurance": "Insurance",
  "/finance/commissions": "TVS Commissions",
  "/hr/employees": "Employees",
  "/hr/attendance": "Attendance",
  "/hr/leave": "Leave Management",
  "/hr/payroll": "Payroll",
  "/hr/payslips": "Payslips",
  "/cheques/tvs": "TVS Cheques",
  "/cheques/other": "Other Cheques",
  "/cr-plates": "CR & Number Plates",
  "/expenses": "Expenses",
  "/reports": "Reports",
  "/documents": "Documents",
  "/notifications": "Notifications",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(path) && path !== "/") return title;
  }
  return "RIDERMO ERP";
}

export function Topbar() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="h-16 flex items-center px-6 border-b border-[#EFEFEF] bg-white flex-shrink-0">
      <div className="flex-1">
        <h1
          className="text-lg font-bold text-[#0A0A0A] leading-none"
          style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
        >
          {title}
        </h1>
        <p className="text-xs text-[#9A9A9A] mt-0.5">{dateStr}</p>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <button className="flex items-center gap-2 h-9 px-3 rounded-xl border border-[#EFEFEF] bg-[#FAFAFA] text-sm text-[#ABABAB] hover:border-[#E0E0E0] hover:bg-[#F5F5F5] transition-all min-w-[180px]">
          <Search className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="text-xs">Search anything...</span>
          <span className="ml-auto text-[10px] text-[#CCCCCC] font-medium bg-white border border-[#E5E5E5] rounded px-1 py-0.5">
            ⌘K
          </span>
        </button>

        {/* Notifications */}
        <button className="relative h-9 w-9 flex items-center justify-center rounded-xl border border-[#EFEFEF] hover:bg-[#F5F5F5] transition-all">
          <Bell className="h-4 w-4 text-[#6B6B6B]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FF4C00] rounded-full" />
        </button>
      </div>
    </header>
  );
}
