"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizeRole, type AppRole } from "@/lib/auth/roles";

interface RoleContextValue {
  role: AppRole;
  loading: boolean;
  employeeId: string | null;
  profileName: string | null;
  refresh: () => Promise<void>;
}

const RoleContext = createContext<RoleContextValue>({
  role: "worker",
  loading: true,
  employeeId: null,
  profileName: null,
  refresh: async () => {},
});

interface MyProfile {
  id?: string;
  role?: string;
  full_name?: string | null;
  email?: string | null;
}

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<AppRole>("worker");
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const bootedRef = useRef(false);

  const refresh = useCallback(async () => {
    const isInitial = !bootedRef.current;
    if (isInitial) setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setRole("worker");
      setEmployeeId(null);
      setProfileName(null);
      bootedRef.current = true;
      setLoading(false);
      return;
    }

    let profile: MyProfile | null = null;

    const { data: rpcProfile } = await supabase.rpc("get_my_profile");
    if (rpcProfile && typeof rpcProfile === "object") {
      profile = rpcProfile as MyProfile;
    }

    if (!profile?.role) {
      const { data: row } = await supabase
        .from("profiles")
        .select("id, role, full_name, email")
        .eq("id", user.id)
        .maybeSingle();
      profile = row ?? null;
    }

    setRole(normalizeRole(profile?.role));
    setProfileName(
      profile?.full_name?.trim()
        || profile?.email?.split("@")[0]
        || user.email?.split("@")[0]
        || null,
    );

    const { data: employee } = await supabase
      .from("employees")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    setEmployeeId(employee?.id ?? null);
    bootedRef.current = true;
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [refresh]);

  return (
    <RoleContext.Provider value={{ role, loading, employeeId, profileName, refresh }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
