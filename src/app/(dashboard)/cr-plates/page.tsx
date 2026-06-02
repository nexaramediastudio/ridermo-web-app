"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Hash, Search, CheckCircle2, Clock, Package } from "lucide-react";

type TrackStatus = "pending" | "received" | "collected";

interface CRRecord {
  id: string;
  cr_status: TrackStatus;
  plate_status: TrackStatus;
  cr_collected_by?: string;
  plate_number?: string;
  plate_collected_by?: string;
  cr_collection_date?: string;
  plate_collection_date?: string;
  notes?: string;
  created_at: string;
  sales: {
    invoice_number: string;
    sale_date: string;
    customers: { full_name: string; phone?: string } | null;
  } | null;
  inventory_bikes: {
    round_number: string;
    bike_models: { name: string } | null;
    chassis_number: string;
  } | null;
}

const STATUS_STYLES: Record<TrackStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  received: "bg-blue-50 text-blue-700 border-blue-100",
  collected: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

const STATUS_LABELS: Record<TrackStatus, string> = {
  pending: "Pending",
  received: "Received",
  collected: "Collected",
};

export default function CRPlatesPage() {
  const [records, setRecords] = useState<CRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [crFilter, setCrFilter] = useState<"all" | TrackStatus>("all");
  const [plateFilter, setPlateFilter] = useState<"all" | TrackStatus>("all");
  const [updating, setUpdating] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("cr_number_plates")
      .select(`
        id, cr_status, plate_status, cr_collected_by, plate_number,
        plate_collected_by, cr_collection_date, plate_collection_date, notes, created_at,
        sales(invoice_number, sale_date, customers(full_name, phone)),
        inventory_bikes(round_number, chassis_number, bike_models(name))
      `)
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load records");
    else setRecords((data as unknown as CRRecord[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const filtered = records.filter((r) => {
    const matchSearch = !search ||
      r.sales?.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      r.sales?.customers?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.inventory_bikes?.round_number?.toLowerCase().includes(search.toLowerCase()) ||
      r.plate_number?.toLowerCase().includes(search.toLowerCase());
    const matchCR = crFilter === "all" || r.cr_status === crFilter;
    const matchPlate = plateFilter === "all" || r.plate_status === plateFilter;
    return matchSearch && matchCR && matchPlate;
  });

  const pendingCR = records.filter((r) => r.cr_status === "pending").length;
  const pendingPlate = records.filter((r) => r.plate_status === "pending").length;

  async function updateStatus(id: string, field: "cr_status" | "plate_status", value: TrackStatus, extraField?: string, extraValue?: string) {
    setUpdating(id + field);
    const supabase = createClient();
    const update: Record<string, string> = { [field]: value };
    if (field === "cr_status" && value === "collected") update.cr_collection_date = new Date().toISOString().split("T")[0];
    if (field === "plate_status" && value === "collected") update.plate_collection_date = new Date().toISOString().split("T")[0];
    if (extraField && extraValue) update[extraField] = extraValue;
    await supabase.from("cr_number_plates").update(update).eq("id", id);
    toast.success("Status updated");
    loadRecords();
    setUpdating(null);
  }

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>CR & Number Plates</h2>
          <p className="text-sm text-[#9A9A9A] mt-0.5">Track CR and plate status for every sold bike</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCR > 0 && <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-100"><Clock className="h-3.5 w-3.5" />{pendingCR} Pending CR</span>}
          {pendingPlate > 0 && <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-100"><Hash className="h-3.5 w-3.5" />{pendingPlate} Pending Plates</span>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice, customer, round no..." className="w-full h-9 pl-9 pr-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#8A8A8A]">CR:</span>
          <div className="flex items-center gap-1 bg-[#F5F5F5] rounded-xl p-1">
            {(["all", "pending", "received", "collected"] as const).map((s) => (
              <button key={s} onClick={() => setCrFilter(s)} className={`h-7 px-2.5 rounded-lg text-xs font-semibold transition-all capitalize ${crFilter === s ? "bg-white shadow-sm text-[#0A0A0A]" : "text-[#6B6B6B]"}`}>{s === "all" ? "All" : STATUS_LABELS[s as TrackStatus]}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#EFEFEF] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F0F0F0]">
                {["Invoice", "Customer", "Bike", "Sale Date", "CR Status", "Plate No.", "Plate Status", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#F8F8F8]">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-[#F0F0F0] rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-14 text-center">
                  <Package className="h-10 w-10 mx-auto mb-3 text-[#E0E0E0]" />
                  <p className="text-sm font-semibold text-[#6B6B6B]">No records found</p>
                  <p className="text-xs text-[#ABABAB] mt-1">CR & Plate records are created automatically when a sale is completed</p>
                </td></tr>
              ) : (
                filtered.map((rec) => (
                  <tr key={rec.id} className="border-b border-[#F8F8F8] hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-4"><span className="text-sm font-bold text-[#FF4C00]">{rec.sales?.invoice_number || "—"}</span></td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-[#0A0A0A]">{rec.sales?.customers?.full_name || "—"}</p>
                      <p className="text-xs text-[#9A9A9A]">{rec.sales?.customers?.phone}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-[#0A0A0A]">{rec.inventory_bikes?.bike_models?.name || "—"}</p>
                      <p className="text-xs text-[#FF4C00] font-mono">{rec.inventory_bikes?.round_number}</p>
                    </td>
                    <td className="px-5 py-4"><span className="text-sm text-[#6B6B6B]">{rec.sales?.sale_date ? new Date(rec.sales.sale_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}</span></td>
                    {/* CR Status */}
                    <td className="px-5 py-4">
                      <select
                        value={rec.cr_status}
                        onChange={(e) => updateStatus(rec.id, "cr_status", e.target.value as TrackStatus)}
                        disabled={updating === rec.id + "cr_status"}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border cursor-pointer focus:outline-none ${STATUS_STYLES[rec.cr_status]}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="received">Received</option>
                        <option value="collected">Collected</option>
                      </select>
                    </td>
                    {/* Plate Number */}
                    <td className="px-5 py-4">
                      <PlateNumberCell id={rec.id} current={rec.plate_number} onSave={(val) => updateStatus(rec.id, "plate_status", rec.plate_status, "plate_number", val)} />
                    </td>
                    {/* Plate Status */}
                    <td className="px-5 py-4">
                      <select
                        value={rec.plate_status}
                        onChange={(e) => updateStatus(rec.id, "plate_status", e.target.value as TrackStatus)}
                        disabled={updating === rec.id + "plate_status"}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border cursor-pointer focus:outline-none ${STATUS_STYLES[rec.plate_status]}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="received">Received</option>
                        <option value="collected">Collected</option>
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      {rec.cr_collection_date && (
                        <p className="text-xs text-[#9A9A9A]">CR: {new Date(rec.cr_collection_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PlateNumberCell({ id, current, onSave }: { id: string; current?: string; onSave: (val: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(current || "");

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value.toUpperCase())}
          placeholder="e.g. CAB 1234"
          autoFocus
          className="w-24 h-7 px-2 rounded-lg border border-[#E5E5E5] text-xs font-mono focus:outline-none focus:border-[#FF4C00] uppercase"
          onKeyDown={(e) => { if (e.key === "Enter") { onSave(val); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
        />
        <button onClick={() => { onSave(val); setEditing(false); }} className="w-6 h-6 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setEditing(true)} className={`text-sm font-mono text-left hover:underline ${current ? "text-[#0A0A0A] font-semibold" : "text-[#ABABAB] italic"}`}>
      {current || "Add plate no."}
    </button>
  );
}
