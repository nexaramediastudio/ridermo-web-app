"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Hash } from "lucide-react";

const TABS = [
  { label: "All Customers", href: "/customers", icon: Users },
  { label: "CR & Plates", href: "/cr-plates", icon: Hash },
] as const;

export function CustomersSubnav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 bg-[#F5F5F5] rounded-xl p-1 w-fit">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-semibold transition-all ${
              active ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#6B6B6B] hover:text-[#0A0A0A]"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
