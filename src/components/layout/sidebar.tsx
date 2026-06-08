"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  LayoutDashboard, ShoppingCart, Users, Package, Landmark,
  UserCog, CreditCard, FileText, BarChart3, FolderOpen,
  Bell, Settings, ChevronDown, ChevronRight, Bike, Car,
  Wrench, Puzzle, UserCheck, Calendar, ClipboardList,
  DollarSign, Receipt, Hash, Wallet, LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppLogo } from "@/components/branding/app-logo";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Sales", icon: ShoppingCart,
    children: [
      { label: "New Sale", href: "/sales/new", icon: ShoppingCart },
      { label: "Sales History", href: "/sales", icon: Receipt },
      { label: "Invoices", href: "/sales/invoices", icon: FileText },
    ],
  },
  {
    label: "Customers", icon: Users,
    children: [
      { label: "All Customers", href: "/customers", icon: Users },
      { label: "CR & Plates", href: "/cr-plates", icon: Hash },
    ],
  },
  {
    label: "Inventory", icon: Package,
    children: [
      { label: "TVS Bikes", href: "/inventory/bikes", icon: Bike },
      { label: "Used Bikes", href: "/used-bikes", icon: Car },
      { label: "Spare Parts", href: "/spare-parts", icon: Wrench },
      { label: "Accessories", href: "/accessories", icon: Puzzle },
    ],
  },
  { label: "Finance", href: "/finance", icon: Landmark },
  {
    label: "HR", icon: UserCog,
    children: [
      { label: "Employees", href: "/hr/employees", icon: UserCheck },
      { label: "Attendance", href: "/hr/attendance", icon: Calendar },
      { label: "Leave", href: "/hr/leave", icon: ClipboardList },
      { label: "Payroll", href: "/hr/payroll", icon: DollarSign },
      { label: "Payslips", href: "/hr/payslips", icon: Receipt },
    ],
  },
  {
    label: "Cheques", icon: CreditCard,
    children: [
      { label: "TVS Cheques", href: "/cheques/tvs", icon: CreditCard },
      { label: "Other Cheques", href: "/cheques/other", icon: Wallet },
    ],
  },
  { label: "Expenses", href: "/expenses", icon: Wallet },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Documents", href: "/documents", icon: FolderOpen },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Settings", href: "/settings", icon: Settings },
];

const NAV_GROUPS = [
  { label: "MAIN", items: navigation.slice(0, 4) },
  { label: "FINANCE", items: navigation.slice(4, 7) },
  { label: "OPERATIONS", items: navigation.slice(7, 11) },
  { label: "SYSTEM", items: navigation.slice(11) },
];

function NavItemComponent({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() => {
    if (!item.children) return false;
    return item.children.some(c => c.href && pathname.startsWith(c.href));
  });

  const isActive = item.href
    ? item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href)
    : false;

  const hasChildren = !!item.children?.length;

  if (hasChildren) {
    const isGroupActive = item.children!.some(c => c.href && pathname.startsWith(c.href));
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className={cn(
            "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors duration-150 group",
            isGroupActive ? "text-white bg-white/10" : "text-[#888] hover:text-white hover:bg-white/6"
          )}
        >
          <item.icon className={cn("h-4 w-4 flex-shrink-0 transition-colors", isGroupActive ? "text-[#FF4C00]" : "text-[#555] group-hover:text-[#888]")} />
          <span className="flex-1 text-left">{item.label}</span>
          {open
            ? <ChevronDown className="h-3 w-3 text-[#444]" />
            : <ChevronRight className="h-3 w-3 text-[#444]" />}
        </button>
        {open && (
          <div className="mt-0.5 ml-[11px] pl-3 border-l border-white/8 space-y-0.5">
            {item.children!.map(child => <NavItemComponent key={child.label} item={child} depth={depth + 1} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors duration-150 group",
        isActive ? "text-white bg-white/10" : "text-[#888] hover:text-white hover:bg-white/6"
      )}
    >
      <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-[#FF4C00]" : "text-[#555] group-hover:text-[#888]")} />
      <span className="flex-1">{item.label}</span>
      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#FF4C00] flex-shrink-0" />}
    </Link>
  );
}

export function Sidebar() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.push("/login");
  }

  return (
    <aside className="w-[220px] flex-shrink-0 h-screen flex flex-col bg-[#0C0C0C] border-r border-white/6">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-white/6 flex-shrink-0">
        <AppLogo variant="sidebar" />
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4
        [&::-webkit-scrollbar]:w-0">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-[9px] font-bold text-[#3A3A3A] uppercase tracking-widest px-2.5 mb-1">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(item => <NavItemComponent key={item.label} item={item} />)}
            </div>
          </div>
        ))}
      </div>

      {/* User */}
      <div className="flex-shrink-0 border-t border-white/6 p-2">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/5 cursor-pointer group">
          <div className="w-7 h-7 rounded-full bg-[#FF4C00]/15 border border-[#FF4C00]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-[#FF4C00]">AD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-white truncate leading-tight">Admin</p>
            <p className="text-[10px] text-[#444] truncate">ridermo.lk</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1 rounded-md hover:bg-white/10 text-[#444] hover:text-[#FF4C00] transition-colors"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
