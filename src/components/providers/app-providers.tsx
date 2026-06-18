"use client";

import { CompanySettingsProvider } from "@/components/providers/company-settings-provider";
import { RoleProvider } from "@/components/providers/role-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <CompanySettingsProvider>{children}</CompanySettingsProvider>
    </RoleProvider>
  );
}
