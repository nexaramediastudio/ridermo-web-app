"use client";

import { CompanySettingsProvider } from "@/components/providers/company-settings-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <CompanySettingsProvider>{children}</CompanySettingsProvider>;
}
