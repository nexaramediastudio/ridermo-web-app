"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRole } from "@/components/providers/role-provider";
import { canAccessRoute } from "@/lib/auth/roles";

export function RoleGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, loading } = useRole();

  useEffect(() => {
    if (loading) return;
    if (!canAccessRoute(role, pathname)) {
      router.replace("/dashboard");
    }
  }, [loading, role, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#FF4C00] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!canAccessRoute(role, pathname)) return null;

  return <>{children}</>;
}
