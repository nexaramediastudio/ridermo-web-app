"use client";

import { TopNav } from "@/components/layout/topnav";
import { RoleGate } from "@/components/auth/role-gate";

export function DashboardLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
      <TopNav />
      <main className="flex-1 p-6 w-full max-w-[1700px] mx-auto">
        <RoleGate>{children}</RoleGate>
      </main>
    </div>
  );
}
