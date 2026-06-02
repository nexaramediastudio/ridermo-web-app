"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Building2, Shield, Users, Settings2, Bike,
  Plus, X, Edit2, Check, Save,
  Phone, Mail, MapPin, Globe, Key,
  Zap, Fuel, ChevronDown, ChevronUp, Palette,
} from "lucide-react";

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
  const [form, setForm] = useState({
    name: "RIDERMO",
    tagline: "Premium TVS Dealership",
    phone: "",
    email: "",
    address: "",
    city: "",
    website: "",
    reg_number: "",
    tax_number: "",
  });
  const [saving, setSaving] = useState(false);

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      toast.success("Company settings saved");
      setSaving(false);
    }, 800);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-base font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Company Information</h3>
        <p className="text-sm text-[#9A9A9A] mt-0.5">This information appears on invoices and documents</p>
      </div>

      {/* Logo placeholder */}
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-2xl bg-[#FF4C00]/10 border-2 border-dashed border-[#FF4C00]/30 flex flex-col items-center justify-center cursor-pointer hover:bg-[#FF4C00]/15 transition-all">
          <div className="w-10 h-10 rounded-xl bg-[#FF4C00] flex items-center justify-center mb-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" fill="white" fillOpacity="0.9"/>
              <path d="M12 2L3 7l9 5 9-5-9-5z" fill="white"/>
            </svg>
          </div>
          <span className="text-[10px] text-[#FF4C00] font-semibold">Logo</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#0A0A0A]">Company Logo</p>
          <p className="text-xs text-[#9A9A9A] mt-0.5">PNG or SVG, recommended 200×200px</p>
          <button className="mt-2 text-xs text-[#FF4C00] font-semibold hover:underline">Upload logo</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <label className="text-sm font-medium text-[#1A1A1A]">Company Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] font-semibold" />
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

  useEffect(() => {
    const supabase = createClient();
    supabase.from("profiles").select("id, full_name, email, role").order("role").then(({ data }) => {
      setProfiles(data || []);
      setLoading(false);
    });
  }, []);

  async function updateRole(id: string, role: string) {
    const supabase = createClient();
    await supabase.from("profiles").update({ role }).eq("id", id);
    setProfiles((prev) => prev.map((p) => p.id === id ? { ...p, role } : p));
    toast.success("Role updated");
  }

  const ROLE_STYLES: Record<string, string> = {
    admin: "bg-[#FF4C00]/10 text-[#FF4C00]",
    manager: "bg-blue-50 text-blue-700",
    employee: "bg-[#F5F5F5] text-[#6B6B6B]",
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h3 className="text-base font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>System Users</h3>
        <p className="text-sm text-[#9A9A9A] mt-0.5">Manage access levels for each user</p>
      </div>

      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-14 bg-[#F5F5F5] rounded-xl animate-pulse" />)
        ) : profiles.length === 0 ? (
          <div className="text-center py-8 text-[#ABABAB]">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No users yet. Create a user in Supabase Auth first.</p>
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
                value={profile.role}
                onChange={(e) => updateRole(profile.id, e.target.value)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border-0 cursor-pointer focus:outline-none ${ROLE_STYLES[profile.role] || "bg-[#F5F5F5] text-[#6B6B6B]"}`}
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="employee">Employee</option>
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("company");

  return (
    <div className="space-y-5 max-w-[1000px]">
      <div>
        <h2 className="text-xl font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Settings</h2>
        <p className="text-sm text-[#9A9A9A] mt-0.5">Configure RIDERMO ERP</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-52 flex-shrink-0">
          <nav className="space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? "bg-[#FF4C00]/8 text-[#FF4C00]" : "text-[#4A4A4A] hover:bg-[#F5F5F5]"}`}
              >
                <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? "text-[#FF4C00]" : "text-[#9A9A9A]"}`} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-2xl border border-[#EFEFEF] p-6">
          {activeTab === "company" && <CompanySettings />}
          {activeTab === "bikes" && <BikeModelsSettings />}
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
