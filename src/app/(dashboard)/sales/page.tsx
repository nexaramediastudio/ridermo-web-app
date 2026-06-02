"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";
import {
  Plus, Search, FileText, TrendingUp, Bike, User,
  CreditCard, ArrowRight, Building2, Shield, Zap,
  ArrowUpRight, ArrowDownRight, ShoppingCart,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";

interface SaleRow {
  id: string;
  invoice_number: string;
  sale_date: string;
  total_amount: number;
  payment_type: "cash" | "finance" | "insurance";
  status: string;
  tvs_commission: number;
  finance_commission: number;
  insurance_commission: number;
  inventory_bikes: { round_number: string; bike_models: { name: string } | null } | null;
  customers: { full_name: string; phone?: string } | null;
}

const PAY: Record<string, { label: string; cls: string }> = {
  cash: { label: "Cash", cls: "bg-emerald-50 text-emerald-700" },
  finance: { label: "Finance", cls: "bg-blue-50 text-blue-700" },
  insurance: { label: "Insurance", cls: "bg-purple-50 text-purple-700" },
};

function CT({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-xl px-3 py-2 text-xs">
      <p className="font-bold text-[#0A0A0A] mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[#6B6B6B]">Rs. {Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function RBar(props: { x?: number; y?: number; width?: number; height?: number; fill?: string }) {
  const { x = 0, y = 0, width = 0, height = 0, fill } = props;
  if (!height || height <= 0) return null;
  const r = Math.min(4, width / 2);
  return <path d={`M${x},${y+height} L${x},${y+r} Q${x},${y} ${x+r},${y} L${x+width-r},${y} Q${x+width},${y} ${x+width},${y+r} L${x+width},${y+height} Z`} fill={fill} />;
}

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("month");
  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const [chartData, setChartData] = useState<{ label: string; revenue: number; count: number }[]>([]);

  const now = new Date();

  const loadSales = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("sales")
      .select(`id, invoice_number, sale_date, total_amount, payment_type, status,
        tvs_commission, finance_commission, insurance_commission,
        inventory_bikes(round_number, bike_models(name)),
        customers(full_name, phone)`)
      .order("created_at", { ascending: false });

    if (dateFilter === "today") {
      query = query.eq("sale_date", now.toISOString().split("T")[0]);
    } else if (dateFilter === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      query = query.gte("sale_date", start);
    } else if (dateFilter === "year") {
      query = query.gte("sale_date", `${now.getFullYear()}-01-01`);
    }

    const { data, error } = await query.limit(500);
    if (error) { toast.error("Failed to load sales"); setLoading(false); return; }
    const rows = (data as unknown as SaleRow[]) || [];
    setSales(rows);

    // Build chart data
    const byDate: Record<string, { revenue: number; count: number }> = {};
    for (const s of rows) {
      const d = s.sale_date?.split("T")[0] || "";
      if (!byDate[d]) byDate[d] = { revenue: 0, count: 0 };
      byDate[d].revenue += s.total_amount;
      byDate[d].count++;
    }
    const sorted = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
    setChartData(sorted.map(([date, v]) => ({
      label: new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      revenue: v.revenue,
      count: v.count,
    })));

    setLoading(false);
  }, [dateFilter]);

  useEffect(() => { loadSales(); }, [loadSales]);

  const filtered = sales.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.invoice_number.toLowerCase().includes(q) ||
      s.customers?.full_name?.toLowerCase().includes(q) ||
      s.inventory_bikes?.bike_models?.name?.toLowerCase().includes(q);
  });

  const totalRevenue = filtered.reduce((s, r) => s + r.total_amount, 0);
  const totalTVS = filtered.reduce((s, r) => s + (r.tvs_commission || 0), 0);
  const totalFinance = filtered.reduce((s, r) => s + (r.finance_commission || 0), 0);
  const totalIns = filtered.reduce((s, r) => s + (r.insurance_commission || 0), 0);
  const totalComm = totalTVS + totalFinance + totalIns;
  const cashCount = filtered.filter(s => s.payment_type === "cash").length;
  const finCount = filtered.filter(s => s.payment_type === "finance").length;
  const insCount = filtered.filter(s => s.payment_type === "insurance").length;

  return (
    <div className="space-y-5 max-w-[1400px] pb-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Sales History</h2>
          <p className="text-[12px] text-[#ABABAB] mt-0.5">{filtered.length} transaction{filtered.length !== 1 ? "s" : ""} · Rs. {totalRevenue.toLocaleString()} total</p>
        </div>
        <Link href="/sales/new" className="flex items-center gap-2 h-9 px-4 bg-[#FF4C00] text-white text-[13px] font-semibold rounded-xl hover:bg-[#E04400] transition-colors">
          <Zap className="h-3.5 w-3.5" /> New Sale
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `Rs. ${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "bg-[#FF4C00] text-white", main: true },
          { label: "TVS Commission", value: `Rs. ${totalTVS.toLocaleString()}`, icon: Bike, color: "bg-[#0A0A0A] text-white", main: false },
          { label: "Finance Commission", value: `Rs. ${totalFinance.toLocaleString()}`, icon: Building2, color: "bg-[#F5F5F5] text-[#6B6B6B]", main: false },
          { label: "Insurance Commission", value: `Rs. ${totalIns.toLocaleString()}`, icon: Shield, color: "bg-[#F5F5F5] text-[#6B6B6B]", main: false },
        ].map(({ label, value, icon: Icon, color, main }) => (
          <div key={label} className="bg-white border border-[#E8E8E8] rounded-xl px-4 py-3 flex items-center gap-3 hover:border-[#D0D0D0] transition-colors">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon style={{ width: 15, height: 15 }} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-wide">{label}</p>
              <p className="text-[17px] font-bold text-[#0A0A0A] leading-tight tabular-nums" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Full-width Revenue Chart */}
      <div className="bg-white border border-[#E8E8E8] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[13px] font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Revenue Trend</h3>
            <p className="text-[11px] text-[#ABABAB] mt-0.5">Daily sales revenue for selected period</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Date filter tabs */}
            <div className="flex items-center gap-1 bg-[#F5F5F5] rounded-lg p-0.5">
              {[{ id: "today", l: "Today" }, { id: "month", l: "Month" }, { id: "year", l: "Year" }, { id: "all", l: "All" }].map(f => (
                <button key={f.id} onClick={() => setDateFilter(f.id)}
                  className={`h-6 px-2.5 rounded-md text-[11px] font-semibold transition-all ${dateFilter === f.id ? "bg-white text-[#0A0A0A]" : "text-[#9A9A9A] hover:text-[#0A0A0A]"}`}>
                  {f.l}
                </button>
              ))}
            </div>
            {/* Chart type */}
            <div className="flex items-center gap-1 bg-[#F5F5F5] rounded-lg p-0.5">
              {(["area", "bar"] as const).map(t => (
                <button key={t} onClick={() => setChartType(t)}
                  className={`h-6 px-2.5 rounded-md text-[11px] font-semibold transition-all ${chartType === t ? "bg-white text-[#0A0A0A]" : "text-[#9A9A9A]"}`}>
                  {t === "area" ? "Line" : "Bar"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-64 bg-[#F8F8F8] rounded-xl animate-pulse" />
        ) : chartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-[#D0D0D0]">
            <ShoppingCart className="h-8 w-8 mb-2" />
            <p className="text-[12px] font-medium text-[#ABABAB]">No sales data for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            {chartType === "area" ? (
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF4C00" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#FF4C00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#F0F0F0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#ABABAB" }} axisLine={false} tickLine={false}
                  interval={chartData.length > 20 ? Math.floor(chartData.length / 12) : 0} />
                <YAxis tick={{ fontSize: 10, fill: "#ABABAB" }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : `${v}`} />
                <Tooltip content={<CT />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#FF4C00" strokeWidth={2.5} fill="url(#salesGrad)" dot={false} activeDot={{ r: 5, fill: "#FF4C00" }} />
              </AreaChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
                <CartesianGrid stroke="#F0F0F0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#ABABAB" }} axisLine={false} tickLine={false}
                  interval={chartData.length > 20 ? Math.floor(chartData.length / 12) : 0} />
                <YAxis tick={{ fontSize: 10, fill: "#ABABAB" }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : `${v}`} />
                <Tooltip cursor={{ fill: "#F9F9F9" }} formatter={(v) => [`Rs. ${Number(v).toLocaleString()}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="#FF4C00" shape={<RBar />} maxBarSize={28} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}

        {/* Summary strip below chart */}
        <div className="flex items-center gap-6 pt-4 mt-1 border-t border-[#F5F5F5]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 rounded bg-[#FF4C00]" />
            <span className="text-[11px] text-[#9A9A9A] font-medium">Revenue</span>
          </div>
          <div className="h-4 w-px bg-[#F0F0F0]" />
          <div className="flex items-center gap-4 text-[11px] text-[#ABABAB]">
            <span><strong className="text-[#0A0A0A] font-bold">{cashCount}</strong> Cash</span>
            <span><strong className="text-[#0A0A0A] font-bold">{finCount}</strong> Finance</span>
            <span><strong className="text-[#0A0A0A] font-bold">{insCount}</strong> Insurance</span>
          </div>
          <div className="ml-auto flex items-center gap-4 text-[11px]">
            <span className="text-[#ABABAB]">Total Commission: <strong className="text-[#0A0A0A]">Rs. {totalComm.toLocaleString()}</strong></span>
          </div>
        </div>
      </div>

      {/* Search row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search invoice, customer, bike..."
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-[#E8E8E8] text-[13px] focus:outline-none focus:border-[#FF4C00] bg-white transition-colors" />
        </div>
        <span className="text-[11px] text-[#ABABAB] font-medium">{filtered.length} results</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E8E8E8] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F0F0F0]">
                {["Invoice", "Date", "Customer", "Bike", "Payment", "Amount", "Commission", ""].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-[#ABABAB] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#F8F8F8]">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-5 py-3.5"><div className="h-3.5 bg-[#F0F0F0] rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-[#F5F5F5] flex items-center justify-center">
                        <FileText className="h-6 w-6 text-[#D0D0D0]" />
                      </div>
                      <p className="text-[13px] font-semibold text-[#6B6B6B]">No sales found</p>
                      <p className="text-[11px] text-[#ABABAB]">Start making sales to see them here</p>
                      <Link href="/sales/new" className="mt-2 flex items-center gap-1.5 h-8 px-4 bg-[#FF4C00] text-white text-[12px] font-semibold rounded-xl">
                        <Plus className="h-3.5 w-3.5" /> New Sale
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(sale => {
                  const comm = (sale.tvs_commission || 0) + (sale.finance_commission || 0) + (sale.insurance_commission || 0);
                  const payStyle = PAY[sale.payment_type] || { label: sale.payment_type, cls: "bg-[#F5F5F5] text-[#6B6B6B]" };
                  return (
                    <tr key={sale.id} className="border-b border-[#F8F8F8] last:border-0 hover:bg-[#FAFAFA] transition-colors group">
                      <td className="px-5 py-3.5">
                        <span className="text-[12px] font-bold text-[#FF4C00] font-mono">{sale.invoice_number}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[12px] text-[#6B6B6B] whitespace-nowrap">
                          {new Date(sale.sale_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#FF4C00]/8 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-[#FF4C00]">
                              {sale.customers?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
                            </span>
                          </div>
                          <div>
                            <p className="text-[12px] font-semibold text-[#0A0A0A] leading-tight">{sale.customers?.full_name || "—"}</p>
                            {sale.customers?.phone && <p className="text-[10px] text-[#ABABAB]">{sale.customers.phone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-[12px] font-semibold text-[#0A0A0A] leading-tight">{sale.inventory_bikes?.bike_models?.name || "—"}</p>
                        {sale.inventory_bikes?.round_number && (
                          <p className="text-[10px] text-[#FF4C00] font-mono">{sale.inventory_bikes.round_number}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${payStyle.cls}`}>{payStyle.label}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[13px] font-bold text-[#0A0A0A] whitespace-nowrap">Rs. {sale.total_amount.toLocaleString()}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {comm > 0 ? (
                          <div>
                            <span className="text-[12px] font-bold text-emerald-600">Rs. {comm.toLocaleString()}</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              {sale.tvs_commission > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#FF4C00]/10 text-[#FF4C00]">TVS</span>}
                              {sale.finance_commission > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">FIN</span>}
                              {sale.insurance_commission > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600">INS</span>}
                            </div>
                          </div>
                        ) : <span className="text-[#D0D0D0]">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <Link href={`/sales/invoices`} className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[11px] text-[#FF4C00] font-semibold transition-all">
                          Invoice <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Totals row */}
            {filtered.length > 0 && !loading && (
              <tfoot>
                <tr className="border-t-2 border-[#EBEBEB] bg-[#FAFAFA]">
                  <td colSpan={5} className="px-5 py-3.5">
                    <span className="text-[12px] font-bold text-[#0A0A0A]">Total ({filtered.length} sales)</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[14px] font-bold text-[#FF4C00]">Rs. {totalRevenue.toLocaleString()}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[13px] font-bold text-emerald-600">Rs. {totalComm.toLocaleString()}</span>
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
