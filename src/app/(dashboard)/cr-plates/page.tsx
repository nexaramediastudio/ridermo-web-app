"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Hash, Search, CheckCircle2, Clock, FileCheck, AlertTriangle, Trash2 } from "lucide-react";

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

const STATUS_BADGE: Record<TrackStatus, string> = {
  pending: "r-badge-amber",
  received: "r-badge-blue",
  collected: "r-badge-green",
};

const STATUS_SELECT: Record<TrackStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  received: "bg-blue-50 text-blue-700 border border-blue-200",
  collected: "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

export default function CRPlatesPage() {
  const [records, setRecords] = useState<CRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [crFilter, setCrFilter] = useState<"all" | TrackStatus>("all");
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
    return matchSearch && matchCR;
  });

  const pendingCR = records.filter((r) => r.cr_status === "pending").length;
  const pendingPlate = records.filter((r) => r.plate_status === "pending").length;
  const completedBoth = records.filter((r) => r.cr_status === "collected" && r.plate_status === "collected").length;

  async function deleteCRRecord(id: string) {
    if (!window.confirm("Delete this CR & Plate record?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("cr_plate_tracking").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Record deleted"); loadRecords(); }
  }

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <Hash className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="r-page-title">CR & Number Plates</h1>
            <p className="r-page-sub">Track registration and plate status for every sold bike</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingCR > 0 && (
            <span className="r-badge-amber flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5">
              <Clock className="h-3.5 w-3.5" /> {pendingCR} CR Pending
            </span>
          )}
          {pendingPlate > 0 && (
            <span className="r-badge-amber flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> {pendingPlate} Plates Pending
            </span>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Records", value: records.length, icon: Hash, color: "text-[#0A0A0A]" },
          { label: "CR Pending", value: pendingCR, icon: Clock, color: "text-amber-600" },
          { label: "Plates Pending", value: pendingPlate, icon: AlertTriangle, color: "text-amber-600" },
          { label: "Fully Completed", value: completedBoth, icon: FileCheck, color: "text-emerald-600" },
        ].map((k) => (
          <div key={k.label} className="r-kpi">
            <div className="flex items-center justify-between mb-3">
              <span className="r-page-sub">{k.label}</span>
              <k.icon className="h-4 w-4 text-[#ABABAB]" />
            </div>
            <p className={`text-2xl font-bold font-display ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="r-card overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-[#F0F0F0] flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice, customer, round no..."
              className="r-input pl-9"
            />
          </div>
          <div className="r-tabs">
            {(["all", "pending", "received", "collected"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setCrFilter(s)}
                className={crFilter === s ? "r-tab-on" : "r-tab-off"}
              >
                {s === "all" ? "All CR" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[11px] text-[#ABABAB] font-medium">{filtered.length} records</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="r-table">
            <thead>
              <tr className="r-thead-row">
                <th className="r-th">Invoice</th>
                <th className="r-th">Customer</th>
                <th className="r-th">Bike</th>
                <th className="r-th">Sale Date</th>
                <th className="r-th">CR Status</th>
                <th className="r-th">Plate No.</th>
                <th className="r-th">Plate Status</th>
                <th className="r-th w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#F5F5F5]">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="r-td"><div className="h-4 bg-[#F0F0F0] rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-[#F5F5F5] flex items-center justify-center mx-auto mb-3">
                      <Hash className="h-7 w-7 text-[#ABABAB]" />
                    </div>
                    <p className="text-[13px] font-semibold text-[#4A4A4A]">No records found</p>
                    <p className="text-[11px] text-[#ABABAB] mt-1">CR & Plate records are created automatically when a sale is completed</p>
                  </td>
                </tr>
              ) : (
                filtered.map((rec) => (
                  <tr key={rec.id} className="r-tr group">
                    <td className="r-td">
                      <span className="text-[13px] font-bold text-[#FF4C00]">
                        {rec.sales?.invoice_number || "—"}
                      </span>
                    </td>
                    <td className="r-td">
                      <p className="text-[13px] font-semibold text-[#0A0A0A]">
                        {rec.sales?.customers?.full_name || "—"}
                      </p>
                      <p className="text-[11px] text-[#9A9A9A]">{rec.sales?.customers?.phone}</p>
                    </td>
                    <td className="r-td">
                      <p className="text-[13px] font-semibold text-[#0A0A0A]">
                        {rec.inventory_bikes?.bike_models?.name || "—"}
                      </p>
                      <p className="text-[11px] text-[#FF4C00] font-mono">{rec.inventory_bikes?.round_number}</p>
                    </td>
                    <td className="r-td">
                      <span className="text-[12px] text-[#6B6B6B]">
                        {rec.sales?.sale_date
                          ? new Date(rec.sales.sale_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })
                          : "—"}
                      </span>
                    </td>
                    <td className="r-td">
                      <select
                        value={rec.cr_status}
                        onChange={(e) => updateStatus(rec.id, "cr_status", e.target.value as TrackStatus)}
                        disabled={updating === rec.id + "cr_status"}
                        className={`text-[11px] font-bold h-7 px-2.5 rounded-lg cursor-pointer focus:outline-none transition-all ${STATUS_SELECT[rec.cr_status]}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="received">Received</option>
                        <option value="collected">Collected</option>
                      </select>
                    </td>
                    <td className="r-td">
                      <PlateNumberCell
                        id={rec.id}
                        current={rec.plate_number}
                        onSave={(val) => updateStatus(rec.id, "plate_status", rec.plate_status, "plate_number", val)}
                      />
                    </td>
                    <td className="r-td">
                      <select
                        value={rec.plate_status}
                        onChange={(e) => updateStatus(rec.id, "plate_status", e.target.value as TrackStatus)}
                        disabled={updating === rec.id + "plate_status"}
                        className={`text-[11px] font-bold h-7 px-2.5 rounded-lg cursor-pointer focus:outline-none transition-all ${STATUS_SELECT[rec.plate_status]}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="received">Received</option>
                        <option value="collected">Collected</option>
                      </select>
                    </td>
                    <td className="r-td">
                      <button
                        onClick={() => deleteCRRecord(rec.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 text-[#ABABAB] transition-all"
                        title="Delete record"
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

        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-[#F0F0F0] bg-[#FAFAFA] flex items-center justify-between">
            <span className="text-[11px] text-[#ABABAB]">{filtered.length} of {records.length} records</span>
            <span className="text-[11px] text-emerald-600 font-semibold">{completedBoth} fully completed</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PlateNumberCell({ current, onSave }: { id: string; current?: string; onSave: (val: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(current || "");

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value.toUpperCase())}
          placeholder="CAB 1234"
          autoFocus
          className="w-24 h-7 px-2 rounded-lg border border-[#E8E8E8] text-[11px] font-mono focus:outline-none focus:border-[#FF4C00] uppercase"
          onKeyDown={(e) => {
            if (e.key === "Enter") { onSave(val); setEditing(false); }
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <button
          onClick={() => { onSave(val); setEditing(false); }}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`text-[13px] font-mono text-left hover:underline transition-colors ${current ? "text-[#0A0A0A] font-semibold" : "text-[#ABABAB] italic text-[11px]"}`}
    >
      {current || "Add plate no."}
    </button>
  );
}
