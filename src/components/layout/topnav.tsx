"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard, ShoppingCart, Package, Users, UserCog,
  Landmark, BarChart3, Settings, Bell, ChevronDown,
  Bike, Car, Wrench, Puzzle, Receipt, FileText,
  UserCheck, Calendar, ClipboardList, DollarSign,
  CreditCard, Hash, Wallet, LogOut, FolderOpen, Search, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface NavChild { label: string; href: string; icon: React.ElementType; }
interface NavItem  { label: string; href?: string; icon: React.ElementType; children?: NavChild[]; }

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Inventory", icon: Package, children: [
    { label: "TVS Bikes",    href: "/inventory/bikes", icon: Bike },
    { label: "Used Bikes",   href: "/used-bikes",      icon: Car },
    { label: "Spare Parts",  href: "/spare-parts",     icon: Wrench },
    { label: "Accessories",  href: "/accessories",     icon: Puzzle },
  ]},
  { label: "Sales", icon: ShoppingCart, children: [
    { label: "New Sale",      href: "/sales/new",      icon: ShoppingCart },
    { label: "Sales History", href: "/sales",          icon: Receipt },
    { label: "Invoices",      href: "/sales/invoices", icon: FileText },
  ]},
  { label: "Customers", href: "/customers", icon: Users },
  { label: "HR", icon: UserCog, children: [
    { label: "Employees", href: "/hr/employees", icon: UserCheck },
    { label: "Attendance", href: "/hr/attendance", icon: Calendar },
    { label: "Leave",      href: "/hr/leave",      icon: ClipboardList },
    { label: "Payroll",    href: "/hr/payroll",    icon: DollarSign },
    { label: "Payslips",   href: "/hr/payslips",   icon: Receipt },
  ]},
  { label: "Finance", icon: Landmark, children: [
    { label: "Overview",       href: "/finance",       icon: Landmark },
    { label: "TVS Cheques",    href: "/cheques/tvs",   icon: CreditCard },
    { label: "Other Cheques",  href: "/cheques/other", icon: Wallet },
    { label: "CR & Plates",    href: "/cr-plates",     icon: Hash },
    { label: "Expenses",       href: "/expenses",      icon: Wallet },
  ]},
  { label: "Reports",   href: "/reports",   icon: BarChart3 },
  { label: "Documents", href: "/documents", icon: FolderOpen },
  { label: "Settings",  href: "/settings",  icon: Settings },
];

function isGroupActive(item: NavItem, pathname: string) {
  if (item.href) return item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
  return item.children?.some(c => pathname.startsWith(c.href)) ?? false;
}

function Dropdown({ item, onClose }: { item: NavItem; onClose: () => void }) {
  const pathname = usePathname();
  if (!item.children) return null;
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-[#EBEBEB] overflow-hidden z-50 py-1.5">
      {item.children.map((child) => {
        const active = pathname.startsWith(child.href);
        return (
          <Link
            key={child.href}
            href={child.href}
            onClick={onClose}
            className={`flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors ${active ? "bg-[#FF4C00]/6 text-[#FF4C00] font-semibold" : "text-[#3A3A3A] hover:bg-[#F5F5F5] font-medium"}`}
          >
            <child.icon className={`h-3.5 w-3.5 flex-shrink-0 ${active ? "text-[#FF4C00]" : "text-[#9A9A9A]"}`} />
            {child.label}
          </Link>
        );
      })}
    </div>
  );
}

function NavButton({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = isGroupActive(item, pathname);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (item.href) {
    return (
      <Link
        href={item.href}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-150 whitespace-nowrap ${
          active
            ? "bg-[#FF4C00]/8 text-[#FF4C00]"
            : "text-[#5A5A5A] hover:text-[#0A0A0A] hover:bg-[#F5F5F5]"
        }`}
      >
        <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
        {item.label}
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-150 whitespace-nowrap ${
          active || open
            ? "bg-[#FF4C00]/8 text-[#FF4C00]"
            : "text-[#5A5A5A] hover:text-[#0A0A0A] hover:bg-[#F5F5F5]"
        }`}
      >
        <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
        {item.label}
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <Dropdown item={item} onClose={() => setOpen(false)} />}
    </div>
  );
}

export function TopNav() {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.push("/login");
  }

  return (
    <header className="h-14 bg-white border-b border-[#EBEBEB] flex items-center px-5 gap-4 flex-shrink-0 sticky top-0 z-40">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0 mr-4">
        <div className="w-7 h-7 rounded-lg bg-[#FF4C00] flex items-center justify-center">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" fill="white" fillOpacity="0.9" />
            <path d="M12 2L3 7l9 5 9-5-9-5z" fill="white" />
          </svg>
        </div>
        <span className="text-[14px] font-extrabold tracking-tight text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
          RIDERMO
        </span>
      </Link>

      {/* Nav items */}
      <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden">
        {NAV.map(item => <NavButton key={item.label} item={item} />)}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Search */}
        {searchOpen ? (
          <div className="flex items-center gap-2 h-8 px-3 bg-[#F5F5F5] rounded-lg border border-[#E8E8E8]">
            <Search className="h-3.5 w-3.5 text-[#9A9A9A] flex-shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search…"
              className="bg-transparent text-sm outline-none w-40 text-[#0A0A0A] placeholder:text-[#ABABAB]"
            />
            <button onClick={() => { setSearchOpen(false); setQuery(""); }}>
              <X className="h-3.5 w-3.5 text-[#9A9A9A] hover:text-[#0A0A0A]" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5] text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
          >
            <Search className="h-4 w-4" />
          </button>
        )}

        {/* Notifications */}
        <Link
          href="/notifications"
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5] text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors relative"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#FF4C00]" />
        </Link>

        {/* Divider */}
        <div className="w-px h-5 bg-[#EBEBEB]" />

        {/* Avatar + sign out */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#FF4C00] flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">AD</span>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 h-7 px-2 rounded-lg text-[11px] font-semibold text-[#6B6B6B] hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
