"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Plus, Search, X, Pencil, AlertTriangle, ShoppingBag,
  ToggleLeft, ToggleRight, TrendingUp, Package,
} from "lucide-react";

type AccCategory =
  | "helmet" | "gloves" | "jacket" | "riding_gear" | "locks"
  | "covers" | "lights" | "mirrors" | "bags" | "other";

interface Accessory {
  id: string;
  sku?: string;
  name: string;
  brand?: string;
  category: AccCategory;
  size?: string;
  color?: string;
  quantity: number;
  reorder_level: number;
  cost_price: number;
  selling_price: number;
  is_active: boolean;
}

const CAT_LABEL: Record<AccCategory, string> = {
  helmet: "Helmet", gloves: "Gloves", jacket: "Jacket", riding_gear: "Riding Gear",
  locks: "Locks", covers: "Covers", lights: "Lights", mirrors: "Mirrors",
  bags: "Bags / Luggage", other: "Other",
};
const CAT_COLOR: Record<AccCategory, string> = {
  helmet: "bg-red-50 text-red-700", gloves: "bg-blue-50 text-blue-700",
  jacket: "bg-purple-50 text-purple-700", riding_gear: "bg-orange-50 text-orange-700",
  locks: "bg-slate-100 text-slate-700", covers: "bg-teal-50 text-teal-700",
  lights: "bg-amber-50 text-amber-700", mirrors: "bg-pink-50 text-pink-700",
  bags: "bg-emerald-50 text-emerald-700", other: "bg-gray-100 text-gray-700",
};
const CAT_EMOJI: Record<AccCategory, string> = {
  helmet: "🪖", gloves: "🧤", jacket: "🧥", riding_gear: "👕",
  locks: "🔒", covers: "🛡️", lights: "💡", mirrors: "🪞",
  bags: "🎒", other: "📦",
};

const EMPTY: Partial<Accessory> = {
  sku: "", name: "", brand: "", category: "other",
  size: "", color: "", quantity: 0, reorder_level: 3,
  cost_price: 0, selling_price: 0, is_active: true,
};

