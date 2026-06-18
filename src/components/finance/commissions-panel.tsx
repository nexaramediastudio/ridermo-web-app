"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Clock, RotateCcw, Search } from "lucide-react";
import {
  markCommissionReceived,
  markCommissionPending,
  COMMISSION_CATEGORY_LABELS,
  EXTERNAL_COMMISSION_CATEGORIES,
  type CommissionCategory,
} from "@/lib/finance/commission-records";

interface CommissionRow {
  id: string;
  sale_id: string;
  category: CommissionCategory;
  amount: number;
  status: "pending" | "received";
  received_at: string | null;
  created_at: string;
  sales: {
    invoice_number: string;
    sale_date: string;
    customers: { full_name: string } | { full_name: string }[] | null;
    inventory_bikes: { round_number: string; bike_models: { name: string } | { name: string }[] | null } | null;
  } | {
    invoice_number: string;
    sale_date: string;
    customers: { full_name: string } | { full_name: string }[] | null;
    inventory_bikes: { round_number: string; bike_models: { name: string } | { name: string }[] | null } | null;
  }[] | null;
}

export function CommissionsPanel({ onUpdated, className }: { onUpdated?: () => void; className?: string }) {
  const [filter, setFilter] = useState<"pending" | "received" | "all">("pending");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase
      .from("commission_records")
      .select(`
        id, sale_id, category, amount, status, received_at, created_at,
        sales(invoice_number, sale_date, customers(full_name), inventory_bikes(round_number, bike_models(name)))
      `)
      .in("category", EXTERNAL_COMMISSION_CATEGORIES)
      .order("created_at", { ascending: false })
      .limit(300);
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    else setRows((data as unknown as CommissionRow[]) || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function handleMarkReceived(id: string) {
    setMarking(id);
    try {
      const supabase = createClient();
      await markCommissionReceived(supabase, id);
      toast.success("Marked as Received — added to revenue");
      load();
      onUpdated?.();
    } catch (e) {
      toast.error((e as Error).message || "Failed to update");
    }
    setMarking(null);
  }

  async function handleMarkPending(id: string) {
    if (!window.confirm("Revert to Pending? This removes the amount from revenue.")) return;
    setMarking(id);
    try {
      const supabase = createClient();
      await markCommissionPending(supabase, id);
      toast.success("Marked as Pending — removed from revenue");
      load();
      onUpdated?.();
    } catch (e) {
      toast.error((e as Error).message || "Failed to update");
    }
    setMarking(null);
  }

  function resolveSale(row: CommissionRow) {
    const s = Array.isArray(row.sales) ? row.sales[0] : row.sales;
    if (!s) return { invoice: "—", customer: "—", bike: "—", roundNumber: "—" };
    const c = Array.isArray(s.customers) ? s.customers[0] : s.customers;
    const ib = Array.isArray(s.inventory_bikes) ? s.inventory_bikes[0] : s.inventory_bikes;
    const bm = ib ? (Array.isArray(ib.bike_models) ? ib.bike_models[0] : ib.bike_models) : null;
    return {
      invoice: s.invoice_number,
      customer: c?.full_name || "—",
      bike: bm?.name || "—",
      roundNumber: ib?.round_number || "—",
    };
  }

  const q = search.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    if (!q) return true;
    const sale = resolveSale(row);
    const categoryLabel = COMMISSION_CATEGORY_LABELS[row.category] || row.category;
    return (
      sale.invoice.toLowerCase().includes(q) ||
      sale.customer.toLowerCase().includes(q) ||
      sale.bike.toLowerCase().includes(q) ||
      sale.roundNumber.toLowerCase().includes(q) ||
      categoryLabel.toLowerCase().includes(q) ||
      String(row.amount).includes(q)
    );
  });

  const pendingTotal = filtered.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount, 0);
  const receivedTotal = filtered.filter((r) => r.status === "received").reduce((s, r) => s + r.amount, 0);

  return (
    <div className={`flex flex-col gap-4 ${className ?? ""}`}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <p className="text-[11px] font-bold text-amber-700 uppercase">Not Received</p>
          <p className="text-xl font-bold text-amber-800 tabular-nums">Rs. {pendingTotal.toLocaleString()}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          <p className="text-[11px] font-bold text-emerald-700 uppercase">Received</p>
          <p className="text-xl font-bold text-emerald-800 tabular-nums">Rs. {receivedTotal.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-[#E8E8E8] rounded-xl px-4 py-3 col-span-2">
          <p className="text-[11px] font-bold text-[#9A9A9A] uppercase">Showing</p>
          <p className="text-sm font-semibold text-[#0A0A0A] mt-0.5">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="px-5 py-4 border-b border-[#F0F0F0] flex items-center gap-3 flex-wrap flex-shrink-0">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice, round no., customer, bike..."
              className="r-input pl-9 w-full"
            />
          </div>
          <div className="flex items-center gap-1 bg-[#F5F5F5] rounded-xl p-1">
            {(["pending", "received", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`h-8 px-4 rounded-lg text-xs font-semibold capitalize transition-all ${filter === f ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#6B6B6B] hover:text-[#0A0A0A]"}`}
              >
                {f === "pending" ? "Not Received" : f === "received" ? "Received" : "All"}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-[#F0F0F0]">
                {["Invoice", "Round No.", "Customer", "Bike", "Type", "Amount", "Status", "Received Date", "Action"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#F8F8F8]">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-[#F0F0F0] rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <Clock className="h-8 w-8 text-[#D0D0D0] mx-auto mb-2" />
                    <p className="text-sm font-semibold text-[#6B6B6B]">
                      {search ? "No matching commission records" : "No commission records"}
                    </p>
                    <p className="text-xs text-[#ABABAB] mt-1">
                      {search ? "Try a different search term" : "Records appear here when you complete a sale"}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const sale = resolveSale(row);
                  const busy = marking === row.id;
                  return (
                    <tr key={row.id} className="border-b border-[#F8F8F8] hover:bg-[#FAFAFA] transition-colors">
                      <td className="px-4 py-3"><span className="text-xs font-bold text-[#FF4C00] font-mono">{sale.invoice}</span></td>
                      <td className="px-4 py-3"><span className="text-xs font-bold text-[#FF4C00] font-mono">{sale.roundNumber}</span></td>
                      <td className="px-4 py-3"><span className="text-sm text-[#0A0A0A]">{sale.customer}</span></td>
                      <td className="px-4 py-3"><span className="text-xs text-[#6B6B6B]">{sale.bike}</span></td>
                      <td className="px-4 py-3"><span className="text-xs font-medium text-[#4A4A4A]">{COMMISSION_CATEGORY_LABELS[row.category]}</span></td>
                      <td className="px-4 py-3"><span className="text-sm font-bold text-[#0A0A0A] tabular-nums">Rs. {row.amount.toLocaleString()}</span></td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.status === "received" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {row.status === "received" ? "Received" : "Not Received"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[#6B6B6B]">
                          {row.received_at ? new Date(row.received_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.status === "pending" ? (
                          <button
                            onClick={() => handleMarkReceived(row.id)}
                            disabled={busy}
                            className="flex items-center gap-1 h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded-lg disabled:opacity-60 whitespace-nowrap"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {busy ? "Saving..." : "Mark Received"}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMarkPending(row.id)}
                            disabled={busy}
                            className="flex items-center gap-1 h-8 px-3 bg-[#F5F5F5] hover:bg-amber-50 hover:text-amber-700 text-[#6B6B6B] text-[11px] font-semibold rounded-lg border border-[#E8E8E8] disabled:opacity-60 whitespace-nowrap"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            {busy ? "Saving..." : "Mark Not Received"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
