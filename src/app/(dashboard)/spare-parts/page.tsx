"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Plus, Search, X, Pencil, AlertTriangle, Package,
  Tag, TrendingUp, ToggleLeft, ToggleRight, Trash2, Settings2,
} from "lucide-react";

type PartCategory =
  | "engine" | "body" | "electrical" | "brakes" | "suspension"
  | "transmission" | "fuel_system" | "tyres" | "oil_filters" | "other";

interface SparePart {
  id: string;
  part_number?: string;
  name: string;
  brand: string;
  category: PartCategory;
  compatible_models?: string;
  quantity: number;
  reorder_level: number;
  cost_price: number;
  selling_price: number;
  location?: string;
  is_active: boolean;
}

const CAT_LABEL: Record<PartCategory, string> = {
  engine: "Engine", body: "Body", electrical: "Electrical", brakes: "Brakes",
  suspension: "Suspension", transmission: "Transmission", fuel_system: "Fuel System",
  tyres: "Tyres", oil_filters: "Oil / Filters", other: "Other",
};
const CAT_COLOR: Record<PartCategory, string> = {
  engine: "bg-red-50 text-red-700", body: "bg-blue-50 text-blue-700",
  electrical: "bg-amber-50 text-amber-700", brakes: "bg-purple-50 text-purple-700",
  suspension: "bg-emerald-50 text-emerald-700", transmission: "bg-pink-50 text-pink-700",
  fuel_system: "bg-orange-50 text-orange-700", tyres: "bg-slate-100 text-slate-700",
  oil_filters: "bg-yellow-50 text-yellow-700", other: "bg-gray-100 text-gray-700",
};

const EMPTY: Partial<SparePart> = {
  part_number: "", name: "", brand: "TVS", category: "other",
  compatible_models: "", quantity: 0, reorder_level: 5,
  cost_price: 0, selling_price: 0, location: "", is_active: true,
};

