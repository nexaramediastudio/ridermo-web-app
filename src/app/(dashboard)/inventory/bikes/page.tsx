"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { InventoryBike } from "@/types";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Filter,
  Download,
  Bike,
  ChevronDown,
  MoreHorizontal,
  X,
  AlertCircle,
  PackagePlus,
} from "lucide-react";

const STATUS_STYLES = {
  in_stock: "bg-emerald-50 text-emerald-700 border-emerald-100",
  sold: "bg-gray-100 text-gray-600 border-gray-200",
  reserved: "bg-amber-50 text-amber-700 border-amber-100",
  transferred: "bg-blue-50 text-blue-700 border-blue-100",
};

const STATUS_LABELS = {
  in_stock: "In Stock",
  sold: "Sold",
  reserved: "Reserved",
  transferred: "Transferred",
};

type StatusFilter = "all" | "in_stock" | "sold" | "reserved" | "transferred";

export default function InventoryBikesPage() {
  const [bikes, setBikes] = useState<InventoryBike[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [models, setModels] = useState<{ id: string; name: string; selling_price: number; mrp: number; bike_category: string; fuel_type: string; bike_colors: { id: string; name: string; hex_code?: string }[] }[]>([]);

  const loadBikes = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("inventory_bikes")
      .select(`
        *,
        bike_models(id, name, bike_category, fuel_type, selling_price),
        bike_colors(id, name, hex_code)
      `)
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }
    if (searchQuery) {
      query = query.or(
        `round_number.ilike.%${searchQuery}%,chassis_number.ilike.%${searchQuery}%,engine_number.ilike.%${searchQuery}%`
      );
    }

    const { data, error } = await query;
    if (error) toast.error("Failed to load inventory");
    else setBikes(data || []);
    setLoading(false);
  }, [statusFilter, searchQuery]);

  const loadModels = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("bike_models")
      .select("id, name, selling_price, mrp, bike_category, fuel_type, bike_colors(id, name, hex_code)")
      .eq("is_active", true)
      .order("name");
    setModels(data || []);
  }, []);

  useEffect(() => {
    loadBikes();
  }, [loadBikes]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const counts = {
    all: bikes.length,
    in_stock: bikes.filter((b) => b.status === "in_stock").length,
    sold: bikes.filter((b) => b.status === "sold").length,
    reserved: bikes.filter((b) => b.status === "reserved").length,
    transferred: bikes.filter((b) => b.status === "transferred").length,
  };

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold text-[#0A0A0A]"
            style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
          >
            TVS Bikes Inventory
          </h2>
          <p className="text-sm text-[#9A9A9A] mt-0.5">
            {bikes.filter((b) => b.status === "in_stock").length} bikes in stock
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 h-9 px-3 text-sm font-medium text-[#4A4A4A] border border-[#E5E5E5] rounded-xl hover:bg-[#F5F5F5] transition-all">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 h-9 px-4 bg-[#FF4C00] hover:bg-[#E64400] text-white text-sm font-semibold rounded-xl transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Bike
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 bg-[#F5F5F5] rounded-xl p-1 w-fit">
        {(["all", "in_stock", "sold", "reserved", "transferred"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`
              flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-semibold transition-all
              ${statusFilter === s
                ? "bg-white text-[#0A0A0A] shadow-sm"
                : "text-[#6B6B6B] hover:text-[#0A0A0A]"
              }
            `}
          >
            {s === "all" ? "All" : STATUS_LABELS[s]}
            <span
              className={`
                text-[10px] px-1.5 py-0.5 rounded-full font-bold
                ${statusFilter === s ? "bg-[#FF4C00]/10 text-[#FF4C00]" : "bg-[#E5E5E5] text-[#6B6B6B]"}
              `}
            >
              {counts[s]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Round No., Chassis, Engine..."
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-[#E5E5E5] text-sm placeholder:text-[#ABABAB] focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] transition-all bg-white"
          />
        </div>
        <button className="flex items-center gap-2 h-9 px-3 text-sm font-medium text-[#4A4A4A] border border-[#E5E5E5] rounded-xl hover:bg-[#F5F5F5] transition-all">
          <Filter className="h-3.5 w-3.5" />
          Filters
          <ChevronDown className="h-3 w-3 text-[#ABABAB]" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#EFEFEF] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F0F0F0]">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">
                  Round No.
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">
                  Model
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">
                  Color
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">
                  Chassis No.
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">
                  Engine No.
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">
                  Price
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">
                  Stock Date
                </th>
                <th className="w-12 px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#F8F8F8]">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-[#F0F0F0] rounded animate-pulse" style={{ width: j === 1 ? "140px" : "80px" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : bikes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <Bike className="h-10 w-10 mx-auto mb-3 text-[#E0E0E0]" />
                    <p className="text-sm font-semibold text-[#6B6B6B]">No bikes found</p>
                    <p className="text-xs text-[#ABABAB] mt-1">
                      {statusFilter !== "all"
                        ? `No bikes with status "${STATUS_LABELS[statusFilter]}"`
                        : "Add your first bike to get started"}
                    </p>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="mt-4 flex items-center gap-2 h-9 px-4 bg-[#FF4C00] hover:bg-[#E64400] text-white text-sm font-semibold rounded-xl transition-all mx-auto"
                    >
                      <Plus className="h-4 w-4" /> Add First Bike
                    </button>
                  </td>
                </tr>
              ) : (
                bikes.map((bike) => (
                  <tr
                    key={bike.id}
                    className="border-b border-[#F8F8F8] hover:bg-[#FAFAFA] transition-colors group"
                  >
                    <td className="px-5 py-4">
                      <span className="text-sm font-bold text-[#FF4C00]">
                        {bike.round_number}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-[#0A0A0A]">
                          {bike.bike_models?.name || "—"}
                        </p>
                        <p className="text-xs text-[#9A9A9A] capitalize">
                          {bike.bike_models?.bike_category} · {bike.bike_models?.fuel_type}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {bike.bike_colors?.hex_code && (
                          <div
                            className="w-4 h-4 rounded-full border border-[#E5E5E5] flex-shrink-0"
                            style={{ backgroundColor: bike.bike_colors.hex_code }}
                          />
                        )}
                        <span className="text-sm text-[#4A4A4A]">
                          {bike.bike_colors?.name || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-mono text-[#4A4A4A]">
                        {bike.chassis_number}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-mono text-[#4A4A4A]">
                        {bike.engine_number}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-semibold text-[#0A0A0A]">
                        Rs. {bike.selling_price.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[bike.status]}`}
                      >
                        {STATUS_LABELS[bike.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-[#6B6B6B]">
                        {new Date(bike.stock_date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button className="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#F0F0F0] transition-all">
                        <MoreHorizontal className="h-4 w-4 text-[#6B6B6B]" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Bike Modal */}
      {showAddModal && (
        <AddBikeModal
          models={models}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadBikes();
          }}
        />
      )}
    </div>
  );
}

// ─── Add Bike Drawer ──────────────────────────────────────────────────────────
interface ModelOption {
  id: string;
  name: string;
  selling_price: number;
  mrp: number;
  bike_category: string;
  fuel_type: string;
  bike_colors: { id: string; name: string; hex_code?: string }[];
}

interface BikeEntry {
  round_number: string;
  chassis_number: string;
  engine_number: string;
  model_id: string;
  color_id: string;
  purchase_price: string;
  selling_price: string;
  notes: string;
}

function newEntry(): BikeEntry {
  return { round_number: "", chassis_number: "", engine_number: "", model_id: "", color_id: "", purchase_price: "", selling_price: "", notes: "" };
}

function AddBikeModal({
  models,
  onClose,
  onSuccess,
}: {
  models: ModelOption[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [stockDate, setStockDate] = useState(new Date().toISOString().split("T")[0]);
  const [entries, setEntries] = useState<BikeEntry[]>([newEntry()]);
  const [saving, setSaving] = useState(false);

  function updateEntry(idx: number, field: keyof BikeEntry, value: string) {
    setEntries((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      // Auto-fill selling price when model changes
      if (field === "model_id") {
        const model = models.find((m) => m.id === value);
        next[idx].selling_price = model ? model.selling_price.toString() : "";
        next[idx].color_id = "";
      }
      return next;
    });
  }

  function addEntry() {
    setEntries((prev) => [...prev, newEntry()]);
  }

  function removeEntry(idx: number) {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  function duplicateEntry(idx: number) {
    const base = { ...entries[idx], chassis_number: "", engine_number: "", round_number: "" };
    setEntries((prev) => {
      const next = [...prev];
      next.splice(idx + 1, 0, base);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();

    const records = entries.map((entry) => ({
      round_number: entry.round_number.trim().toUpperCase(),
      chassis_number: entry.chassis_number.trim().toUpperCase(),
      engine_number: entry.engine_number.trim().toUpperCase(),
      model_id: entry.model_id || null,
      color_id: entry.color_id || null,
      purchase_price: parseFloat(entry.purchase_price) || 0,
      selling_price: parseFloat(entry.selling_price) || 0,
      stock_date: stockDate,
      notes: entry.notes || null,
      status: "in_stock",
    }));

    const { error } = await supabase.from("inventory_bikes").insert(records);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${records.length} bike${records.length > 1 ? "s" : ""} added to inventory`);
      onSuccess();
    }
    setSaving(false);
  }

  const totalEntries = entries.length;
  const validEntries = entries.filter((e) => e.round_number && e.chassis_number && e.engine_number && e.model_id).length;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      {/* Slide-in drawer from right */}
      <div className="relative ml-auto w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#F0F0F0] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF4C00]/10 flex items-center justify-center">
              <PackagePlus className="h-5 w-5 text-[#FF4C00]" />
            </div>
            <div>
              <h3
                className="text-base font-bold text-[#0A0A0A]"
                style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
              >
                Add Bikes to Inventory
              </h3>
              <p className="text-xs text-[#9A9A9A]">
                {totalEntries} bike{totalEntries > 1 ? "s" : ""} · {validEntries} ready to save
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#F5F5F5]">
            <X className="h-4 w-4 text-[#6B6B6B]" />
          </button>
        </div>

        {/* Mode toggle + Stock Date */}
        <div className="px-6 py-4 border-b border-[#F5F5F5] flex items-center gap-4 flex-shrink-0 flex-wrap">
          <div className="flex items-center gap-1 bg-[#F5F5F5] rounded-xl p-1">
            {(["single", "batch"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setEntries([newEntry()]); }}
                className={`h-7 px-3 rounded-lg text-xs font-semibold transition-all ${mode === m ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#6B6B6B]"}`}
              >
                {m === "single" ? "Single Bike" : "Batch Add"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-xs font-medium text-[#6B6B6B]">Stock Date:</label>
            <input
              type="date"
              value={stockDate}
              onChange={(e) => setStockDate(e.target.value)}
              className="h-8 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white"
            />
          </div>
        </div>

        {/* No models warning */}
        {models.length === 0 && (
          <div className="mx-6 mt-4 flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl flex-shrink-0">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-700">
              <p className="font-semibold">No bike models found</p>
              <p className="mt-0.5">Go to <strong>Inventory → Models</strong> to add TVS models first, or run the <code>seed.sql</code> in Supabase to load all 11 models.</p>
            </div>
          </div>
        )}

        {/* Form entries */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {entries.map((entry, idx) => (
              <BikeEntryForm
                key={idx}
                idx={idx}
                entry={entry}
                models={models}
                total={entries.length}
                onChange={(field, value) => updateEntry(idx, field, value)}
                onRemove={() => removeEntry(idx)}
                onDuplicate={() => duplicateEntry(idx)}
              />
            ))}

            {mode === "batch" && (
              <button
                type="button"
                onClick={addEntry}
                className="w-full h-11 border-2 border-dashed border-[#E5E5E5] hover:border-[#FF4C00]/40 hover:bg-[#FF4C00]/3 rounded-xl text-sm font-semibold text-[#9A9A9A] hover:text-[#FF4C00] flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="h-4 w-4" /> Add Another Bike
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#F0F0F0] flex items-center gap-3 flex-shrink-0 bg-white">
            <button type="button" onClick={onClose} className="h-10 px-5 rounded-xl border border-[#E5E5E5] text-sm font-semibold text-[#4A4A4A] hover:bg-[#F5F5F5]">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || validEntries === 0}
              className="flex-1 h-10 bg-[#FF4C00] hover:bg-[#E64400] text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <PackagePlus className="h-4 w-4" />
                  Add {validEntries > 0 ? validEntries : totalEntries} Bike{totalEntries > 1 ? "s" : ""} to Inventory
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BikeEntryForm({
  idx,
  entry,
  models,
  total,
  onChange,
  onRemove,
  onDuplicate,
}: {
  idx: number;
  entry: BikeEntry;
  models: ModelOption[];
  total: number;
  onChange: (field: keyof BikeEntry, value: string) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const selectedModel = models.find((m) => m.id === entry.model_id);

  return (
    <div className="bg-[#FAFAFA] border border-[#EFEFEF] rounded-2xl p-4 space-y-3">
      {/* Row header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#8A8A8A] uppercase tracking-wider">
          Bike {idx + 1}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onDuplicate}
            className="h-7 px-2.5 rounded-lg text-xs font-semibold text-[#6B6B6B] hover:bg-[#F0F0F0] transition-all"
            title="Duplicate (same model/color)"
          >
            Copy
          </button>
          {total > 1 && (
            <button
              type="button"
              onClick={onRemove}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[#ABABAB] hover:bg-red-50 hover:text-red-500 transition-all"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Model + Color row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#6B6B6B]">Model <span className="text-[#FF4C00]">*</span></label>
          <select
            value={entry.model_id}
            onChange={(e) => onChange("model_id", e.target.value)}
            required
            className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white text-[#0A0A0A]"
          >
            <option value="">Select model...</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          {selectedModel && (
            <p className="text-[10px] text-[#9A9A9A] px-1 capitalize">
              {selectedModel.bike_category} · {selectedModel.fuel_type} · Default: Rs. {selectedModel.selling_price.toLocaleString()}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#6B6B6B]">Color</label>
          <select
            value={entry.color_id}
            onChange={(e) => onChange("color_id", e.target.value)}
            disabled={!selectedModel}
            className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white text-[#0A0A0A] disabled:opacity-50"
          >
            <option value="">Select color...</option>
            {selectedModel?.bike_colors.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Round No. */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[#6B6B6B]">Round Number <span className="text-[#FF4C00]">*</span></label>
        <input
          value={entry.round_number}
          onChange={(e) => onChange("round_number", e.target.value)}
          placeholder="e.g. R001"
          required
          className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white uppercase font-mono"
        />
      </div>

      {/* Chassis + Engine */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#6B6B6B]">Chassis Number <span className="text-[#FF4C00]">*</span></label>
          <input
            value={entry.chassis_number}
            onChange={(e) => onChange("chassis_number", e.target.value)}
            placeholder="Chassis No."
            required
            className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white uppercase font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#6B6B6B]">Engine Number <span className="text-[#FF4C00]">*</span></label>
          <input
            value={entry.engine_number}
            onChange={(e) => onChange("engine_number", e.target.value)}
            placeholder="Engine No."
            required
            className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white uppercase font-mono"
          />
        </div>
      </div>

      {/* Prices */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#6B6B6B]">Purchase Price (Rs.)</label>
          <input
            type="number"
            value={entry.purchase_price}
            onChange={(e) => onChange("purchase_price", e.target.value)}
            placeholder="0"
            className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#6B6B6B]">Selling Price (Rs.)</label>
          <input
            type="number"
            value={entry.selling_price}
            onChange={(e) => onChange("selling_price", e.target.value)}
            placeholder={selectedModel ? selectedModel.selling_price.toString() : "0"}
            className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white"
          />
          {selectedModel && entry.selling_price && parseFloat(entry.selling_price) !== selectedModel.selling_price && (
            <p className="text-[10px] text-amber-600 px-1">Default: Rs. {selectedModel.selling_price.toLocaleString()}</p>
          )}
        </div>
      </div>

      {/* Notes (collapsible) */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[#6B6B6B]">Notes (optional)</label>
        <input
          value={entry.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          placeholder="Any remarks about this unit..."
          className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white"
        />
      </div>
    </div>
  );
}
