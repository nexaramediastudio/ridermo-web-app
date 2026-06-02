"use client";

import { Bell, Search, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const breadcrumbs: Record<string, { label: string; parent?: string; parentHref?: string }> = {
  "/dashboard": { label: "Dashboard" },
  "/sales/new": { label: "New Sale", parent: "Sales", parentHref: "/sales" },
  "/sales": { label: "Sales History", parent: "Sales" },
  "/sales/invoices": { label: "Invoices", parent: "Sales", parentHref: "/sales" },
  "/customers": { label: "Customers" },
  "/inventory/bikes": { label: "TVS Bikes", parent: "Inventory" },
  "/inventory/models": { label: "Models", parent: "Inventory" },
  "/used-bikes": { label: "Used Bikes", parent: "Inventory" },
  "/spare-parts": { label: "Spare Parts", parent: "Inventory" },
  "/accessories": { label: "Accessories", parent: "Inventory" },
  "/finance": { label: "Finance" },
  "/hr/employees": { label: "Employees", parent: "HR" },
  "/hr/attendance": { label: "Attendance", parent: "HR" },
  "/hr/leave": { label: "Leave", parent: "HR" },
  "/hr/payroll": { label: "Payroll", parent: "HR" },
  "/hr/payslips": { label: "Payslips", parent: "HR" },
  "/cheques/tvs": { label: "TVS Cheques", parent: "Cheques" },
  "/cheques/other": { label: "Other Cheques", parent: "Cheques" },
  "/cr-plates": { label: "CR & Number Plates" },
  "/expenses": { label: "Expenses" },
  "/reports": { label: "Reports" },
  "/documents": { label: "Documents" },
  "/notifications": { label: "Notifications" },
  "/settings": { label: "Settings" },
};

export function Topbar() {
  const pathname = usePathname();
  const info = breadcrumbs[pathname] || { label: "RIDERMO ERP" };

  return (
    <header className="h-14 flex items-center px-5 border-b border-[#EBEBEB] bg-white flex-shrink-0">
      {/* Breadcrumb */}
      <div className="flex-1 flex items-center gap-1.5">
        {info.parent && (
          <>
            <span className="text-sm text-[#ABABAB] font-medium">
              {info.parentHref
                ? <Link href={info.parentHref} className="hover:text-[#0A0A0A] transition-colors">{info.parent}</Link>
                : info.parent}
            </span>
            <ChevronRight className="h-3 w-3 text-[#D0D0D0]" />
          </>
        )}
        <span className="text-sm font-semibold text-[#0A0A0A]">{info.label}</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-2 h-8 px-3 rounded-lg border border-[#E8E8E8] bg-[#FAFAFA] text-xs text-[#ABABAB] hover:border-[#D5D5D5] hover:bg-[#F5F5F5] transition-all min-w-[160px]">
          <Search className="h-3 w-3 flex-shrink-0" />
          <span>Search...</span>
          <span className="ml-auto text-[10px] text-[#CCCCCC] bg-white border border-[#E8E8E8] rounded px-1 py-0.5 font-medium">⌘K</span>
        </button>
        <Link href="/notifications" className="relative h-8 w-8 flex items-center justify-center rounded-lg border border-[#E8E8E8] hover:bg-[#F5F5F5] transition-all">
          <Bell className="h-3.5 w-3.5 text-[#6B6B6B]" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#FF4C00] rounded-full" />
        </Link>
      </div>
    </header>
  );
}
