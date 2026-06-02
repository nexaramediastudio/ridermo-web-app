"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Plus, Search, X, ChevronDown, Bike, Tag, Gauge,
  Calendar, Pencil, CheckCircle2, AlertCircle, Clock,
  Package, TrendingUp, Trash2,
} from "lucide-react";

type Condition = "excellent" | "good" | "fair" | "poor";
type Status = "available" | "sold" | "reserved" | "not_for_sale";

interface UsedBike {
  id: string;
  make: string;
  model_name: string;
  year?: number;
  color?: string;
  registration_number?: string;
  chassis_number?: string;
  engine_number?: string;
  odometer: number;
  condition: Condition;
  purchase_price: number;
  selling_price: number;
  status: Status;
  purchase_date?: string;
  sold_date?: string;
  notes?: string;
}

const CONDITION_LABEL: Record<Condition, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};
const CONDITION_COLOR: Record<Condition, string> = {
  excellent: "bg-emerald-50 text-emerald-700",
  good: "bg-blue-50 text-blue-700",
  fair: "bg-amber-50 text-amber-700",
  poor: "bg-red-50 text-red-600",
};
const STATUS_COLOR: Record<Status, string> = {
  available: "bg-emerald-50 text-emerald-700",
  sold: "bg-[#F5F5F5] text-[#6B6B6B]",
  reserved: "bg-amber-50 text-amber-700",
  not_for_sale: "bg-purple-50 text-purple-700",
};

const EMPTY: Partial<UsedBike> = {
  make: "TVS", model_name: "", year: new Date().getFullYear(),
  color: "", registration_number: "", chassis_number: "", engine_number: "",
  odometer: 0, condition: "good", purchase_price: 0, selling_price: 0,
  status: "available", purchase_date: new Date().toISOString().split("T")[0], notes: "",
};