export default function AccessoriesPage() {
  const [items, setItems] = useState<Accessory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<"all" | AccCategory>("all");
  const [lowStock, setLowStock] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Accessory | null>(null);
  const [form, setForm] = useState<Partial<Accessory>>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await createClient().from("accessories").select("*").order("name");
    setItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (a: Accessory) => { setEditing(a); setForm({ ...a }); setShowModal(true); };

  const save = async () => {
    if (!form.name?.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      sku: form.sku || null,
      name: form.name,
      brand: form.brand || null,
      category: form.category || "other",
      size: form.size || null,
      color: form.color || null,
      quantity: form.quantity || 0,
      reorder_level: form.reorder_level || 3,
      cost_price: form.cost_price || 0,
      selling_price: form.selling_price || 0,
      is_active: form.is_active !== false,
    };
    if (editing) {
      const { error } = await supabase.from("accessories").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Accessory updated");
    } else {
      const { error } = await supabase.from("accessories").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Accessory added");
    }
    setSaving(false);
    setShowModal(false);
    load();
  };

  const toggleActive = async (a: Accessory) => {
    const { error } = await createClient().from("accessories").update({ is_active: !a.is_active }).eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${a.is_active ? "Deactivated" : "Activated"}`);
    load();
  };

  const filtered = items.filter(a => {
    const s = search.toLowerCase();
    const matchSearch = !s || a.name.toLowerCase().includes(s) || (a.brand || "").toLowerCase().includes(s) || (a.sku || "").toLowerCase().includes(s);
    const matchCat = catFilter === "all" || a.category === catFilter;
    const matchLow = !lowStock || a.quantity <= a.reorder_level;
    return matchSearch && matchCat && matchLow;
  });

  const totalItems = items.length;
  const lowStockCount = items.filter(a => a.is_active && a.quantity <= a.reorder_level).length;
  const totalValue = items.reduce((s, a) => s + a.cost_price * a.quantity, 0);

  // Category cards
  const catStats = (Object.keys(CAT_LABEL) as AccCategory[]).map(cat => ({
    cat,
    count: items.filter(a => a.category === cat).length,
    inStock: items.filter(a => a.category === cat && a.quantity > 0).length,
  })).filter(c => c.count > 0);

  const F = (k: keyof Accessory, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Accessories</h2>
          <p className="text-sm text-[#9A9A9A] mt-0.5">Helmets, jackets, locks, covers and more</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 h-9 px-4 rounded-xl bg-[#FF4C00] text-white text-sm font-semibold hover:bg-[#E04400] transition-colors">
          <Plus className="h-4 w-4" /> Add Item
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Items", value: totalItems, icon: ShoppingBag, accent: false },
          { label: "Low / Out of Stock", value: lowStockCount, icon: AlertTriangle, accent: lowStockCount > 0 },
          { label: "Stock Value", value: `Rs. ${totalValue.toLocaleString("en", { maximumFractionDigits: 0 })}`, icon: TrendingUp, accent: false },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className={`bg-white rounded-2xl border p-4 ${accent ? "border-amber-200" : "border-[#EFEFEF]"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">{label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? "bg-amber-100" : "bg-[#F5F5F5]"}`}>
                <Icon className={`h-4 w-4 ${accent ? "text-amber-600" : "text-[#9A9A9A]"}`} />
              </div>
            </div>
            <p className={`text-xl font-bold ${accent ? "text-amber-600" : "text-[#0A0A0A]"}`} style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Category quick overview */}
      {catStats.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {catStats.map(({ cat, count, inStock }) => (
            <button key={cat} onClick={() => setCatFilter(catFilter === cat ? "all" : cat)}
              className={`flex items-center gap-2 h-8 px-3 rounded-xl text-xs font-semibold border transition-all ${catFilter === cat ? "border-[#FF4C00]/40 bg-[#FF4C00]/5 text-[#FF4C00]" : "border-[#EFEFEF] bg-white text-[#6B6B6B] hover:bg-[#F5F5F5]"}`}>
              <span>{CAT_EMOJI[cat]}</span>
              {CAT_LABEL[cat]}
              <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${catFilter === cat ? "bg-[#FF4C00]/10 text-[#FF4C00]" : "bg-[#F5F5F5] text-[#9A9A9A]"}`}>{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9A9A9A]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accessories…"
            className="w-full h-9 pl-9 pr-4 text-sm border border-[#EFEFEF] rounded-xl bg-white focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
        </div>
        <button onClick={() => setLowStock(p => !p)} className={`flex items-center gap-2 h-9 px-3 rounded-xl text-xs font-semibold border transition-colors ${lowStock ? "border-amber-400 bg-amber-50 text-amber-700" : "border-[#EFEFEF] bg-white text-[#6B6B6B] hover:bg-[#F5F5F5]"}`}>
          <AlertTriangle className="h-3.5 w-3.5" /> Low Stock
        </button>
      </div>

      {/* Grid or table depending on view */}
      {filtered.length === 0 && !loading ? (
        <div className="bg-white rounded-2xl border border-[#EFEFEF] flex flex-col items-center justify-center py-16">
          <ShoppingBag className="h-8 w-8 text-[#DADADA] mb-3" />
          <p className="text-sm text-[#9A9A9A] font-medium">No accessories found</p>
          <p className="text-xs text-[#BFBFBF] mt-1">Add helmets, gloves, jackets and more</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#EFEFEF] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F0F0F0]">
                {["Item", "SKU", "Category", "Size / Color", "Stock", "Cost Price", "Selling Price", ""].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[#F8F8F8]">{Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-5 py-4"><div className="h-4 bg-[#F0F0F0] rounded animate-pulse" /></td>)}</tr>
              )) : filtered.map((a) => {
                const isLow = a.is_active && a.quantity <= a.reorder_level;
                return (
                  <tr key={a.id} className="border-b border-[#F8F8F8] hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{CAT_EMOJI[a.category]}</span>
                        <div>
                          <p className="text-sm font-bold text-[#0A0A0A]">{a.name}</p>
                          <p className="text-xs text-[#9A9A9A]">{a.brand || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3"><span className="text-xs font-mono text-[#6B6B6B]">{a.sku || "—"}</span></td>
                    <td className="px-5 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CAT_COLOR[a.category]}`}>{CAT_LABEL[a.category]}</span></td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-[#6B6B6B]">{[a.size, a.color].filter(Boolean).join(" / ") || "—"}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        {isLow && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
                        <span className={`text-sm font-bold ${isLow ? "text-amber-600" : "text-[#0A0A0A]"}`}>{a.quantity}</span>
                        <span className="text-xs text-[#9A9A9A]">/ min {a.reorder_level}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3"><span className="text-sm text-[#6B6B6B]">Rs. {a.cost_price.toLocaleString()}</span></td>
                    <td className="px-5 py-3"><span className="text-sm font-bold text-[#FF4C00]">Rs. {a.selling_price.toLocaleString()}</span></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEdit(a)} className="h-7 w-7 rounded-lg bg-[#F5F5F5] flex items-center justify-center hover:bg-[#EBEBEB]">
                          <Pencil className="h-3.5 w-3.5 text-[#6B6B6B]" />
                        </button>
                        <button onClick={() => toggleActive(a)} className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${a.is_active ? "bg-emerald-50 hover:bg-emerald-100" : "bg-[#F5F5F5] hover:bg-[#EBEBEB]"}`}>
                          {a.is_active ? <ToggleRight className="h-3.5 w-3.5 text-emerald-600" /> : <ToggleLeft className="h-3.5 w-3.5 text-[#9A9A9A]" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-[#EFEFEF] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F0F0]">
              <div>
                <h3 className="text-base font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{editing ? "Edit Accessory" : "Add Accessory"}</h3>
                <p className="text-xs text-[#9A9A9A] mt-0.5">Manage item details and stock</p>
              </div>
              <button onClick={() => setShowModal(false)} className="h-8 w-8 rounded-xl bg-[#F5F5F5] flex items-center justify-center hover:bg-[#EBEBEB]"><X className="h-4 w-4 text-[#6B6B6B]" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Name *</label>
                  <input value={form.name || ""} onChange={e => F("name", e.target.value)} placeholder="e.g. Full-Face Helmet" className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Brand</label>
                  <input value={form.brand || ""} onChange={e => F("brand", e.target.value)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Category</label>
                  <select value={form.category || "other"} onChange={e => F("category", e.target.value)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10 bg-white">
                    {(Object.keys(CAT_LABEL) as AccCategory[]).map(c => <option key={c} value={c}>{CAT_EMOJI[c]} {CAT_LABEL[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">SKU</label>
                  <input value={form.sku || ""} onChange={e => F("sku", e.target.value)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl font-mono focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Size</label>
                  <input value={form.size || ""} onChange={e => F("size", e.target.value)} placeholder="e.g. M, L, XL, 42" className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Color</label>
                  <input value={form.color || ""} onChange={e => F("color", e.target.value)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Quantity</label>
                  <input type="number" min="0" value={form.quantity || 0} onChange={e => F("quantity", parseInt(e.target.value) || 0)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Reorder Level</label>
                  <input type="number" min="0" value={form.reorder_level || 3} onChange={e => F("reorder_level", parseInt(e.target.value) || 0)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
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
                {saving ? "Saving…" : editing ? "Update Item" : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
