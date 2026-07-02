"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  Bell, ChevronDown, LogOut, Search, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { AppLogo } from "@/components/branding/app-logo";
import { useRole } from "@/components/providers/role-provider";
import { getNavForRole, type NavItem } from "@/lib/auth/nav-by-role";
import { roleLabel } from "@/lib/auth/roles";

function isGroupActive(item: NavItem, pathname: string) {
  if (item.href) return item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
  return item.children?.some(c => pathname.startsWith(c.href)) ?? false;
}

function Dropdown({ item, onClose }: { item: NavItem; onClose: () => void }) {
  const pathname = usePathname();
  if (!item.children) return null;
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-52 bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden py-1.5" style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.12)", zIndex: 9999 }}>
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
  const { role, profileName, loading } = useRole();
  const nav = getNavForRole(role);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const initials = (profileName || "U")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "global" });
    toast.success("Signed out");
    router.replace("/login");
  }

  return (
    <header className="h-14 bg-white border-b border-[#EBEBEB] flex items-center px-6 flex-shrink-0 sticky top-0" style={{ zIndex: 1000 }}>
      <AppLogo variant="nav" href="/dashboard" className="w-36" />

      <nav className="flex-1 flex items-center justify-center gap-0.5">
        {!loading && nav.map(item => <NavButton key={item.label} item={item} />)}
      </nav>

      <div className="flex items-center gap-2 flex-shrink-0 justify-end">
        {!loading && (
          <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-wide text-[#9A9A9A] px-2 py-1 rounded-lg bg-[#F5F5F5]">
            {roleLabel(role)}
          </span>
        )}

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

        <Link
          href="/notifications"
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5] text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors relative"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#FF4C00]" />
        </Link>

        <div className="w-px h-5 bg-[#EBEBEB]" />

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#FF4C00] flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">{initials}</span>
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