export default function UsedBikesPage() {
  const [bikes, setBikes] = useState<UsedBike[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<UsedBike | null>(null);
  const [form, setForm] = useState<Partial<UsedBike>>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await createClient().from("used_bikes").select("*").order("created_at", { ascending: false });
    setBikes(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (b: UsedBike) => { setEditing(b); setForm({ ...b }); setShowModal(true); };

  const save = async () => {
    if (!form.model_name?.trim()) { toast.error("Model name is required"); return; }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      make: form.make || "TVS",
      model_name: form.model_name,
      year: form.year || null,
      color: form.color || null,
      registration_number: form.registration_number || null,
      chassis_number: form.chassis_number || null,
      engine_number: form.engine_number || null,
      odometer: form.odometer || 0,
      condition: form.condition || "good",
      purchase_price: form.purchase_price || 0,
      selling_price: form.selling_price || 0,
      status: form.status || "available",
      purchase_date: form.purchase_date || null,
      notes: form.notes || null,
    };
    if (editing) {
      const { error } = await supabase.from("used_bikes").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Bike updated");
    } else {
      const { error } = await supabase.from("used_bikes").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Used bike added");
    }
    setSaving(false);
    setShowModal(false);
    load();
  };

  const deleteBike = async (b: UsedBike) => {
    if (!window.confirm(`Delete "${b.make} ${b.model_name}"?`)) return;
    const { error } = await createClient().from("used_bikes").delete().eq("id", b.id);
    if (error) toast.error(error.message);
    else { toast.success("Bike deleted"); load(); }
  };

  const markSold = async (id: string) => {
    const { error } = await createClient().from("used_bikes").update({ status: "sold", sold_date: new Date().toISOString().split("T")[0] }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Marked as sold");
    load();
  };

  const filtered = bikes.filter((b) => {
    const s = search.toLowerCase();
    const matchesSearch = !s || b.model_name.toLowerCase().includes(s) || (b.registration_number || "").toLowerCase().includes(s) || (b.chassis_number || "").toLowerCase().includes(s);
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const total = bikes.length;
  const available = bikes.filter(b => b.status === "available").length;
  const soldCount = bikes.filter(b => b.status === "sold").length;
  const totalRevenue = bikes.filter(b => b.status === "sold").reduce((s, b) => s + b.selling_price, 0);

  const F = (k: keyof UsedBike, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Used Bikes</h2>
          <p className="text-sm text-[#9A9A9A] mt-0.5">Buy, refurbish and sell second-hand bikes</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 h-9 px-4 rounded-xl bg-[#FF4C00] text-white text-sm font-semibold hover:bg-[#E04400] transition-colors">
          <Plus className="h-4 w-4" /> Add Used Bike
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Bikes", value: total, icon: Bike, accent: false },
          { label: "Available", value: available, icon: Package, accent: true },
          { label: "Sold", value: soldCount, icon: CheckCircle2, accent: false },
          { label: "Total Revenue", value: `Rs. ${totalRevenue.toLocaleString("en", { maximumFractionDigits: 0 })}`, icon: TrendingUp, accent: false },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#EFEFEF] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">{label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? "bg-[#FF4C00]/10" : "bg-[#F5F5F5]"}`}>
                <Icon className={`h-4 w-4 ${accent ? "text-[#FF4C00]" : "text-[#9A9A9A]"}`} />
              </div>
            </div>
            <p className="text-xl font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9A9A9A]" />
          <input
            value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by model, reg no, chassis…"
            className="w-full h-9 pl-9 pr-4 text-sm border border-[#EFEFEF] rounded-xl bg-white focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10"
          />
        </div>
        <div className="flex items-center gap-1 bg-[#F5F5F5] rounded-xl p-1">
          {(["all", "available", "reserved", "sold", "not_for_sale"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`h-7 px-3 rounded-lg text-xs font-semibold transition-all ${statusFilter === s ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#6B6B6B] hover:text-[#0A0A0A]"}`}>
              {s === "all" ? "All" : s === "not_for_sale" ? "Not for Sale" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#EFEFEF] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#F0F0F0]">
              {["Bike", "Year / Reg", "Odometer", "Condition", "Purchase Price", "Selling Price", "Status", ""].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-[#F8F8F8]">
                {Array.from({ length: 8 }).map((_, j) => (
                  <td key={j} className="px-5 py-4"><div className="h-4 bg-[#F0F0F0] rounded animate-pulse" /></td>
                ))}
              </tr>
            )) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-5 py-16 text-center">
                <Bike className="h-8 w-8 text-[#DADADA] mx-auto mb-2" />
                <p className="text-sm text-[#9A9A9A]">No used bikes found</p>
              </td></tr>
            ) : filtered.map((b) => (
              <tr key={b.id} className="border-b border-[#F8F8F8] hover:bg-[#FAFAFA] transition-colors">
                <td className="px-5 py-3">
                  <div>
                    <p className="text-sm font-bold text-[#0A0A0A]">{b.make} {b.model_name}</p>
                    <p className="text-xs text-[#9A9A9A]">{b.color || "—"}</p>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <p className="text-sm text-[#0A0A0A]">{b.year || "—"}</p>
                  <p className="text-xs text-[#9A9A9A] font-mono">{b.registration_number || "—"}</p>
                </td>
                <td className="px-5 py-3"><span className="text-sm text-[#0A0A0A]">{b.odometer.toLocaleString()} km</span></td>
                <td className="px-5 py-3"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CONDITION_COLOR[b.condition]}`}>{CONDITION_LABEL[b.condition]}</span></td>
                <td className="px-5 py-3"><span className="text-sm font-semibold text-[#0A0A0A]">Rs. {b.purchase_price.toLocaleString()}</span></td>
                <td className="px-5 py-3"><span className="text-sm font-bold text-[#FF4C00]">Rs. {b.selling_price.toLocaleString()}</span></td>
                <td className="px-5 py-3"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOR[b.status]}`}>{b.status === "not_for_sale" ? "Not for Sale" : b.status.charAt(0).toUpperCase() + b.status.slice(1)}</span></td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    {b.status === "available" && (
                      <button onClick={() => markSold(b.id)} className="h-7 px-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors">Sell</button>
                    )}
                    <button onClick={() => openEdit(b)} className="h-7 w-7 rounded-lg bg-[#F5F5F5] flex items-center justify-center hover:bg-[#EBEBEB] transition-colors">
                      <Pencil className="h-3.5 w-3.5 text-[#6B6B6B]" />
                    </button>
                    <button onClick={() => deleteBike(b)} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-[#ABABAB] hover:text-red-500 transition-colors" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-[#EFEFEF] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F0F0]">
              <div>
                <h3 className="text-base font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{editing ? "Edit Used Bike" : "Add Used Bike"}</h3>
                <p className="text-xs text-[#9A9A9A] mt-0.5">{editing ? "Update bike details" : "Record a second-hand bike for resale"}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="h-8 w-8 rounded-xl bg-[#F5F5F5] flex items-center justify-center hover:bg-[#EBEBEB]"><X className="h-4 w-4 text-[#6B6B6B]" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Make</label>
                  <input value={form.make || ""} onChange={e => F("make", e.target.value)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Model Name *</label>
                  <input value={form.model_name || ""} onChange={e => F("model_name", e.target.value)} placeholder="e.g. Apache RTR 160" className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Year</label>
                  <input type="number" value={form.year || ""} onChange={e => F("year", parseInt(e.target.value) || null)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Color</label>
                  <input value={form.color || ""} onChange={e => F("color", e.target.value)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Odometer (km)</label>
                  <input type="number" value={form.odometer || 0} onChange={e => F("odometer", parseInt(e.target.value) || 0)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Registration No.</label>
                  <input value={form.registration_number || ""} onChange={e => F("registration_number", e.target.value)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl font-mono text-sm focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Chassis No.</label>
                  <input value={form.chassis_number || ""} onChange={e => F("chassis_number", e.target.value)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl font-mono text-sm focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Engine No.</label>
                  <input value={form.engine_number || ""} onChange={e => F("engine_number", e.target.value)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl font-mono text-sm focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Condition</label>
                  <select value={form.condition || "good"} onChange={e => F("condition", e.target.value)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10 bg-white">
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Status</label>
                  <select value={form.status || "available"} onChange={e => F("status", e.target.value)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10 bg-white">
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                    <option value="sold">Sold</option>
                    <option value="not_for_sale">Not for Sale</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Purchase Price (Rs.)</label>
                  <input type="number" value={form.purchase_price || 0} onChange={e => F("purchase_price", parseFloat(e.target.value) || 0)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Selling Price (Rs.)</label>
                  <input type="number" value={form.selling_price || 0} onChange={e => F("selling_price", parseFloat(e.target.value) || 0)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Purchase Date</label>
                <input type="date" value={form.purchase_date || ""} onChange={e => F("purchase_date", e.target.value)} className="w-full h-9 px-3 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A5A5A] mb-1.5">Notes</label>
                <textarea value={form.notes || ""} onChange={e => F("notes", e.target.value)} rows={3} placeholder="Condition details, service history, etc." className="w-full px-3 py-2 text-sm border border-[#EFEFEF] rounded-xl focus:outline-none focus:border-[#FF4C00]/40 focus:ring-2 focus:ring-[#FF4C00]/10 resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#F0F0F0] flex items-center justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="h-9 px-4 rounded-xl border border-[#EFEFEF] text-sm text-[#6B6B6B] font-semibold hover:bg-[#F5F5F5]">Cancel</button>
              <button onClick={save} disabled={saving} className="h-9 px-5 rounded-xl bg-[#FF4C00] text-white text-sm font-semibold hover:bg-[#E04400] disabled:opacity-50">
                {saving ? "Saving…" : editing ? "Update Bike" : "Add Bike"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
