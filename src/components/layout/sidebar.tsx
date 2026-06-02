"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Landmark,
  UserCog,
  CreditCard,
  FileText,
  BarChart3,
  FolderOpen,
  Bell,
  Settings,
  ChevronDown,
  ChevronRight,
  Bike,
  Car,
  Wrench,
  Puzzle,
  Building2,
  Shield,
  TrendingUp,
  UserCheck,
  Calendar,
  ClipboardList,
  DollarSign,
  Receipt,
  FileCheck,
  Hash,
  Wallet,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Sales",
    icon: ShoppingCart,
    children: [
      { label: "New Sale", href: "/sales/new", icon: ShoppingCart },
      { label: "Sales History", href: "/sales", icon: Receipt },
      { label: "Invoices", href: "/sales/invoices", icon: FileText },
    ],
  },
  {
    label: "Customers",
    href: "/customers",
    icon: Users,
  },
  {
    label: "Inventory",
    icon: Package,
    children: [
      { label: "TVS Bikes", href: "/inventory/bikes", icon: Bike },
      { label: "Used Bikes", href: "/used-bikes", icon: Car },
      { label: "Spare Parts", href: "/spare-parts", icon: Wrench },
      { label: "Accessories", href: "/accessories", icon: Puzzle },
    ],
  },
  {
    label: "Finance",
    href: "/finance",
    icon: Landmark,
  },
  {
    label: "HR",
    icon: UserCog,
    children: [
      { label: "Employees", href: "/hr/employees", icon: UserCheck },
      { label: "Attendance", href: "/hr/attendance", icon: Calendar },
      { label: "Leave", href: "/hr/leave", icon: ClipboardList },
      { label: "Payroll", href: "/hr/payroll", icon: DollarSign },
      { label: "Payslips", href: "/hr/payslips", icon: Receipt },
    ],
  },
  {
    label: "Cheques",
    icon: CreditCard,
    children: [
      { label: "TVS Cheques", href: "/cheques/tvs", icon: CreditCard },
      { label: "Other Cheques", href: "/cheques/other", icon: Wallet },
    ],
  },
  {
    label: "CR & Number Plates",
    href: "/cr-plates",
    icon: Hash,
  },
  {
    label: "Expenses",
    href: "/expenses",
    icon: Wallet,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
  },
  {
    label: "Documents",
    href: "/documents",
    icon: FolderOpen,
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

function NavItemComponent({
  item,
  depth = 0,
}: {
  item: NavItem;
  depth?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() => {
    if (!item.children) return false;
    return item.children.some(
      (child) => child.href && pathname.startsWith(child.href)
    );
  });

  const isActive = item.href
    ? item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href)
    : false;

  const hasChildren = item.children && item.children.length > 0;

  if (hasChildren) {
    const isGroupActive = item.children!.some(
      (child) => child.href && pathname.startsWith(child.href)
    );

    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
            isGroupActive
              ? "text-[#FF4C00] bg-[#FF4C00]/8"
              : "text-[#4A4A4A] hover:text-[#0A0A0A] hover:bg-[#F5F5F5]"
          )}
        >
          <item.icon
            className={cn(
              "h-4 w-4 flex-shrink-0",
              isGroupActive ? "text-[#FF4C00]" : "text-[#9A9A9A] group-hover:text-[#4A4A4A]"
            )}
          />
          <span className="flex-1 text-left">{item.label}</span>
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-[#ABABAB]" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-[#ABABAB]" />
          )}
        </button>
        {open && (
          <div className="ml-4 mt-0.5 space-y-0.5 pl-3 border-l border-[#F0F0F0]">
            {item.children!.map((child) => (
              <NavItemComponent key={child.label} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
        isActive
          ? "text-[#FF4C00] bg-[#FF4C00]/8"
          : "text-[#4A4A4A] hover:text-[#0A0A0A] hover:bg-[#F5F5F5]"
      )}
    >
      <item.icon
        className={cn(
          "h-4 w-4 flex-shrink-0",
          isActive ? "text-[#FF4C00]" : "text-[#9A9A9A] group-hover:text-[#4A4A4A]"
        )}
      />
      <span>{item.label}</span>
      {isActive && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FF4C00]" />
      )}
    </Link>
  );
}

export function Sidebar() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    router.push("/login");
  }

  return (
    <aside className="w-64 flex-shrink-0 h-screen flex flex-col bg-white border-r border-[#EFEFEF]">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-[#EFEFEF] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#FF4C00] flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" fill="white" fillOpacity="0.9" />
              <path d="M12 2L3 7l9 5 9-5-9-5z" fill="white" />
            </svg>
          </div>
          <div>
            <span
              className="text-base font-bold tracking-tight text-[#0A0A0A] leading-none"
              style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
            >
              RIDERMO
            </span>
            <p className="text-[10px] text-[#9A9A9A] leading-tight font-medium uppercase tracking-wider mt-0.5">
              Dealership ERP
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navigation.map((item) => (
          <NavItemComponent key={item.label} item={item} />
        ))}
      </div>

      {/* Bottom: User & Sign Out */}
      <div className="flex-shrink-0 border-t border-[#EFEFEF] p-3">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#F5F5F5] cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-[#FF4C00]/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-[#FF4C00]">AD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#0A0A0A] truncate">Admin</p>
            <p className="text-xs text-[#9A9A9A] truncate">ridermo.lk</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-lg hover:bg-[#FFE8E0] text-[#ABABAB] hover:text-[#FF4C00] transition-colors"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
