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
  Trash2,
  X,
  AlertCircle,
  PackagePlus,
  Truck,
} from "lucide-react";
import { deleteSale, DELETE_SALE_CONFIRM_MESSAGE } from "@/lib/sales/delete-sale";
import { matchesVehicleKind, type VehicleKind } from "@/lib/inventory/vehicle-kind";

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

const COPY: Record<VehicleKind, {
  title: string;
  item: string;
  items: string;
  add: string;
  addPlural: string;
  empty: string;
  noModels: string;
  noModelsHint: string;
}> = {
  "2w": {
    title: "TVS Bikes Inventory",
    item: "bike",
    items: "bikes",
    add: "Add Bike",
    addPlural: "Add Bikes to Inventory",
    empty: "Add your first bike to get started",
    noModels: "No bike models found",
    noModelsHint: "Go to Settings → Bike Models to add TVS models first.",
  },
  "3w": {
    title: "3-Wheelers Inventory",
    item: "3-wheeler",
    items: "3-wheelers",
    add: "Add 3-Wheeler",
    addPlural: "Add 3-Wheelers to Inventory",
    empty: "Add your first 3-wheeler to get started",
    noModels: "No 3-wheeler models found",
    noModelsHint: "Add a 3-wheeler model first (for example TVS King), then stock units here.",
  },
};

