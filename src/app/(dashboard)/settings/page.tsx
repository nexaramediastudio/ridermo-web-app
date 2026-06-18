"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Building2, Shield, Users, Settings2, Bike,
  Plus, X, Edit2, Check, Save, Trash2, Search,
  Phone, Mail, MapPin, Globe, Key,
  Zap, Fuel, ChevronDown, ChevronUp, Palette, Upload, ImageIcon,
} from "lucide-react";
import { useCompanySettings } from "@/components/providers/company-settings-provider";
import {
  saveCompanySettings,
  uploadCompanyLogo,
  removeCompanyLogo,
  type CompanySettings as CompanySettingsData,
} from "@/lib/company-settings";

type Tab = "company" | "bikes" | "finance" | "insurance" | "users" | "security";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "company", label: "Company", icon: Building2 },
  { id: "bikes", label: "Bike Models", icon: Bike },
  { id: "finance", label: "Finance Companies", icon: Building2 },
  { id: "insurance", label: "Insurance Companies", icon: Shield },
  { id: "users", label: "Users", icon: Users },
  { id: "security", label: "Security", icon: Settings2 },
];

// ─── Company Settings ─────────────────────────────────────────────────────────
function CompanySettings() {
  const { settings, setSettings, refresh } = useCompanySettings();
  const [form, setForm] = useState({
    company_name: settings.company_name,
    tagline: settings.tagline || "",
    phone: settings.phone || "",
    email: settings.email || "",
    address: settings.address || "",
    city: settings.city || "",
    website: settings.website || "",
    reg_number: settings.reg_number || "",
    tax_number: settings.tax_number || "",
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(settings.logo_url);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setForm({
      company_name: settings.company_name,
      tagline: settings.tagline || "",
      phone: settings.phone || "",
      email: settings.email || "",
      address: settings.address || "",
      city: settings.city || "",
      website: settings.website || "",
      reg_number: settings.reg_number || "",
      tax_number: settings.tax_number || "",
    });
    setLogoUrl(settings.logo_url);
  }, [settings]);

  async function handleSave() {
    setSaving(true);
    const payload: Omit<CompanySettingsData, "id" | "updated_at"> = {
      company_name: form.company_name.trim() || "RIDERMO",
      tagline: form.tagline.trim() || null,
      logo_url: logoUrl,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      website: form.website.trim() || null,
      reg_number: form.reg_number.trim() || null,
      tax_number: form.tax_number.trim() || null,
    };
    const { error } = await saveCompanySettings(payload);
    if (error) toast.error(error);
    else {
      toast.success("Company settings saved");
      setSettings({ id: "default", ...payload });
      await refresh();
    }
    setSaving(false);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { url, error } = await uploadCompanyLogo(file);
    if (error || !url) {
      toast.error(error || "Upload failed");
      setUploading(false);
      e.target.value = "";
      return;
    }
    setLogoUrl(url);
    const payload: Omit<CompanySettingsData, "id" | "updated_at"> = {
      company_name: form.company_name.trim() || "RIDERMO",
      tagline: form.tagline.trim() || null,
      logo_url: url,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      website: form.website.trim() || null,
      reg_number: form.reg_number.trim() || null,
      tax_number: form.tax_number.trim() || null,
    };
    const { error: saveError } = await saveCompanySettings(payload);
    if (saveError) toast.error(saveError);
    else {
      toast.success("Logo uploaded");
      setSettings({ id: "default", ...payload });
      await refresh();
    }
    setUploading(false);
    e.target.value = "";
  }

  async function handleRemoveLogo() {
    if (!window.confirm("Remove the custom logo and use the default?")) return;
    setUploading(true);
    const { error } = await removeCompanyLogo(logoUrl);
    if (error) toast.error(error);
    else {
      setLogoUrl(null);
      toast.success("Logo removed");
      await refresh();
    }
    setUploading(false);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-base font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Company Information</h3>
        <p className="text-sm text-[#9A9A9A] mt-0.5">This information appears on invoices, the login page, and the app header</p>
      </div>

      <div className="flex items-start gap-4">
        <label
          htmlFor="company-logo-upload"
          className="w-24 h-24 rounded-2xl bg-[#F5F7FA] border-2 border-dashed border-[#E8E8E8] flex items-center justify-center cursor-pointer hover:border-[#FF4C00]/40 hover:bg-[#FF4C00]/5 transition-all overflow-hidden flex-shrink-0"
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Company logo" className="w-full h-full object-contain p-2" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-[#ABABAB]">
              <ImageIcon className="h-6 w-6" />
              <span className="text-[10px] font-semibold">No logo</span>
            </div>
          )}
        </label>
        <input
          id="company-logo-upload"
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleLogoUpload}
          disabled={uploading}
        />
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[#0A0A0A]">App Logo</p>
          <p className="text-xs text-[#9A9A9A] leading-relaxed">
            Upload your logo for the top navigation, login screen, and sidebar.
            PNG, JPG, WebP, or SVG — max 2MB. Recommended 200×200px or wider for wordmarks.
          </p>
          <div className="flex items-center gap-2">
            <label
              htmlFor="company-logo-upload"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#FF4C00]/10 text-[#FF4C00] text-xs font-semibold cursor-pointer hover:bg-[#FF4C00]/15 transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Uploading..." : "Upload logo"}
            </label>
            {logoUrl && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                disabled={uploading}
                className="h-8 px-3 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <label className="text-sm font-medium text-[#1A1A1A]">Company Name</label>
          <input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] font-semibold" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <label className="text-sm font-medium text-[#1A1A1A]">Tagline</label>
          <input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="e.g. Premium TVS Dealership" className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]" />
        </div>
        {[
          { key: "phone", label: "Phone", icon: Phone, placeholder: "0XX XXX XXXX" },
          { key: "email", label: "Email", icon: Mail, placeholder: "info@ridermo.lk" },
          { key: "website", label: "Website", icon: Globe, placeholder: "www.ridermo.lk" },
          { key: "reg_number", label: "Business Reg. No.", icon: Building2, placeholder: "BRN-XXXXXXXX" },
        ].map(({ key, label, icon: Icon, placeholder }) => (
          <div key={key} className="space-y-1.5">
            <label className="text-sm font-medium text-[#1A1A1A]">{label}</label>
            <div className="relative">
              <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
              <input
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]"
              />
            </div>
          </div>
        ))}
        <div className="col-span-2 space-y-1.5">
          <label className="text-sm font-medium text-[#1A1A1A]">Address</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-3.5 w-3.5 text-[#ABABAB]" />
            <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" rows={2} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] resize-none" />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 h-10 px-5 bg-[#FF4C00] hover:bg-[#E64400] text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60"
      >
        <Save className="h-4 w-4" />
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}

// ─── Company List (shared for Finance & Insurance) ─────────────────────────────
function CompanyList({ tableName, title, subtitle }: { tableName: "finance_companies" | "insurance_companies"; title: string; subtitle: string }) {
  const [companies, setCompanies] = useState<{ id: string; name: string; commission_rate: number; phone?: string; email?: string; is_active: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", commission_rate: "", phone: "", email: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", commission_rate: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from(tableName).select("*").order("name");
    setCompanies(data || []);
    setLoading(false);
  }, [tableName]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from(tableName).insert({ name: addForm.name, commission_rate: parseFloat(addForm.commission_rate) || 0, phone: addForm.phone || null, email: addForm.email || null });
    if (error) toast.error(error.message);
    else { toast.success("Company added"); setShowAdd(false); setAddForm({ name: "", commission_rate: "", phone: "", email: "" }); load(); }
    setSaving(false);
  }

  async function handleEdit(id: string) {
    const supabase = createClient();
    await supabase.from(tableName).update({ name: editForm.name, commission_rate: parseFloat(editForm.commission_rate) || 0, phone: editForm.phone || null, email: editForm.email || null }).eq("id", id);
    toast.success("Updated");
    setEditingId(null);
    load();
  }

  async function toggleActive(id: string, current: boolean) {
    const supabase = createClient();
    await supabase.from(tableName).update({ is_active: !current }).eq("id", id);
    load();
  }

  async function deleteCompany(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from(tableName).delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Company deleted"); load(); }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{title}</h3>
          <p className="text-sm text-[#9A9A9A] mt-0.5">{subtitle}</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 h-8 px-3 bg-[#FF4C00] hover:bg-[#E64400] text-white text-xs font-semibold rounded-xl">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="p-4 bg-[#FAFAFA] border border-[#EFEFEF] rounded-xl space-y-3">
          <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider">New Company</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-[#6B6B6B]">Company Name <span className="text-[#FF4C00]">*</span></label>
              <input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Company name" className="w-full h-9 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#6B6B6B]">Commission Rate (%)</label>
              <input type="number" value={addForm.commission_rate} onChange={(e) => setAddForm({ ...addForm, commission_rate: e.target.value })} placeholder="0.00" step="0.01" className="w-full h-9 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#6B6B6B]">Phone</label>
              <input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="Phone number" className="w-full h-9 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleAdd} disabled={!addForm.name || saving} className="flex items-center gap-1.5 h-8 px-3 bg-[#FF4C00] text-white text-xs font-semibold rounded-xl disabled:opacity-60">
              <Check className="h-3.5 w-3.5" /> Save
            </button>
            <button onClick={() => setShowAdd(false)} className="h-8 px-3 border border-[#E5E5E5] text-xs font-semibold text-[#6B6B6B] rounded-xl hover:bg-[#F5F5F5]">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-[#F5F5F5] rounded-xl animate-pulse" />)
        ) : companies.map((company) => {
          const isEditing = editingId === company.id;
          return (
            <div key={company.id} className={`bg-white border rounded-xl p-4 ${company.is_active ? "border-[#EFEFEF]" : "border-[#F5F5F5] opacity-60"}`}>
              {isEditing ? (
                <div className="grid grid-cols-3 gap-2 items-end">
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="col-span-2 h-9 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]" />
                  <div className="flex items-center gap-1">
                    <input type="number" value={editForm.commission_rate} onChange={(e) => setEditForm({ ...editForm, commission_rate: e.target.value })} className="w-16 h-9 px-2 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]" />
                    <span className="text-xs text-[#9A9A9A]">%</span>
                  </div>
                  <div className="col-span-3 flex items-center gap-2">
                    <button onClick={() => handleEdit(company.id)} className="flex items-center gap-1 h-7 px-2.5 bg-[#FF4C00] text-white text-xs font-semibold rounded-lg"><Check className="h-3 w-3" /> Save</button>
                    <button onClick={() => setEditingId(null)} className="h-7 px-2.5 border border-[#E5E5E5] text-xs text-[#6B6B6B] rounded-lg hover:bg-[#F5F5F5]">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#0A0A0A]">{company.name}</p>
                    <p className="text-xs text-[#9A9A9A]">Commission: <span className="font-semibold text-[#FF4C00]">{company.commission_rate}%</span>{company.phone && ` · ${company.phone}`}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { setEditingId(company.id); setEditForm({ name: company.name, commission_rate: company.commission_rate.toString(), phone: company.phone || "", email: company.email || "" }); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5] text-[#9A9A9A] hover:text-[#FF4C00] transition-all"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => toggleActive(company.id, company.is_active)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg ${company.is_active ? "bg-[#F5F5F5] text-[#6B6B6B] hover:bg-red-50 hover:text-red-600" : "bg-emerald-50 text-emerald-700"} transition-all`}
                    >
                      {company.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => deleteCompany(company.id, company.name)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-500 text-[#ABABAB] transition-all"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Users ─────────────────────────────────────────────────────────────────────
function UsersSettings() {
  const [profiles, setProfiles] = useState<{ id: string; full_name?: string; email?: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncInfo, setSyncInfo] = useState<{ auth_users: number; profiles: number; in_sync: boolean } | null>(null);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const supabase = createClient();

    await supabase.rpc("sync_missing_profiles");

    const [usersRes, statusRes] = await Promise.all([
      supabase.rpc("list_system_users"),
      supabase.rpc("get_user_sync_status"),
    ]);

    if (usersRes.error) {
      // Fallback if migration_020 not applied yet
      const { data: fallback, error: fbErr } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .order("full_name");

      if (fbErr || !fallback?.length) {
        setLoadError(usersRes.error.message);
        setProfiles([]);
      } else {
        setProfiles(fallback);
        setLoadError(
          "Run migration_020_user_sync_diagnostics.sql and migration_021_force_auth_profile_sync.sql in Supabase to show all Auth users.",
        );
      }
    } else {
      const rows = (usersRes.data as { id: string; full_name?: string; email?: string; role: string }[]) || [];
      setProfiles(rows);
      setLoadError(null);
    }

    if (statusRes.data && typeof statusRes.data === "object") {
      const s = statusRes.data as { auth_users: number; profiles: number; in_sync: boolean };
      setSyncInfo({ auth_users: s.auth_users, profiles: s.profiles, in_sync: s.in_sync });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  async function updateRole(id: string, role: string) {
    const supabase = createClient();
    const { error } = await supabase.rpc("update_user_role", { target_id: id, new_role: role });
    if (error) {
      toast.error(error.message);
      return;
    }
    setProfiles((prev) => prev.map((p) => p.id === id ? { ...p, role } : p));
    toast.success("Role updated");
  }

  const ROLE_STYLES: Record<string, string> = {
    admin: "bg-[#FF4C00]/10 text-[#FF4C00]",
    manager: "bg-blue-50 text-blue-700",
    worker: "bg-[#F5F5F5] text-[#6B6B6B]",
    employee: "bg-[#F5F5F5] text-[#6B6B6B]",
    accountant: "bg-emerald-50 text-emerald-700",
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h3 className="text-base font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>System Users</h3>
        <p className="text-sm text-[#9A9A9A] mt-0.5">
          {loading
            ? "Loading users…"
            : syncInfo
              ? `${profiles.length} shown · ${syncInfo.auth_users} login account${syncInfo.auth_users === 1 ? "" : "s"} in Supabase Auth`
              : `${profiles.length} user${profiles.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {!loading && syncInfo && syncInfo.auth_users <= 1 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900">
          <p className="font-semibold">Only 1 login account found in Supabase Auth</p>
          <p className="mt-1 text-amber-800">
            HR → Employees does not create logins. Add staff under{" "}
            <strong>Supabase → Authentication → Users → Add user</strong>, then click Retry below.
          </p>
        </div>
      )}

      {!loading && syncInfo && syncInfo.auth_users > 1 && profiles.length < syncInfo.auth_users && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900">
          <p className="font-semibold">
            {syncInfo.auth_users} Auth logins but only {profiles.length} showing
          </p>
          <p className="mt-1">
            Run <strong>migration_021_force_auth_profile_sync.sql</strong> in Supabase SQL Editor, then click Retry sync.
          </p>
          <button onClick={loadProfiles} className="mt-2 text-xs font-semibold text-[#FF4C00] hover:underline">
            Retry sync
          </button>
        </div>
      )}

      {!loading && loadError && profiles.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900">
          {loadError}
        </div>
      )}

      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-14 bg-[#F5F5F5] rounded-xl animate-pulse" />)
        ) : profiles.length === 0 ? (
          <div className="text-center py-8 text-[#ABABAB]">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            {loadError ? (
              <>
                <p className="text-sm text-red-500">{loadError}</p>
                <p className="text-xs mt-1">Run migration_020_user_sync_diagnostics.sql in Supabase, then refresh.</p>
                <button onClick={loadProfiles} className="mt-3 text-xs font-semibold text-[#FF4C00] hover:underline">
                  Retry sync
                </button>
              </>
            ) : (
              <p className="text-sm">No users yet. Create a user in Supabase Auth first.</p>
            )}
          </div>
        ) : (
          profiles.map((profile) => (
            <div key={profile.id} className="bg-white border border-[#EFEFEF] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#FF4C00]/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-[#FF4C00]">
                    {(profile.full_name || profile.email || "U").split("").slice(0, 2).join("").toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0A0A0A]">{profile.full_name || "No name"}</p>
                  <p className="text-xs text-[#9A9A9A]">{profile.email}</p>
                </div>
              </div>
              <select
                value={profile.role === "employee" ? "worker" : profile.role}
                onChange={(e) => updateRole(profile.id, e.target.value)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border-0 cursor-pointer focus:outline-none ${ROLE_STYLES[profile.role] || ROLE_STYLES[profile.role === "employee" ? "worker" : profile.role] || "bg-[#F5F5F5] text-[#6B6B6B]"}`}
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="worker">Worker (Showroom)</option>
                <option value="accountant">Accountant</option>
              </select>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Security ──────────────────────────────────────────────────────────────────
function SecuritySettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success("Password updated successfully"); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
    setSaving(false);
  }

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h3 className="text-base font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Security Settings</h3>
        <p className="text-sm text-[#9A9A9A] mt-0.5">Update your password</p>
      </div>

      <form onSubmit={handleChangePassword} className="space-y-4">
        {[
          { key: "new", label: "New Password", value: newPassword, set: setNewPassword },
          { key: "confirm", label: "Confirm New Password", value: confirmPassword, set: setConfirmPassword },
        ].map(({ key, label, value, set }) => (
          <div key={key} className="space-y-1.5">
            <label className="text-sm font-medium text-[#1A1A1A]">{label}</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
              <input type="password" value={value} onChange={(e) => set(e.target.value)} required minLength={8} placeholder="••••••••" className="w-full h-10 pl-9 pr-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]" />
            </div>
          </div>
        ))}
        <button type="submit" disabled={saving} className="flex items-center gap-2 h-10 px-5 bg-[#FF4C00] hover:bg-[#E64400] text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60">
          <Key className="h-4 w-4" />
          {saving ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}

// ─── Bike Models Settings ──────────────────────────────────────────────────────
interface BikeModelRow {
  id: string;
  name: string;
  bike_category: "scooter" | "motorbike" | "moped" | "3w";
  fuel_type: "petrol" | "electric" | "diesel";
  mrp: number;
  default_discount: number;
  selling_price: number;
  is_active: boolean;
  bike_colors?: { id: string; name: string; hex_code?: string }[];
}

const CATEGORY_OPTIONS = ["scooter", "motorbike", "moped", "3w"] as const;
const FUEL_OPTIONS = ["petrol", "electric", "diesel"] as const;
const CATEGORY_LABELS: Record<string, string> = { scooter: "Scooter", motorbike: "Motorbike", moped: "Moped", "3w": "3-Wheeler" };

function BikeModelsSettings() {
  const [models, setModels] = useState<BikeModelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<BikeModelRow>>({});
  const [addColorFor, setAddColorFor] = useState<string | null>(null);
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#FF4C00");
  const [addForm, setAddForm] = useState({
    name: "", bike_category: "scooter", fuel_type: "petrol",
    mrp: "", default_discount: "", selling_price: "",
  });
  const [savingAdd, setSavingAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("bike_models")
      .select("*, bike_colors(id, name, hex_code)")
      .order("name");
    setModels(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSavingAdd(true);
    const supabase = createClient();
    const { error } = await supabase.from("bike_models").insert({
      name: addForm.name.toUpperCase().trim(),
      bike_category: addForm.bike_category,
      tvs_category: "2W",
      fuel_type: addForm.fuel_type,
      mrp: parseFloat(addForm.mrp) || 0,
      default_discount: parseFloat(addForm.default_discount) || 0,
      selling_price: parseFloat(addForm.selling_price) || 0,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Bike model added");
      setShowAdd(false);
      setAddForm({ name: "", bike_category: "scooter", fuel_type: "petrol", mrp: "", default_discount: "", selling_price: "" });
      load();
    }
    setSavingAdd(false);
  }

  async function handleSaveEdit(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("bike_models").update({
      name: editForm.name?.toUpperCase().trim(),
      bike_category: editForm.bike_category,
      fuel_type: editForm.fuel_type,
      mrp: editForm.mrp || 0,
      default_discount: editForm.default_discount || 0,
      selling_price: editForm.selling_price || 0,
    }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Model updated"); setEditingId(null); load(); }
  }

  async function toggleActive(id: string, current: boolean) {
    const supabase = createClient();
    await supabase.from("bike_models").update({ is_active: !current }).eq("id", id);
    toast.success(current ? "Model deactivated" : "Model activated");
    load();
  }

  async function deleteModel(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("bike_models").delete().eq("id", id);
    if (error) toast.error("Cannot delete — bikes in inventory use this model");
    else { toast.success("Model deleted"); load(); }
  }

  async function addColor(modelId: string) {
    if (!newColorName.trim()) return;
    const supabase = createClient();
    const { error } = await supabase.from("bike_colors").insert({ model_id: modelId, name: newColorName.trim(), hex_code: newColorHex });
    if (error) toast.error(error.message);
    else { toast.success("Color added"); setAddColorFor(null); setNewColorName(""); setNewColorHex("#FF4C00"); load(); }
  }

  async function deleteColor(colorId: string) {
    const supabase = createClient();
    await supabase.from("bike_colors").delete().eq("id", colorId);
    toast.success("Color removed");
    load();
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Bike Models</h3>
          <p className="text-sm text-[#9A9A9A] mt-0.5">Add, edit or remove TVS models and their colors</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 h-8 px-3 bg-[#FF4C00] hover:bg-[#E64400] text-white text-xs font-semibold rounded-xl transition-all"
        >
          <Plus className="h-3.5 w-3.5" /> Add Model
        </button>
      </div>

      {/* Add new model form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="p-4 bg-[#FF4C00]/3 border border-[#FF4C00]/20 rounded-2xl space-y-3">
          <p className="text-xs font-bold text-[#FF4C00] uppercase tracking-wider">New Bike Model</p>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#6B6B6B]">Model Name <span className="text-[#FF4C00]">*</span></label>
            <input
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              required
              placeholder="e.g. TVS RAIDER 125"
              className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white uppercase font-semibold"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#6B6B6B]">Category</label>
              <select value={addForm.bike_category} onChange={(e) => setAddForm({ ...addForm, bike_category: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white">
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#6B6B6B]">Fuel Type</label>
              <select value={addForm.fuel_type} onChange={(e) => setAddForm({ ...addForm, fuel_type: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white">
                {FUEL_OPTIONS.map((f) => <option key={f} value={f} className="capitalize">{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#6B6B6B]">MRP (Rs.)</label>
              <input type="number" value={addForm.mrp} onChange={(e) => setAddForm({ ...addForm, mrp: e.target.value })} placeholder="0" className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#6B6B6B]">Discount (Rs.)</label>
              <input type="number" value={addForm.default_discount} onChange={(e) => setAddForm({ ...addForm, default_discount: e.target.value })} placeholder="0" className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#6B6B6B]">Selling Price (Rs.) <span className="text-[#FF4C00]">*</span></label>
              <input type="number" value={addForm.selling_price} onChange={(e) => setAddForm({ ...addForm, selling_price: e.target.value })} required placeholder="0" className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button type="submit" disabled={savingAdd} className="flex items-center gap-1.5 h-9 px-4 bg-[#FF4C00] hover:bg-[#E64400] text-white text-xs font-bold rounded-xl disabled:opacity-60">
              <Check className="h-3.5 w-3.5" /> {savingAdd ? "Saving..." : "Add Model"}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="h-9 px-4 border border-[#E5E5E5] text-xs font-semibold text-[#6B6B6B] rounded-xl hover:bg-[#F5F5F5]">Cancel</button>
          </div>
        </form>
      )}

      {/* Model list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-[#F5F5F5] rounded-xl animate-pulse" />)}
        </div>
      ) : models.length === 0 ? (
        <div className="text-center py-12 text-[#ABABAB]">
          <Bike className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">No bike models yet</p>
          <p className="text-xs mt-1">Add your first TVS model above</p>
        </div>
      ) : (
        <div className="space-y-2">
          {models.map((model) => {
            const isExpanded = expandedId === model.id;
            const isEditing = editingId === model.id;

            return (
              <div
                key={model.id}
                className={`bg-white border rounded-2xl overflow-hidden transition-all ${isExpanded ? "border-[#FF4C00]/30 shadow-[0_4px_20px_rgba(255,76,0,0.08)]" : "border-[#EFEFEF]"} ${!model.is_active ? "opacity-60" : ""}`}
              >
                {/* Model row */}
                {isEditing ? (
                  <div className="p-4 space-y-3 bg-[#FAFAFA]">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[#6B6B6B]">Model Name</label>
                      <input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] uppercase font-semibold" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[#6B6B6B]">Category</label>
                        <select value={editForm.bike_category || "scooter"} onChange={(e) => setEditForm({ ...editForm, bike_category: e.target.value as BikeModelRow["bike_category"] })} className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white">
                          {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[#6B6B6B]">Fuel Type</label>
                        <select value={editForm.fuel_type || "petrol"} onChange={(e) => setEditForm({ ...editForm, fuel_type: e.target.value as BikeModelRow["fuel_type"] })} className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white">
                          {FUEL_OPTIONS.map((f) => <option key={f} value={f} className="capitalize">{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { key: "mrp", label: "MRP (Rs.)" },
                        { key: "default_discount", label: "Discount (Rs.)" },
                        { key: "selling_price", label: "Selling (Rs.)" },
                      ].map(({ key, label }) => (
                        <div key={key} className="space-y-1.5">
                          <label className="text-xs font-medium text-[#6B6B6B]">{label}</label>
                          <input
                            type="number"
                            value={(editForm as Record<string, unknown>)[key]?.toString() || ""}
                            onChange={(e) => setEditForm({ ...editForm, [key]: parseFloat(e.target.value) || 0 })}
                            className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleSaveEdit(model.id)} className="flex items-center gap-1.5 h-8 px-3 bg-[#FF4C00] text-white text-xs font-bold rounded-xl"><Check className="h-3.5 w-3.5" /> Save</button>
                      <button onClick={() => setEditingId(null)} className="h-8 px-3 border border-[#E5E5E5] text-xs text-[#6B6B6B] rounded-xl hover:bg-[#F5F5F5]">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${model.is_active ? "bg-[#FF4C00]/10" : "bg-[#F5F5F5]"}`}>
                      <Bike className={`h-4.5 w-4.5 ${model.is_active ? "text-[#FF4C00]" : "text-[#ABABAB]"}`} />
                    </div>
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-[#0A0A0A]">{model.name}</p>
                        <span className="text-[10px] px-2 py-0.5 bg-[#F5F5F5] text-[#6B6B6B] rounded-full font-medium">{CATEGORY_LABELS[model.bike_category]}</span>
                        <span className={`flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${model.fuel_type === "electric" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {model.fuel_type === "electric" ? <Zap className="h-2.5 w-2.5" /> : <Fuel className="h-2.5 w-2.5" />}
                          {model.fuel_type.charAt(0).toUpperCase() + model.fuel_type.slice(1)}
                        </span>
                        {!model.is_active && <span className="text-[10px] px-2 py-0.5 bg-red-50 text-red-500 rounded-full font-medium">Inactive</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-[#9A9A9A]">Rs. <span className="font-bold text-[#FF4C00]">{model.selling_price.toLocaleString()}</span></span>
                        {model.default_discount > 0 && <span className="text-xs text-[#9A9A9A]">Disc: Rs. {model.default_discount.toLocaleString()}</span>}
                        <span className="text-xs text-[#9A9A9A]">{model.bike_colors?.length || 0} colors</span>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => { setEditingId(model.id); setEditForm({ name: model.name, bike_category: model.bike_category, fuel_type: model.fuel_type, mrp: model.mrp, default_discount: model.default_discount, selling_price: model.selling_price }); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5] text-[#9A9A9A] hover:text-[#FF4C00] transition-all"
                        title="Edit"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => toggleActive(model.id, model.is_active)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all ${model.is_active ? "bg-[#F5F5F5] text-[#6B6B6B] hover:bg-red-50 hover:text-red-600" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                      >
                        {model.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => deleteModel(model.id, model.name)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-[#ABABAB] hover:text-red-500 transition-all"
                        title="Delete"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : model.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5] text-[#ABABAB] transition-all"
                        title="Colors"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded: Colors */}
                {isExpanded && !isEditing && (
                  <div className="px-4 pb-4 border-t border-[#F5F5F5] pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider flex items-center gap-1"><Palette className="h-3 w-3" /> Colors</p>
                      <button onClick={() => setAddColorFor(addColorFor === model.id ? null : model.id)} className="text-xs text-[#FF4C00] font-semibold hover:underline flex items-center gap-1">
                        <Plus className="h-3 w-3" /> Add Color
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(model.bike_colors || []).length === 0 && addColorFor !== model.id ? (
                        <p className="text-xs text-[#ABABAB] italic">No colors yet</p>
                      ) : (
                        (model.bike_colors || []).map((color) => (
                          <div key={color.id} className="group flex items-center gap-1.5 px-2.5 py-1.5 bg-[#FAFAFA] border border-[#EFEFEF] rounded-xl text-xs">
                            <div className="w-3 h-3 rounded-full border border-[#E5E5E5]" style={{ backgroundColor: color.hex_code || "#888" }} />
                            <span className="text-[#4A4A4A] font-medium">{color.name}</span>
                            <button onClick={() => deleteColor(color.id)} className="opacity-0 group-hover:opacity-100 text-[#ABABAB] hover:text-red-500 transition-all ml-0.5">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    {addColorFor === model.id && (
                      <div className="flex items-center gap-2 mt-2">
                        <input type="color" value={newColorHex} onChange={(e) => setNewColorHex(e.target.value)} className="w-9 h-9 rounded-xl border border-[#E5E5E5] cursor-pointer p-0.5" />
                        <input
                          type="text"
                          value={newColorName}
                          onChange={(e) => setNewColorName(e.target.value)}
                          placeholder="Color name"
                          autoFocus
                          className="flex-1 h-9 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]"
                          onKeyDown={(e) => e.key === "Enter" && addColor(model.id)}
                        />
                        <button onClick={() => addColor(model.id)} className="w-9 h-9 bg-[#FF4C00] text-white rounded-xl flex items-center justify-center hover:bg-[#E64400]"><Check className="h-4 w-4" /></button>
                        <button onClick={() => setAddColorFor(null)} className="w-9 h-9 border border-[#E5E5E5] text-[#6B6B6B] rounded-xl flex items-center justify-center hover:bg-[#F5F5F5]"><X className="h-4 w-4" /></button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Inventory Bikes Manager ───────────────────────────────────────────────────
const INV_STATUS_LABELS: Record<string, string> = { available: "Available", sold: "Sold", reserved: "Reserved", service: "Service" };
const INV_STATUS_COLORS: Record<string, string> = {
  available: "bg-emerald-50 text-emerald-700",
  sold: "bg-[#F5F5F5] text-[#6B6B6B]",
  reserved: "bg-amber-50 text-amber-700",
  service: "bg-blue-50 text-blue-700",
};

type InvBike = { id: string; round_number: string; status: string; stock_date: string; bike_models: { name: string } | null };

function InventoryBikesSettings() {
  const [bikes, setBikes] = useState<InvBike[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("inventory_bikes")
      .select("id, round_number, status, stock_date, bike_models(name)")
      .order("stock_date", { ascending: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setBikes((data || []) as unknown as InvBike[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function deleteBike(id: string, roundNum: string) {
    if (!window.confirm(`Remove bike ${roundNum} from inventory? This cannot be undone.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("inventory_bikes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(`Bike ${roundNum} removed`); load(); }
  }

  const filtered = bikes.filter((b) => {
    const s = search.toLowerCase();
    return !s || b.round_number.toLowerCase().includes(s) || (b.bike_models?.name || "").toLowerCase().includes(s) || b.status.includes(s);
  });

  return (
    <div className="space-y-4 mt-8 pt-8 border-t border-[#F0F0F0]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
            Inventory Bikes
          </h3>
          <p className="text-sm text-[#9A9A9A] mt-0.5">View and remove bikes from inventory stock</p>
        </div>
        <span className="text-xs font-semibold text-[#ABABAB] bg-[#F5F5F5] px-3 py-1.5 rounded-lg">
          {bikes.length} total · {bikes.filter(b => b.status === "available").length} available
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by round number or model…"
          className="w-full h-9 pl-9 pr-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white"
        />
      </div>

      <div className="border border-[#F0F0F0] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#F0F0F0] bg-[#FAFAFA]">
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider">Round #</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider">Model</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider">Stock Date</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider">Status</th>
              <th className="px-4 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[#F5F5F5]">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-[#F0F0F0] rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-[#ABABAB]">
                  {search ? "No bikes match your search" : "No bikes in inventory"}
                </td>
              </tr>
            ) : (
              filtered.map((bike) => (
                <tr key={bike.id} className="border-b border-[#F5F5F5] last:border-0 hover:bg-[#FAFAFA] group transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#FF4C00] text-xs">{bike.round_number}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-[#0A0A0A]">{bike.bike_models?.name || "—"}</td>
                  <td className="px-4 py-3 text-xs text-[#6B6B6B]">
                    {new Date(bike.stock_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${INV_STATUS_COLORS[bike.status] || "bg-[#F5F5F5] text-[#6B6B6B]"}`}>
                      {INV_STATUS_LABELS[bike.status] || bike.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteBike(bike.id, bike.round_number)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 text-[#ABABAB] transition-all"
                      title="Remove bike"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("company");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#F5F5F5] flex items-center justify-center">
          <Settings2 className="h-5 w-5 text-[#6B6B6B]" />
        </div>
        <div>
          <h1 className="r-page-title">Settings</h1>
          <p className="r-page-sub">Configure RIDERMO ERP system</p>
        </div>
      </div>

      <div className="flex gap-5">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-[#FF4C00]/8 text-[#FF4C00]"
                    : "text-[#4A4A4A] hover:bg-[#F5F5F5] hover:text-[#0A0A0A]"
                }`}
              >
                <tab.icon className={`h-3.5 w-3.5 flex-shrink-0 ${activeTab === tab.id ? "text-[#FF4C00]" : "text-[#9A9A9A]"}`} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 r-card p-6">
          {activeTab === "company" && <CompanySettings />}
          {activeTab === "bikes" && (
            <>
              <BikeModelsSettings />
              <InventoryBikesSettings />
            </>
          )}
          {activeTab === "finance" && (
            <CompanyList
              tableName="finance_companies"
              title="Finance Companies"
              subtitle="Banks and finance institutions used for vehicle loans"
            />
          )}
          {activeTab === "insurance" && (
            <CompanyList
              tableName="insurance_companies"
              title="Insurance Companies"
              subtitle="Insurance providers and their commission rates"
            />
          )}
          {activeTab === "users" && <UsersSettings />}
          {activeTab === "security" && <SecuritySettings />}
        </div>
      </div>
    </div>
  );
}
