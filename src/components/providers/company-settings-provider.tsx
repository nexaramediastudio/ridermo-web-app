"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  DEFAULT_COMPANY_SETTINGS,
  fetchCompanySettings,
  type CompanySettings,
} from "@/lib/company-settings";

interface CompanySettingsContextValue {
  settings: CompanySettings;
  loading: boolean;
  refresh: () => Promise<void>;
  setSettings: (settings: CompanySettings) => void;
}

const CompanySettingsContext = createContext<CompanySettingsContextValue>({
  settings: DEFAULT_COMPANY_SETTINGS,
  loading: true,
  refresh: async () => {},
  setSettings: () => {},
});

export function CompanySettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await fetchCompanySettings();
    setSettings(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <CompanySettingsContext.Provider value={{ settings, loading, refresh, setSettings }}>
      {children}
    </CompanySettingsContext.Provider>
  );
}

export function useCompanySettings() {
  return useContext(CompanySettingsContext);
}