export function InventoryVehiclesPage({ kind }: { kind: VehicleKind }) {
  const copy = COPY[kind];
  const Icon = kind === "3w" ? Truck : Bike;
  const [bikes, setBikes] = useState<InventoryBike[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [models, setModels] = useState<{ id: string; name: string; selling_price: number; mrp: number; bike_category: string; fuel_type: string; tvs_category?: string; bike_colors: { id: string; name: string; hex_code?: string }[] }[]>([]);
  const [showAddModel, setShowAddModel] = useState(false);

  const loadBikes = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("inventory_bikes")
      .select(`
        *,
        bike_models(id, name, bike_category, fuel_type, selling_price, tvs_category),
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
    else {
      const rows = (data || []).filter((row) =>
        matchesVehicleKind(row.bike_models, kind),
      );
      setBikes(rows);
    }
    setLoading(false);
  }, [statusFilter, searchQuery, kind]);

  async function removeSoldBike(bike: InventoryBike) {
    if (!window.confirm(`${DELETE_SALE_CONFIRM_MESSAGE}\n\n${bike.round_number}`)) return;
    const supabase = createClient();
    const { data: sale } = await supabase
      .from("sales")
      .select("id")
      .eq("bike_id", bike.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sale) {
      toast.error(`No sale found for this ${copy.item}`);
      return;
    }
    try {
      await deleteSale(supabase, sale.id);
      toast.success(`${bike.round_number} removed from sales — back in stock`);
      loadBikes();
    } catch (e) {
      toast.error((e as Error).message || "Failed to remove sale");
    }
  }

  async function deleteBike(id: string, roundNum: string) {
    if (!window.confirm(`Delete ${copy.item} ${roundNum}? This cannot be undone.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("inventory_bikes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(`${roundNum} deleted`); loadBikes(); }
  }

  const loadModels = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("bike_models")
      .select("id, name, selling_price, mrp, bike_category, fuel_type, tvs_category, bike_colors(id, name, hex_code)")
      .eq("is_active", true)
      .order("name");
    setModels((data || []).filter((m) => matchesVehicleKind(m, kind)));
  }, [kind]);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF4C00]/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-[#FF4C00]" />
          </div>
          <div>
            <h1 className="r-page-title">{copy.title}</h1>
            <p className="r-page-sub">
              {bikes.filter((b) => b.status === "in_stock").length} in stock · {bikes.length} total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {kind === "3w" && (
            <button onClick={() => setShowAddModel(true)} className="r-btn-secondary">
              <Plus className="h-3.5 w-3.5" /> Add Model
            </button>
          )}
          <button className="r-btn-secondary">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="r-btn-primary"
          >
            <Plus className="h-4 w-4" /> {copy.add}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "In Stock",    value: counts.in_stock,    color: "text-emerald-600" },
          { label: "Sold",        value: counts.sold,        color: "text-[#6B6B6B]" },
          { label: "Reserved",    value: counts.reserved,    color: "text-amber-600" },
          { label: "Transferred", value: counts.transferred, color: "text-blue-600" },
        ].map((k) => (
          <div key={k.label} className="r-kpi">
            <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-wide">{k.label}</p>
            <p className={`text-xl font-bold tabular-nums ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="r-tabs">
          {(["all", "in_stock", "sold", "reserved", "transferred"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`${statusFilter === s ? "r-tab-on" : "r-tab-off"} flex items-center gap-1.5`}
            >
              {s === "all" ? "All" : STATUS_LABELS[s]}
              <span className="text-[10px] font-bold text-[#9A9A9A]">{counts[s]}</span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Round No., Chassis, Engine..."
            className="r-input pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="r-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="r-table">
            <thead>
              <tr className="r-thead-row">
                <th className="r-th">Round No.</th>
                <th className="r-th">Model</th>
                <th className="r-th">Color</th>
                <th className="r-th">Chassis No.</th>
                <th className="r-th">Engine No.</th>
                <th className="r-th">Price</th>
                <th className="r-th">Status</th>
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
                    <div className="w-14 h-14 rounded-2xl bg-[#F5F5F5] flex items-center justify-center mx-auto mb-3">
                      <Icon className="h-7 w-7 text-[#ABABAB]" />
                    </div>
                    <p className="text-[13px] font-semibold text-[#4A4A4A]">No {copy.items} found</p>
                    <p className="text-[11px] text-[#ABABAB] mt-1">
                      {statusFilter !== "all"
                        ? `No ${copy.items} with status "${STATUS_LABELS[statusFilter]}"`
                        : copy.empty}
                    </p>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="mt-4 r-btn-primary mx-auto"
                    >
                      <Plus className="h-4 w-4" /> {copy.add}
                    </button>
                  </td>
                </tr>
              ) : (
                bikes.map((bike) => (
                  <tr key={bike.id} className="r-tr group">
                    <td className="r-td">
                      <span className="text-[13px] font-bold text-[#FF4C00] font-mono">
                        {bike.round_number}
                      </span>
                    </td>
                    <td className="r-td">
                      <p className="text-[13px] font-semibold text-[#0A0A0A]">
                        {bike.bike_models?.name || "—"}
                      </p>
                      <p className="text-[11px] text-[#9A9A9A] capitalize">
                        {bike.bike_models?.bike_category === "3w" ? "3-Wheeler" : bike.bike_models?.bike_category} · {bike.bike_models?.fuel_type}
                      </p>
                    </td>
                    <td className="r-td">
                      <div className="flex items-center gap-2">
                        {bike.bike_colors?.hex_code && (
                          <div
                            className="w-3.5 h-3.5 rounded-full border border-[#E8E8E8] flex-shrink-0"
                            style={{ backgroundColor: bike.bike_colors.hex_code }}
                          />
                        )}
                        <span className="text-[13px] text-[#4A4A4A]">
                          {bike.bike_colors?.name || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="r-td">
                      <span className="text-[12px] font-mono text-[#4A4A4A]">
                        {bike.chassis_number}
                      </span>
                    </td>
                    <td className="r-td">
                      <span className="text-[12px] font-mono text-[#4A4A4A]">
                        {bike.engine_number}
                      </span>
                    </td>
                    <td className="r-td">
                      <span className="text-[13px] font-bold text-[#0A0A0A]">
                        Rs. {bike.selling_price.toLocaleString()}
                      </span>
                    </td>
                    <td className="r-td">
                      <span className={`r-badge text-[10px] font-bold border ${STATUS_STYLES[bike.status]}`}>
                        {STATUS_LABELS[bike.status]}
                      </span>
                    </td>
                    <td className="r-td">
                      <span className="text-[12px] text-[#6B6B6B]">
                        {new Date(bike.stock_date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="r-td">
                      {bike.status === "sold" ? (
                        <button
                          onClick={() => removeSoldBike(bike)}
                          className="w-auto h-7 px-2.5 flex items-center gap-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 text-[#ABABAB] text-[11px] font-semibold transition-all"
                          title="Remove sale and return bike to stock"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove Sale
                        </button>
                      ) : (
                        <button
                          onClick={() => deleteBike(bike.id, bike.round_number)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 text-[#ABABAB] transition-all"
                          title="Delete bike"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
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
          kind={kind}
          copy={copy}
          models={models}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadBikes();
          }}
          onAddModel={kind === "3w" ? () => { setShowAddModal(false); setShowAddModel(true); } : undefined}
        />
      )}
      {showAddModel && (
        <AddThreeWheelerModelModal
          onClose={() => setShowAddModel(false)}
          onSuccess={() => {
            setShowAddModel(false);
            loadModels();
            setShowAddModal(true);
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
  tvs_category?: string;
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
  kind,
  copy,
  models,
  onClose,
  onSuccess,
  onAddModel,
}: {
  kind: VehicleKind;
  copy: (typeof COPY)[VehicleKind];
  models: ModelOption[];
  onClose: () => void;
  onSuccess: () => void;
  onAddModel?: () => void;
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
      toast.success(`${records.length} ${records.length > 1 ? copy.items : copy.item} added to inventory`);
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
                {copy.addPlural}
              </h3>
              <p className="text-xs text-[#9A9A9A]">
                {totalEntries} {totalEntries > 1 ? copy.items : copy.item} · {validEntries} ready to save
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
                {m === "single" ? `Single ${kind === "3w" ? "3-Wheeler" : "Bike"}` : "Batch Add"}
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
              <p className="font-semibold">{copy.noModels}</p>
              <p className="mt-0.5">{copy.noModelsHint}</p>
              {onAddModel && (
                <button type="button" onClick={onAddModel} className="mt-2 text-[11px] font-bold text-[#FF4C00] hover:underline">
                  Add a 3-wheeler model
                </button>
              )}
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
                <Plus className="h-4 w-4" /> Add Another {kind === "3w" ? "3-Wheeler" : "Bike"}
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
                  Add {validEntries > 0 ? validEntries : totalEntries} { (validEntries > 0 ? validEntries : totalEntries) > 1 ? copy.items : copy.item } to Inventory
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
          Unit {idx + 1}
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

function AddThreeWheelerModelModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    fuel_type: "petrol",
    mrp: "",
    default_discount: "",
    selling_price: "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("bike_models").insert({
      name: form.name.toUpperCase().trim(),
      tvs_category: "3W",
      bike_category: "3w",
      fuel_type: form.fuel_type,
      mrp: parseFloat(form.mrp) || 0,
      default_discount: parseFloat(form.default_discount) || 0,
      selling_price: parseFloat(form.selling_price) || 0,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("3-wheeler model added");
      onSuccess();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#EFEFEF] z-10">
        <div className="flex items-center justify-between p-6 border-b border-[#F0F0F0]">
          <h3 className="text-lg font-bold text-[#0A0A0A]">Add 3-Wheeler Model</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#F5F5F5]">
            <X className="h-4 w-4 text-[#6B6B6B]" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="r-label">Model Name <span className="text-[#FF4C00]">*</span></label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. TVS KING"
              required
              className="r-input uppercase"
            />
          </div>
          <div>
            <label className="r-label">Fuel Type</label>
            <select
              value={form.fuel_type}
              onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}
              className="r-select"
            >
              <option value="petrol">Petrol</option>
              <option value="diesel">Diesel</option>
              <option value="electric">Electric</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="r-label">MRP (Rs.)</label>
              <input type="number" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} placeholder="0" className="r-input" />
            </div>
            <div>
              <label className="r-label">Discount</label>
              <input type="number" value={form.default_discount} onChange={(e) => setForm({ ...form, default_discount: e.target.value })} placeholder="0" className="r-input" />
            </div>
            <div>
              <label className="r-label">Selling Price</label>
              <input type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} placeholder="0" className="r-input" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="r-btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="r-btn-primary disabled:opacity-60">
              {saving ? "Saving..." : "Save Model"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