export default function SparePartsPage() {
  const [parts, setParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<"all" | PartCategory>("all");
  const [lowStock, setLowStock] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SparePart | null>(null);
  const [form, setForm] = useState<Partial<SparePart>>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await createClient().from("spare_parts").select("*").order("name");
    setParts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (p: SparePart) => { setEditing(p); setForm({ ...p }); setShowModal(true); };

  const save = async () => {
    if (!form.name?.trim()) { toast.error("Part name is required"); return; }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      part_number: form.part_number || null,
      name: form.name,
      brand: form.brand || "TVS",
      category: form.category || "other",
      compatible_models: form.compatible_models || null,
      quantity: form.quantity || 0,
      reorder_level: form.reorder_level || 5,
      cost_price: form.cost_price || 0,
      selling_price: form.selling_price || 0,
      location: form.location || null,
      is_active: form.is_active !== false,
    };
    if (editing) {
      const { error } = await supabase.from("spare_parts").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Part updated");
    } else {
      const { error } = await supabase.from("spare_parts").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Spare part added");
    }
    setSaving(false);
    setShowModal(false);
    load();
  };

  const deletePart = async (p: SparePart) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    const { error } = await createClient().from("spare_parts").delete().eq("id", p.id);
    if (error) toast.error(error.message);
    else { toast.success("Part deleted"); load(); }
  };

  const toggleActive = async (p: SparePart) => {
    const { error } = await createClient().from("spare_parts").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Part ${p.is_active ? "deactivated" : "activated"}`);
    load();
  };

  const filtered = parts.filter(p => {
    const s = search.toLowerCase();
    const matchSearch = !s || p.name.toLowerCase().includes(s) || (p.part_number || "").toLowerCase().includes(s) || (p.brand || "").toLowerCase().includes(s);
    const matchCat = catFilter === "all" || p.category === catFilter;
    const matchLow = !lowStock || p.quantity <= p.reorder_level;
    return matchSearch && matchCat && matchLow;
  });

  const totalParts = parts.length;
  const lowStockCount = parts.filter(p => p.is_active && p.quantity <= p.reorder_level).length;
  const totalValue = parts.reduce((s, p) => s + p.cost_price * p.quantity, 0);

  const F = (k: keyof SparePart, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Spare Parts</h2>
          <p className="text-sm text-[#9A9A9A] mt-0.5">Manage parts inventory with stock level tracking</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 h-9 px-4 rounded-xl bg-[#FF4C00] text-white text-sm font-semibold hover:bg-[#E04400] transition-colors">
          <Plus className="h-4 w-4" /> Add Part
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Parts", value: totalParts, icon: Settings2, accent: false },
          { label: "Low / Out of Stock", value: lowStockCount, icon: AlertTriangle, accent: lowStockCount > 0 },
          { label: "Stock Value", value: `Rs. ${totalValue.toLocaleString("en", { maximumFractionDigits: 0 })}`, icon: TrendingUp, accent: false },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className={`bg-white rounded-xl border px-4 py-3 flex items-center justify-between gap-3 hover:border-[#D0D0D0] transition-colors ${accent ? "border-amber-200" : "border-[#E8E8E8]"}`}>
            <div>
              <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-wide">{label}</p>
              <p className={`text-xl font-bold tabular-nums mt-0.5 ${accent ? "text-amber-600" : "text-[#0A0A0A]"}`}>{value}</p>
            </div>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accent ? "bg-amber-100" : "bg-[#F5F5F5]"}`}>
              <Icon className={`h-4 w-4 ${accent ? "text-amber-600" : "text-[#9A9A9A]"}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9A9A9A]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search parts…"
            className="w-full h-9 pl-9 pr-4 text-sm border border-[#EFEFEF] rounded-xl bg-white focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value as typeof catFilter)} className="h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl bg-white focus:outline-none focus:border-[#FF4C00]/40">
          <option value="all">All Categories</option>
          {(Object.keys(CAT_LABEL) as PartCategory[]).map(c => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
        </select>
        <button onClick={() => setLowStock(p => !p)} className={`flex items-center gap-2 h-9 px-3 rounded-xl text-xs font-semibold border transition-colors ${lowStock ? "border-amber-400 bg-amber-50 text-amber-700" : "border-[#EFEFEF] bg-white text-[#6B6B6B] hover:bg-[#F5F5F5]"}`}>
          <AlertTriangle className="h-3.5 w-3.5" /> Low Stock Only
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#EFEFEF] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#F0F0F0]">
              {["Part", "Part No.", "Category", "Compatible", "Stock", "Cost Price", "Selling Price", ""].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-[#F8F8F8]">{Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-5 py-4"><div className="h-4 bg-[#F0F0F0] rounded animate-pulse" /></td>)}</tr>
            )) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-5 py-16 text-center">
                <Package className="h-8 w-8 text-[#DADADA] mx-auto mb-2" />
                <p className="text-sm text-[#9A9A9A]">No spare parts found</p>
              </td></tr>
            ) : filtered.map((p) => {
              const isLow = p.is_active && p.quantity <= p.reorder_level;
              return (
                <tr key={p.id} className="border-b border-[#F8F8F8] hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-5 py-3">
                    <div>
                      <p className="text-sm font-bold text-[#0A0A0A]">{p.name}</p>
                      <p className="text-xs text-[#9A9A9A]">{p.brand}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3"><span className="text-xs font-mono text-[#6B6B6B]">{p.part_number || "—"}</span></td>
                  <td className="px-5 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CAT_COLOR[p.category]}`}>{CAT_LABEL[p.category]}</span></td>
                  <td className="px-5 py-3"><span className="text-xs text-[#9A9A9A] max-w-[120px] truncate block">{p.compatible_models || "—"}</span></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      {isLow && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
                      <span className={`text-sm font-bold ${isLow ? "text-amber-600" : "text-[#0A0A0A]"}`}>{p.quantity}</span>
                      <span className="text-xs text-[#9A9A9A]">/ min {p.reorder_level}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3"><span className="text-sm text-[#6B6B6B]">Rs. {p.cost_price.toLocaleString()}</span></td>
                  <td className="px-5 py-3"><span className="text-sm font-bold text-[#FF4C00]">Rs. {p.selling_price.toLocaleString()}</span></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEdit(p)} className="h-7 w-7 rounded-lg bg-[#F5F5F5] flex items-center justify-center hover:bg-[#EBEBEB]">
                        <Pencil className="h-3.5 w-3.5 text-[#6B6B6B]" />
                      </button>
                      <button onClick={() => toggleActive(p)} className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${p.is_active ? "bg-emerald-50 hover:bg-emerald-100" : "bg-[#F5F5F5] hover:bg-[#EBEBEB]"}`}>
                        {p.is_active ? <ToggleRight className="h-3.5 w-3.5 text-emerald-600" /> : <ToggleLeft className="h-3.5 w-3.5 text-[#9A9A9A]" />}
                      </button>
                      <button onClick={() => deletePart(p)} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-[#ABABAB] hover:text-red-500 transition-colors" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-[#EFEFEF] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F0F0]">
              <div>
                <h3 className="text-base font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{editing ? "Edit Spare Part" : "Add Spare Part"}</h3>
                <p className="text-xs text-[#9A9A9A] mt-0.5">Manage part details and stock levels</p>
              </div>
              <button onClick={() => setShowModal(false)} className="h-8 w-8 rounded-xl bg-[#F5F5F5] flex items-center justify-center hover:bg-[#EBEBEB]"><X className="h-4 w-4 text-[#6B6B6B]" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Part Name *</label>
                  <input value={form.name || ""} onChange={e => F("name", e.target.value)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Part Number</label>
                  <input value={form.part_number || ""} onChange={e => F("part_number", e.target.value)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl font-mono focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Brand</label>
                  <input value={form.brand || ""} onChange={e => F("brand", e.target.value)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Category</label>
                  <select value={form.category || "other"} onChange={e => F("category", e.target.value)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10 bg-white">
                    {(Object.keys(CAT_LABEL) as PartCategory[]).map(c => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Compatible Models</label>
                <input value={form.compatible_models || ""} onChange={e => F("compatible_models", e.target.value)} placeholder="e.g. Apache RTR 160, Apache RTR 200" className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Quantity</label>
                  <input type="number" min="0" value={form.quantity || 0} onChange={e => F("quantity", parseInt(e.target.value) || 0)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Reorder Level</label>
                  <input type="number" min="0" value={form.reorder_level || 5} onChange={e => F("reorder_level", parseInt(e.target.value) || 0)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Location</label>
                  <input value={form.location || ""} onChange={e => F("location", e.target.value)} placeholder="e.g. Shelf A3" className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Cost Price (Rs.)</label>
                  <input type="number" min="0" value={form.cost_price || 0} onChange={e => F("cost_price", parseFloat(e.target.value) || 0)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Selling Price (Rs.)</label>
                  <input type="number" min="0" value={form.selling_price || 0} onChange={e => F("selling_price", parseFloat(e.target.value) || 0)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#F0F0F0] flex items-center justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="h-9 px-4 rounded-xl border border-[#EFEFEF] text-sm text-[#6B6B6B] font-semibold hover:bg-[#F5F5F5]">Cancel</button>
              <button onClick={save} disabled={saving} className="h-9 px-5 rounded-xl bg-[#FF4C00] text-white text-sm font-semibold hover:bg-[#E04400] disabled:opacity-50">
                {saving ? "Saving…" : editing ? "Update Part" : "Add Part"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
