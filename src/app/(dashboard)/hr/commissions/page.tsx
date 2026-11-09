"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Bike, ChevronLeft, ChevronRight, RefreshCw, DollarSign,
  Users, AlertCircle, UserCheck,
} from "lucide-react";
import {
  monthBounds,
  syncWorkerCommissionsForMonth,
  toDateOnly,
} from "@/lib/hr/worker-commissions";

interface SaleRow {
  id: string;
  invoice_number: string;
  sale_date: string;
  sold_by: string | null;
  inventory_bikes: { round_number: string; bike_models: { name: string } | null } | null;
  customers: { full_name: string } | null;
}

interface WorkerRow {
  id: string;
  full_name: string;
  per_bike_commission: number;
  type: string;
  is_active: boolean;
}

interface CommissionRow {
  id: string;
  sale_id: string;
  employee_id: string;
  amount: number;
  sale_date: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDate(iso: string) {
  return new Date(toDateOnly(iso) + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function WorkerCommissionsAdminPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    const supabase = createClient();
    const { start, end } = monthBounds(year, month);

    try {
      await syncWorkerCommissionsForMonth(supabase, year, month);
    } catch (err) {
      toast.error((err as Error).message || "Failed to sync worker commissions");
    }

    const [salesRes, empRes, commRes] = await Promise.all([
      supabase
        .from("sales")
        .select("id, invoice_number, sale_date, sold_by, inventory_bikes(round_number, bike_models(name)), customers(full_name)")
        .eq("status", "completed")
        .gte("sale_date", start)
        .lt("sale_date", end)
        .order("sale_date", { ascending: true }),
      supabase
        .from("employees")
        .select("id, full_name, per_bike_commission, type, is_active")
        .eq("is_active", true)
        .order("full_name"),
      supabase
        .from("worker_commissions")
        .select("id, sale_id, employee_id, amount, sale_date")
        .gte("sale_date", start)
        .lt("sale_date", end),
    ]);

    if (salesRes.error) toast.error(salesRes.error.message);
    setSales((salesRes.data as unknown as SaleRow[]) || []);
    setWorkers((empRes.data as WorkerRow[]) || []);
    setCommissions((commRes.data as CommissionRow[]) || []);
    setLoading(false);
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  async function recalculate() {
    setSyncing(true);
    const supabase = createClient();
    try {
      const { added, removed } = await syncWorkerCommissionsForMonth(supabase, year, month);
      await load({ silent: true });
      if (added === 0 && removed === 0) {
        toast.success("Commissions are already up to date for this month");
      } else {
        const parts: string[] = [];
        if (added) parts.push(`${added} added`);
        if (removed) parts.push(`${removed} removed`);
        toast.success(`Worker commissions updated · ${parts.join(", ")}`);
      }
    } catch (err) {
      toast.error((err as Error).message || "Failed to recalculate commissions");
    }
    setSyncing(false);
  }

  function changeMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
  }

  const commissionsForSale = (saleId: string) =>
    commissions.filter((c) => c.sale_id === saleId);

  const workerTotals = workers.map((w) => {
    const rows = commissions.filter((c) => c.employee_id === w.id);
    const bikes = rows.length;
    const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
    return { ...w, bikes, total };
  }).filter((w) => w.type === "worker" || w.bikes > 0);

  const totalBikes = sales.length;
  const totalPayout = commissions.reduce((s, c) => s + Number(c.amount || 0), 0);
  const earningWorkers = workerTotals.filter((w) => w.bikes > 0).length;
  const missingRate = workers.filter((w) => w.type === "worker" && !(Number(w.per_bike_commission) > 0));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF4C00]/10 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-[#FF4C00]" />
          </div>
          <div>
            <h1 className="r-page-title">Worker Commissions</h1>
            <p className="r-page-sub">
              Commission for each sale goes only to the person selected as Sold by
            </p>
          </div>
        </div>
        <button
          onClick={recalculate}
          disabled={syncing || loading}
          className="r-btn-primary disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Calculating..." : "Recalculate Month"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="r-card p-4 flex items-center gap-3">
          <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center rounded-xl border border-[#E5E5E5] hover:bg-[#F5F5F5]">
            <ChevronLeft className="h-4 w-4 text-[#6B6B6B]" />
          </button>
          <div className="flex-1 text-center">
            <p className="text-base font-bold text-[#0A0A0A]">{MONTHS[month - 1]}</p>
            <p className="text-xs text-[#9A9A9A]">{year}</p>
          </div>
          <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center rounded-xl border border-[#E5E5E5] hover:bg-[#F5F5F5]">
            <ChevronRight className="h-4 w-4 text-[#6B6B6B]" />
          </button>
        </div>
        {[
          { label: "Bikes sold", value: String(totalBikes), icon: Bike },
          { label: "Workers earning", value: String(earningWorkers), icon: Users },
          { label: "Total commission", value: `Rs. ${totalPayout.toLocaleString()}`, icon: DollarSign, accent: true },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className={`r-card p-4 ${accent ? "border-[#FF4C00]/20" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">{label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? "bg-[#FF4C00]/10" : "bg-[#F5F5F5]"}`}>
                <Icon className={`h-4 w-4 ${accent ? "text-[#FF4C00]" : "text-[#9A9A9A]"}`} />
              </div>
            </div>
            <p className={`text-lg font-bold ${accent ? "text-[#FF4C00]" : "text-[#0A0A0A]"}`}>{value}</p>
          </div>
        ))}
      </div>

      {missingRate.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            <strong>{missingRate.map((w) => w.full_name).join(", ")}</strong>
            {missingRate.length === 1 ? " has" : " have"} no per-bike commission set on Employees, so they earn Rs. 0 even if they are selected as Sold by.
          </p>
        </div>
      )}

      <div className="r-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F0F0F0]">
          <h2 className="text-[13px] font-bold text-[#0A0A0A]">By worker</h2>
          <p className="text-[11px] text-[#9A9A9A] mt-0.5">Bikes they sold this month × their per-bike rate</p>
        </div>
        <table className="r-table">
          <thead>
            <tr className="r-thead-row">
              <th className="r-th">Worker</th>
              <th className="r-th">Rate / bike</th>
              <th className="r-th">Bikes sold</th>
              <th className="r-th text-right">Commission</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-[#F5F5F5]">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <td key={j} className="r-td"><div className="h-4 bg-[#F0F0F0] rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : workers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-[13px] text-[#9A9A9A]">
                  No active workers
                </td>
              </tr>
            ) : (
              workerTotals.map((w) => (
                <tr key={w.id} className="r-tr">
                  <td className="r-td">
                    <p className="text-[13px] font-semibold text-[#0A0A0A]">{w.full_name}</p>
                  </td>
                  <td className="r-td text-[12px] text-[#6B6B6B]">
                    {Number(w.per_bike_commission) > 0
                      ? `Rs. ${Number(w.per_bike_commission).toLocaleString()}`
                      : "—"}
                  </td>
                  <td className="r-td text-[12px] font-semibold text-[#0A0A0A]">{w.bikes}</td>
                  <td className="r-td text-right text-[13px] font-bold text-[#FF4C00]">
                    {w.total > 0 ? `Rs. ${w.total.toLocaleString()}` : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="r-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F0F0F0]">
          <h2 className="text-[13px] font-bold text-[#0A0A0A]">Sales this month</h2>
          <p className="text-[11px] text-[#9A9A9A] mt-0.5">Only the person selected on the sale earns commission</p>
        </div>
        <table className="r-table">
          <thead>
            <tr className="r-thead-row">
              <th className="r-th">Date</th>
              <th className="r-th">Invoice</th>
              <th className="r-th">Bike</th>
              <th className="r-th">Sold by</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-[#F5F5F5]">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <td key={j} className="r-td"><div className="h-4 bg-[#F0F0F0] rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-[13px] text-[#9A9A9A]">
                  No completed bike sales in {MONTHS[month - 1]} {year}
                </td>
              </tr>
            ) : (
              sales.map((sale) => {
                const earned = commissionsForSale(sale.id);
                const seller =
                  workers.find((w) => w.id === sale.sold_by) ||
                  workers.find((w) => earned.some((c) => c.employee_id === w.id));
                const sellerRate = Number(seller?.per_bike_commission) || 0;
                const payout = earned.reduce((s, c) => s + Number(c.amount || 0), 0);
                return (
                  <tr key={sale.id} className="r-tr">
                    <td className="r-td text-[12px] text-[#6B6B6B] whitespace-nowrap">
                      {formatDate(sale.sale_date)}
                    </td>
                    <td className="r-td text-[12px] font-bold text-[#FF4C00] font-mono">
                      {sale.invoice_number}
                    </td>
                    <td className="r-td">
                      <div className="flex items-center gap-1.5 text-[12px] text-[#0A0A0A]">
                        <Bike className="h-3 w-3 text-[#ABABAB] flex-shrink-0" />
                        <span>
                          {sale.inventory_bikes?.bike_models?.name || "—"}
                          {sale.inventory_bikes?.round_number ? ` · ${sale.inventory_bikes.round_number}` : ""}
                        </span>
                      </div>
                      {sale.customers?.full_name && (
                        <p className="text-[10px] text-[#9A9A9A] mt-0.5">{sale.customers.full_name}</p>
                      )}
                    </td>
                    <td className="r-td">
                      {seller ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">
                            <UserCheck className="h-3 w-3" />
                            {seller.full_name}
                          </span>
                          {payout > 0 ? (
                            <span className="text-[11px] font-semibold text-[#FF4C00]">
                              Rs. {payout.toLocaleString()}
                            </span>
                          ) : sellerRate <= 0 ? (
                            <span className="text-[10px] text-amber-600">No rate set</span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-[12px] text-[#ABABAB]">Not selected</span>
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
  );
}
