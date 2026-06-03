"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  Download, TrendingUp, TrendingDown, DollarSign, ChevronLeft,
  ChevronRight, FileText, Receipt, BarChart2, Package,
  Wallet, ShoppingCart, Building2, Shield, CreditCard,
  Printer, FileSpreadsheet, Calendar, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  sumReceivedByCategory,
  type CommissionCategory,
} from "@/lib/finance/commission-records";
import { calcPotentialIncome } from "@/lib/finance/commission-records";

// ─── Types ───────────────────────────────────────────────────────
type ReportTab = "pl" | "sales" | "commission" | "expenses" | "inventory";

interface MonthlyRow {
  month: string; monthNum: number; revenue: number; expenses: number;
  profit: number; sales_count: number; margin: number;
  tvs_comm: number; finance_comm: number; insurance_comm: number;
}
interface SaleRow {
  id: string; invoice_number: string; customer: string; bike: string;
  payment_type: string; total_amount: number;
  received_income: number; pending_income: number;
  tvs_commission: number; finance_commission: number; insurance_commission: number;
  transport_charges: number; documentation_charges: number; other_earnings: number;
  sale_date: string;
}
interface ExpenseRow {
  id: string; category: string; description: string; amount: number; expense_date: string;
}
interface InventoryRow {
  model: string; available: number; sold: number; reserved: number;
  total: number; stockValue: number;
}

// ─── Helpers ─────────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmt = (n: number) => `Rs. ${n.toLocaleString("en", { maximumFractionDigits: 0 })}`;
const fmtK = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(0)}K` : `${n}`;

const EXP_CATS: Record<string, string> = {
  rent:"bg-purple-50 text-purple-700", utilities:"bg-blue-50 text-blue-700",
  salary:"bg-emerald-50 text-emerald-700", broker_commission:"bg-orange-50 text-orange-700",
  bonus:"bg-amber-50 text-amber-700", petty_cash:"bg-slate-100 text-slate-700",
  other:"bg-gray-100 text-gray-700",
};
const PAY_STYLES: Record<string, string> = {
  cash:"bg-emerald-50 text-emerald-700",
  finance:"bg-blue-50 text-blue-700",
  insurance:"bg-purple-50 text-purple-700",
};

// ─── Chart tooltip ───────────────────────────────────────────────
function CT({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur border border-[#EFEFEF] rounded-2xl px-4 py-3 shadow-xl text-xs">
      <p className="font-bold text-[#0A0A0A] mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[#6B6B6B] capitalize">{p.name}:</span>
          <span className="font-bold text-[#0A0A0A]">Rs. {Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Rounded bar ────────────────────────────────────────────────
function RBar(props: { x?: number; y?: number; width?: number; height?: number; fill?: string }) {
  const { x = 0, y = 0, width = 0, height = 0, fill } = props;
  if (!height || height <= 0) return null;
  const r = Math.min(5, width / 2);
  return <path d={`M${x},${y+height} L${x},${y+r} Q${x},${y} ${x+r},${y} L${x+width-r},${y} Q${x+width},${y} ${x+width},${y+r} L${x+width},${y+height} Z`} fill={fill} />;
}

// ─── Export CSV ──────────────────────────────────────────────────
function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename;
  a.click();
}

// ═══════════════════════════════════════════════════════════════
export default function ReportsPage() {
  const now = new Date();
  const [tab, setTab] = useState<ReportTab>("pl");
  const [year, setYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed
  const [viewMode, setViewMode] = useState<"monthly" | "yearly">("monthly");

  // Data state
  const [monthly, setMonthly] = useState<MonthlyRow[]>([]);
  const [salesRows, setSalesRows] = useState<SaleRow[]>([]);
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);
  const [inventoryRows, setInventoryRows] = useState<InventoryRow[]>([]);
  const [periodReceivedTotal, setPeriodReceivedTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const printRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const start = viewMode === "yearly"
      ? `${year}-01-01`
      : `${year}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
    const end = viewMode === "yearly"
      ? `${year + 1}-01-01`
      : selectedMonth === 11
        ? `${year + 1}-01-01`
        : `${year}-${String(selectedMonth + 2).padStart(2, "0")}-01`;

    const yearStart = `${year}-01-01`;
    const yearEnd = `${year + 1}-01-01`;

    const [salesR, expR, invR, yearCommR, periodCommR] = await Promise.all([
      supabase.from("sales")
        .select("id, invoice_number, sale_date, total_amount, payment_type, tvs_commission, finance_commission, insurance_commission, transport_charges, documentation_charges, other_earnings, customers(full_name), inventory_bikes(bike_models(name))")
        .eq("status", "completed").gte("sale_date", viewMode === "yearly" ? yearStart : start).lt("sale_date", viewMode === "yearly" ? yearEnd : end)
        .order("sale_date", { ascending: false }),
      supabase.from("expenses")
        .select("id, category, description, amount, expense_date")
        .gte("expense_date", viewMode === "yearly" ? yearStart : start).lt("expense_date", viewMode === "yearly" ? yearEnd : end)
        .order("expense_date", { ascending: false }),
      supabase.from("inventory_bikes").select("status, purchase_price, bike_models(name)"),
      supabase.from("commission_records")
        .select("sale_id, category, amount, status, received_at")
        .gte("received_at", yearStart).lt("received_at", yearEnd)
        .eq("status", "received"),
      supabase.from("commission_records")
        .select("amount")
        .eq("status", "received")
        .gte("received_at", viewMode === "yearly" ? yearStart : start)
        .lt("received_at", viewMode === "yearly" ? yearEnd : end),
    ]);

    const saleIds = (salesR.data || []).map((s: { id: string }) => s.id);
    let commBySale: Record<string, { received: number; pending: number; records: { category: CommissionCategory; amount: number; status: string }[] }> = {};
    if (saleIds.length) {
      const { data: saleComms } = await supabase
        .from("commission_records")
        .select("sale_id, category, amount, status")
        .in("sale_id", saleIds);
      for (const c of saleComms || []) {
        if (!commBySale[c.sale_id]) commBySale[c.sale_id] = { received: 0, pending: 0, records: [] };
        if (c.status === "received") commBySale[c.sale_id].received += Number(c.amount || 0);
        else commBySale[c.sale_id].pending += Number(c.amount || 0);
        commBySale[c.sale_id].records.push(c as { category: CommissionCategory; amount: number; status: string });
      }
    }

    const sRows: SaleRow[] = (salesR.data || []).map((s: Record<string, unknown>) => {
      const c = Array.isArray(s.customers) ? s.customers[0] : s.customers;
      const ib = Array.isArray(s.inventory_bikes) ? s.inventory_bikes[0] : s.inventory_bikes;
      const bm = ib ? (Array.isArray((ib as Record<string, unknown>).bike_models) ? (ib as Record<string, unknown[]>).bike_models[0] : (ib as Record<string, unknown>).bike_models) : null;
      const comm = commBySale[s.id as string] || { received: 0, pending: 0, records: [] };
      const tvs = comm.records.filter(r => r.category === "tvs" && r.status === "received").reduce((sum, r) => sum + r.amount, 0);
      const fin = comm.records.filter(r => r.category === "finance" && r.status === "received").reduce((sum, r) => sum + r.amount, 0);
      const ins = comm.records.filter(r => r.category === "insurance" && r.status === "received").reduce((sum, r) => sum + r.amount, 0);
      return {
        id: s.id as string,
        invoice_number: s.invoice_number as string,
        customer: (c as Record<string, string> | null)?.full_name || "—",
        bike: (bm as Record<string, string> | null)?.name || "—",
        payment_type: s.payment_type as string,
        total_amount: s.total_amount as number,
        received_income: comm.received,
        pending_income: comm.pending,
        tvs_commission: tvs,
        finance_commission: fin,
        insurance_commission: ins,
        transport_charges: 0,
        documentation_charges: 0,
        other_earnings: 0,
        sale_date: s.sale_date as string,
      };
    });
    setSalesRows(sRows);
    setPeriodReceivedTotal((periodCommR.data || []).reduce((s, c) => s + Number(c.amount || 0), 0));

    // Expense rows
    setExpenseRows((expR.data || []) as ExpenseRow[]);

    // Monthly breakdown (for yearly mode)
    const allSales = salesR.data || [];
    const allExp = expR.data || [];
    const yearReceived = yearCommR.data || [];
    const monthRows: MonthlyRow[] = MONTHS.map((m, i) => {
      const mStr = `${year}-${String(i + 1).padStart(2, "0")}`;
      const mStart = mStr + "-01";
      const mEnd = i === 11 ? `${year + 1}-01-01` : `${year}-${String(i + 2).padStart(2, "0")}-01`;
      const mr = yearReceived.filter((c) => (c.received_at as string) >= mStart && (c.received_at as string) < mEnd);
      const me = allExp.filter((e: Record<string, unknown>) => (e.expense_date as string)?.startsWith(mStr));
      const revenue = mr.reduce((s, c) => s + Number(c.amount || 0), 0);
      const byCat = sumReceivedByCategory(mr as { amount: number; status: "received"; category: CommissionCategory }[]);
      const expenses = me.reduce((s: number, r: Record<string, unknown>) => s + (r.amount as number), 0);
      const profit = revenue - expenses;
      const ms = allSales.filter((s: Record<string, unknown>) => (s.sale_date as string)?.startsWith(mStr));
      return {
        month: m, monthNum: i + 1, revenue, expenses, profit,
        sales_count: ms.length,
        margin: revenue > 0 ? (profit / revenue) * 100 : 0,
        tvs_comm: byCat.tvs,
        finance_comm: byCat.finance,
        insurance_comm: byCat.insurance,
      };
    });
    setMonthly(monthRows);

    // Inventory
    const inv = invR.data || [];
    const modelMap: Record<string, InventoryRow> = {};
    for (const b of inv) {
      const bm = Array.isArray(b.bike_models) ? b.bike_models[0] : b.bike_models;
      const name = (bm as Record<string, string> | null)?.name || "Unknown";
      if (!modelMap[name]) modelMap[name] = { model: name, available: 0, sold: 0, reserved: 0, total: 0, stockValue: 0 };
      modelMap[name].total++;
      if (b.status === "available") { modelMap[name].available++; modelMap[name].stockValue += b.purchase_price || 0; }
      else if (b.status === "sold") modelMap[name].sold++;
      else if (b.status === "reserved") modelMap[name].reserved++;
    }
    setInventoryRows(Object.values(modelMap).sort((a, b) => b.total - a.total));

    setLoading(false);
  }, [year, selectedMonth, viewMode]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Aggregates ────────────────────────────────────────────────
  const totalRev = viewMode === "yearly" ? monthly.reduce((s, m) => s + m.revenue, 0) : periodReceivedTotal;
  const totalVehicleValue = salesRows.reduce((s, r) => s + r.total_amount, 0);
  const totalExp = viewMode === "yearly" ? monthly.reduce((s, m) => s + m.expenses, 0) : expenseRows.reduce((s, r) => s + r.amount, 0);
  const totalProfit = totalRev - totalExp;
  const totalSales = viewMode === "yearly" ? monthly.reduce((s, m) => s + m.sales_count, 0) : salesRows.length;
  const totalTvs = salesRows.reduce((s, r) => s + r.tvs_commission, 0);
  const totalFin = salesRows.reduce((s, r) => s + r.finance_commission, 0);
  const totalIns = salesRows.reduce((s, r) => s + r.insurance_commission, 0);
  const totalComm = totalTvs + totalFin + totalIns;
  const totalCharges = salesRows.reduce((s, r) => s + r.transport_charges + r.documentation_charges + r.other_earnings, 0);
  const margin = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0;

  // Expense by category
  const expByCat: Record<string, number> = {};
  for (const e of expenseRows) expByCat[e.category] = (expByCat[e.category] || 0) + e.amount;
  const expCatData = Object.entries(expByCat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const PIE_COLORS = ["#FF4C00", "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EC4899", "#14B8A6"];

  const periodLabel = viewMode === "yearly" ? `${year}` : `${MONTHS[selectedMonth]} ${year}`;

  // ── Print ─────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  // ── Tabs ─────────────────────────────────────────────────────
  const TABS = [
    { id: "pl" as ReportTab, label: "P&L Summary", icon: BarChart2 },
    { id: "sales" as ReportTab, label: "Sales Report", icon: ShoppingCart },
    { id: "commission" as ReportTab, label: "Commission", icon: Receipt },
    { id: "expenses" as ReportTab, label: "Expenses", icon: Wallet },
    { id: "inventory" as ReportTab, label: "Inventory", icon: Package },
  ];

  return (
    <div className="space-y-5 max-w-[1400px] pb-8 print:space-y-4" ref={printRef}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Reports</h2>
          <p className="text-sm text-[#9A9A9A] mt-0.5">Financial intelligence for RIDERMO</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode */}
          <div className="flex items-center gap-1 bg-[#F5F5F5] rounded-xl p-1">
            {(["monthly", "yearly"] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`h-7 px-3 rounded-lg text-xs font-semibold transition-all ${viewMode === m ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#6B6B6B]"}`}>
                {m === "monthly" ? "Monthly" : "Yearly"}
              </button>
            ))}
          </div>
          {/* Month selector (only in monthly mode) */}
          {viewMode === "monthly" && (
            <div className="flex items-center gap-1 bg-white border border-[#EFEFEF] rounded-xl p-1">
              <button onClick={() => { if (selectedMonth > 0) setSelectedMonth(m => m - 1); else { setYear(y => y - 1); setSelectedMonth(11); }}}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5]">
                <ChevronLeft className="h-3.5 w-3.5 text-[#6B6B6B]" />
              </button>
              <span className="text-sm font-bold text-[#0A0A0A] w-24 text-center">{MONTHS[selectedMonth]} {year}</span>
              <button onClick={() => { if (selectedMonth < 11) setSelectedMonth(m => m + 1); else { setYear(y => y + 1); setSelectedMonth(0); }}}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5]">
                <ChevronRight className="h-3.5 w-3.5 text-[#6B6B6B]" />
              </button>
            </div>
          )}
          {/* Year selector */}
          <div className="flex items-center gap-1 bg-white border border-[#EFEFEF] rounded-xl p-1">
            <button onClick={() => setYear(y => y - 1)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5]"><ChevronLeft className="h-3.5 w-3.5 text-[#6B6B6B]" /></button>
            <span className="text-sm font-bold text-[#0A0A0A] w-10 text-center">{year}</span>
            <button onClick={() => setYear(y => y + 1)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5]"><ChevronRight className="h-3.5 w-3.5 text-[#6B6B6B]" /></button>
          </div>
          {/* Export */}
          <button onClick={handlePrint} className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#EFEFEF] bg-white text-xs font-semibold text-[#4A4A4A] hover:bg-[#F5F5F5] transition-colors">
            <Printer className="h-3.5 w-3.5" /> Print / PDF
          </button>
          <button
            onClick={() => {
              if (tab === "sales") exportCSV(salesRows.map(r => ({ Invoice: r.invoice_number, Date: r.sale_date, Customer: r.customer, Bike: r.bike, Payment: r.payment_type, "Vehicle Value": r.total_amount, "Received Income": r.received_income, Pending: r.pending_income, "TVS Comm": r.tvs_commission, "Finance Comm": r.finance_commission, "Insurance Comm": r.insurance_commission })), `sales-${periodLabel}.csv`);
              else if (tab === "expenses") exportCSV(expenseRows.map(r => ({ Date: r.expense_date, Category: r.category, Description: r.description, Amount: r.amount })), `expenses-${periodLabel}.csv`);
              else if (tab === "pl") exportCSV(monthly.map(m => ({ Month: m.month, Sales: m.sales_count, "Received Income": m.revenue, Expenses: m.expenses, Profit: m.profit, "Margin%": m.margin.toFixed(1) })), `pl-${year}.csv`);
              else if (tab === "inventory") exportCSV(inventoryRows.map(r => ({ Model: r.model, Available: r.available, Sold: r.sold, Reserved: r.reserved, Total: r.total, "Stock Value": r.stockValue })), `inventory-${periodLabel}.csv`);
            }}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#FF4C00] text-white text-xs font-semibold hover:bg-[#E04400] transition-colors shadow-[0_4px_12px_rgba(255,76,0,0.25)]">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Received Income", value: fmt(totalRev), sub: `${totalSales} sales · recognized revenue`, icon: TrendingUp, accent: true, up: totalRev > 0 },
          { label: "Expenses", value: fmt(totalExp), sub: "Total outflows", icon: Wallet, accent: false, up: false },
          { label: "Net Profit", value: fmt(Math.abs(totalProfit)), sub: totalProfit >= 0 ? "Profitable" : "Net Loss", icon: totalProfit >= 0 ? ArrowUpRight : ArrowDownRight, accent: false, up: totalProfit >= 0 },
          { label: "Margin", value: `${margin.toFixed(1)}%`, sub: "Profit margin", icon: BarChart2, accent: false, up: margin > 20 },
          { label: "Commissions", value: fmt(totalComm), sub: totalCharges > 0 ? `+ ${fmt(totalCharges)} charges` : "TVS + Finance + Ins.", icon: Receipt, accent: false, up: totalComm > 0 },
        ].map(({ label, value, sub, icon: Icon, accent, up }) => (
          <div key={label} className={`bg-white rounded-xl px-4 py-3 border flex items-center justify-between gap-3 hover:border-[#D0D0D0] transition-colors ${accent ? "border-[#FF4C00]/20" : "border-[#E8E8E8]"}`}>
            <div>
              <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-wide">{label}</p>
              <p className={`text-xl font-bold tabular-nums mt-0.5 leading-tight ${accent ? "text-[#FF4C00]" : label === "Net Profit" && !up ? "text-red-500" : "text-[#0A0A0A]"}`}
                style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{value}</p>
              <p className="text-[10px] text-[#ABABAB]">{sub}</p>
            </div>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accent ? "bg-[#FF4C00]" : up ? "bg-emerald-50" : "bg-[#F5F5F5]"}`}>
              <Icon className={`h-4 w-4 ${accent ? "text-white" : up ? "text-emerald-600" : "text-[#9A9A9A]"}`} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Period label ── */}
      <div className="flex items-center gap-2">
        <Calendar className="h-3.5 w-3.5 text-[#9A9A9A]" />
        <span className="text-xs text-[#9A9A9A] font-medium">Showing data for: <strong className="text-[#0A0A0A]">{periodLabel}</strong></span>
        {loading && <span className="text-xs text-[#FF4C00] animate-pulse font-semibold ml-2">Loading…</span>}
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 bg-[#F5F5F5] rounded-xl p-1 w-fit print:hidden overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${tab === t.id ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#6B6B6B] hover:text-[#0A0A0A]"}`}>
            <t.icon className="h-3.5 w-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB: P&L Summary                                        */}
      {/* ════════════════════════════════════════════════════════ */}
      {tab === "pl" && (
        <div className="space-y-5">
          {/* Full-width Revenue vs Expenses chart */}
          <div className="bg-white border border-[#E8E8E8] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[13px] font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Dealership Income vs Expenses — {year}</h3>
                <p className="text-[11px] text-[#ABABAB] mt-0.5">Monthly comparison across all 12 months</p>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-[#ABABAB]">
                {[{ c: "#FF4C00", l: "Income" }, { c: "#D0D0D0", l: "Expenses" }].map(x => (
                  <div key={x.l} className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded" style={{ background: x.c }} /><span>{x.l}</span></div>
                ))}
              </div>
            </div>
            {loading ? <div className="h-64 bg-[#F8F8F8] rounded-xl animate-pulse" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthly} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF4C00" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#FF4C00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#F0F0F0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#ABABAB" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#ABABAB" }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                  <Tooltip content={<CT />} />
                  <Area type="monotone" dataKey="revenue" name="Income" stroke="#FF4C00" strokeWidth={2.5} fill="url(#gRev)" dot={false} />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#D0D0D0" strokeWidth={1.5} fill="none" strokeDasharray="4 2" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Full-width Profit bar chart */}
          <div className="bg-white border border-[#E8E8E8] rounded-2xl p-6">
            <div className="mb-5">
              <h3 className="text-[13px] font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Monthly Profit — {year}</h3>
              <p className="text-[11px] text-[#ABABAB] mt-0.5">Net profit after expenses</p>
            </div>
            {loading ? <div className="h-64 bg-[#F8F8F8] rounded-xl animate-pulse" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthly} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
                  <CartesianGrid stroke="#F0F0F0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#ABABAB" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#ABABAB" }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                  <Tooltip content={<CT />} />
                  <Bar dataKey="profit" name="Profit" shape={<RBar />} fill="#10B981" maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Monthly table */}
          <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F5F5F5] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Monthly P&L Breakdown — {year}</h3>
              <div className="flex items-center gap-4 text-xs text-[#9A9A9A]">
                <span>Total Income: <strong className="text-[#0A0A0A]">{fmt(totalRev)}</strong></span>
                <span>Total Profit: <strong className={totalProfit >= 0 ? "text-emerald-600" : "text-red-500"}>{fmt(totalProfit)}</strong></span>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F5F5F5]">
                  {["Month", "Sales", "Received Income", "Expenses", "Profit / Loss", "Margin", "TVS Comm", "Finance Comm", "Insurance Comm"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthly.map((m, i) => {
                  const isCurrent = i + 1 === now.getMonth() + 1 && year === now.getFullYear();
                  return (
                    <tr key={m.month} className={`border-b border-[#F8F8F8] hover:bg-[#FAFAFA] transition-colors ${isCurrent ? "bg-[#FF4C00]/3" : ""}`}>
                      <td className="px-5 py-3.5">
                        <span className={`text-sm font-bold ${isCurrent ? "text-[#FF4C00]" : "text-[#0A0A0A]"}`}>{m.month}</span>
                        {isCurrent && <span className="ml-2 text-[9px] font-bold bg-[#FF4C00] text-white px-1.5 py-0.5 rounded-full">NOW</span>}
                      </td>
                      <td className="px-5 py-3.5"><span className="text-sm text-[#4A4A4A]">{m.sales_count}</span></td>
                      <td className="px-5 py-3.5"><span className="text-sm font-semibold text-[#0A0A0A]">{m.revenue > 0 ? fmt(m.revenue) : "—"}</span></td>
                      <td className="px-5 py-3.5"><span className="text-sm text-[#6B6B6B]">{m.expenses > 0 ? fmt(m.expenses) : "—"}</span></td>
                      <td className="px-5 py-3.5">
                        <span className={`text-sm font-bold flex items-center gap-1 ${m.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {m.profit >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {m.revenue > 0 ? fmt(Math.abs(m.profit)) : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {m.revenue > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${m.margin >= 0 ? "bg-emerald-400" : "bg-red-400"}`} style={{ width: `${Math.min(100, Math.abs(m.margin))}%` }} />
                            </div>
                            <span className={`text-xs font-semibold ${m.margin >= 0 ? "text-emerald-600" : "text-red-500"}`}>{m.margin.toFixed(1)}%</span>
                          </div>
                        ) : <span className="text-[#DADADA] text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3.5"><span className="text-xs text-[#6B6B6B]">{m.tvs_comm > 0 ? fmt(m.tvs_comm) : "—"}</span></td>
                      <td className="px-5 py-3.5"><span className="text-xs text-[#6B6B6B]">{m.finance_comm > 0 ? fmt(m.finance_comm) : "—"}</span></td>
                      <td className="px-5 py-3.5"><span className="text-xs text-[#6B6B6B]">{m.insurance_comm > 0 ? fmt(m.insurance_comm) : "—"}</span></td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr className="bg-[#FAFAFA] border-t-2 border-[#EFEFEF]">
                  <td className="px-5 py-3.5"><span className="text-sm font-bold text-[#0A0A0A]">Total</span></td>
                  <td className="px-5 py-3.5"><span className="text-sm font-bold text-[#0A0A0A]">{totalSales}</span></td>
                  <td className="px-5 py-3.5"><span className="text-sm font-bold text-[#FF4C00]">{fmt(totalRev)}</span></td>
                  <td className="px-5 py-3.5"><span className="text-sm font-bold text-[#0A0A0A]">{fmt(totalExp)}</span></td>
                  <td className="px-5 py-3.5"><span className={`text-sm font-bold ${totalProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmt(Math.abs(totalProfit))}</span></td>
                  <td className="px-5 py-3.5"><span className={`text-sm font-bold ${margin >= 0 ? "text-emerald-600" : "text-red-500"}`}>{margin.toFixed(1)}%</span></td>
                  <td className="px-5 py-3.5"><span className="text-xs font-bold text-[#0A0A0A]">{fmt(monthly.reduce((s,m)=>s+m.tvs_comm,0))}</span></td>
                  <td className="px-5 py-3.5"><span className="text-xs font-bold text-[#0A0A0A]">{fmt(monthly.reduce((s,m)=>s+m.finance_comm,0))}</span></td>
                  <td className="px-5 py-3.5"><span className="text-xs font-bold text-[#0A0A0A]">{fmt(monthly.reduce((s,m)=>s+m.insurance_comm,0))}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB: Sales Report                                       */}
      {/* ════════════════════════════════════════════════════════ */}
      {tab === "sales" && (
        <div className="space-y-5">
          {/* Payment split */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Cash Sales", count: salesRows.filter(s=>s.payment_type==="cash").length, total: salesRows.filter(s=>s.payment_type==="cash").reduce((s,r)=>s+r.received_income,0), color: "bg-emerald-50", text: "text-emerald-700" },
              { label: "Finance Sales", count: salesRows.filter(s=>s.payment_type==="finance").length, total: salesRows.filter(s=>s.payment_type==="finance").reduce((s,r)=>s+r.received_income,0), color: "bg-blue-50", text: "text-blue-700" },
              { label: "Insurance Sales", count: salesRows.filter(s=>s.payment_type==="insurance").length, total: salesRows.filter(s=>s.payment_type==="insurance").reduce((s,r)=>s+r.received_income,0), color: "bg-purple-50", text: "text-purple-700" },
            ].map(({ label, count, total, color, text }) => (
              <div key={label} className={`${color} rounded-xl px-4 py-3 flex items-center justify-between gap-3`}>
                <div>
                  <p className={`text-[11px] font-bold uppercase tracking-wider ${text}`}>{label}</p>
                  <p className={`text-xl font-bold tabular-nums mt-0.5 ${text}`} style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{count}</p>
                  <p className={`text-[11px] font-semibold ${text}`}>{fmt(total)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Sales table */}
          <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F5F5F5] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Sales — {periodLabel}</h3>
              <span className="text-xs text-[#9A9A9A] font-medium">{salesRows.length} records · {fmt(totalRev)} received · {fmt(salesRows.reduce((s,r)=>s+r.pending_income,0))} pending</span>
            </div>
            {loading ? <div className="p-6"><div className="h-48 bg-[#F5F5F5] rounded-xl animate-pulse" /></div> :
            salesRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#ABABAB]">
                <ShoppingCart className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm font-medium">No sales in this period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#F5F5F5]">
                      {["Date", "Invoice", "Customer", "Bike", "Payment", "Vehicle Value", "Received", "Pending", "TVS Comm", "Finance Comm", "Ins. Comm"].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {salesRows.map(s => (
                      <tr key={s.id} className="border-b border-[#F8F8F8] hover:bg-[#FAFAFA] transition-colors">
                        <td className="px-5 py-3"><span className="text-xs text-[#6B6B6B]">{new Date(s.sale_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span></td>
                        <td className="px-5 py-3"><span className="text-xs font-mono font-bold text-[#FF4C00]">{s.invoice_number}</span></td>
                        <td className="px-5 py-3"><span className="text-sm font-semibold text-[#0A0A0A]">{s.customer}</span></td>
                        <td className="px-5 py-3"><span className="text-sm text-[#4A4A4A]">{s.bike}</span></td>
                        <td className="px-5 py-3"><span className={`text-[10px] font-bold px-2 py-1 rounded-full ${PAY_STYLES[s.payment_type] || "bg-[#F5F5F5] text-[#6B6B6B]"}`}>{s.payment_type}</span></td>
                        <td className="px-5 py-3"><span className="text-sm text-[#6B6B6B]">{fmt(s.total_amount)}</span></td>
                        <td className="px-5 py-3"><span className="text-sm font-bold text-emerald-600">{s.received_income > 0 ? fmt(s.received_income) : "—"}</span></td>
                        <td className="px-5 py-3"><span className="text-sm font-semibold text-amber-600">{s.pending_income > 0 ? fmt(s.pending_income) : "—"}</span></td>
                        <td className="px-5 py-3"><span className="text-xs text-[#6B6B6B]">{s.tvs_commission > 0 ? fmt(s.tvs_commission) : "—"}</span></td>
                        <td className="px-5 py-3"><span className="text-xs text-[#6B6B6B]">{s.finance_commission > 0 ? fmt(s.finance_commission) : "—"}</span></td>
                        <td className="px-5 py-3"><span className="text-xs text-[#6B6B6B]">{s.insurance_commission > 0 ? fmt(s.insurance_commission) : "—"}</span></td>
                      </tr>
                    ))}
                    <tr className="bg-[#FAFAFA] border-t-2 border-[#EFEFEF]">
                      <td colSpan={5} className="px-5 py-3"><span className="text-sm font-bold text-[#0A0A0A]">Total ({salesRows.length} sales)</span></td>
                      <td className="px-5 py-3"><span className="text-sm font-semibold text-[#6B6B6B]">{fmt(totalVehicleValue)}</span></td>
                      <td className="px-5 py-3"><span className="text-sm font-bold text-emerald-600">{fmt(totalRev)}</span></td>
                      <td className="px-5 py-3"><span className="text-sm font-bold text-amber-600">{fmt(salesRows.reduce((s,r)=>s+r.pending_income,0))}</span></td>
                      <td className="px-5 py-3"><span className="text-xs font-bold text-[#0A0A0A]">{fmt(totalTvs)}</span></td>
                      <td className="px-5 py-3"><span className="text-xs font-bold text-[#0A0A0A]">{fmt(totalFin)}</span></td>
                      <td className="px-5 py-3"><span className="text-xs font-bold text-[#0A0A0A]">{fmt(totalIns)}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB: Commission                                         */}
      {/* ════════════════════════════════════════════════════════ */}
      {tab === "commission" && (
        <div className="space-y-5">
          <div className="space-y-5">
            {/* Full-width Commission chart */}
            <div className="bg-white border border-[#E8E8E8] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-[13px] font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Commission by Month — {year}</h3>
                  <p className="text-[11px] text-[#ABABAB] mt-0.5">TVS · Finance · Insurance stacked</p>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-[#ABABAB]">
                  {[{ c: "#FF4C00", l: "TVS" }, { c: "#3B82F6", l: "Finance" }, { c: "#8B5CF6", l: "Insurance" }].map(x => (
                    <div key={x.l} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: x.c }} /><span>{x.l}</span></div>
                  ))}
                </div>
              </div>
              {loading ? <div className="h-64 bg-[#F8F8F8] rounded-xl animate-pulse" /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthly} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
                    <CartesianGrid stroke="#F0F0F0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#ABABAB" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#ABABAB" }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                    <Tooltip content={<CT />} />
                    <Bar dataKey="tvs_comm" name="TVS" stackId="a" fill="#FF4C00" maxBarSize={40} />
                    <Bar dataKey="finance_comm" name="Finance" stackId="a" fill="#3B82F6" maxBarSize={40} />
                    <Bar dataKey="insurance_comm" name="Insurance" stackId="a" fill="#8B5CF6" maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Commission breakdown side by side */}
            <div className="bg-white border border-[#E8E8E8] rounded-2xl p-6">
              <h3 className="text-sm font-bold text-[#0A0A0A] mb-4" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Commission Split — {periodLabel}</h3>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={[
                      { name: "TVS", value: totalTvs || 1 },
                      { name: "Finance", value: totalFin || 1 },
                      { name: "Insurance", value: totalIns || 1 },
                    ]} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" strokeWidth={0} paddingAngle={4}>
                      {["#FF4C00","#3B82F6","#8B5CF6"].map((c,i) => <Cell key={i} fill={c} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`Rs. ${Number(v).toLocaleString()}`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-4">
                  {[
                    { label: "TVS Commission", value: totalTvs, color: "#FF4C00", icon: Receipt },
                    { label: "Finance Commission", value: totalFin, color: "#3B82F6", icon: Building2 },
                    { label: "Insurance Commission", value: totalIns, color: "#8B5CF6", icon: Shield },
                  ].map(({ label, value, color, icon: Icon }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                          <span className="text-xs text-[#6B6B6B]">{label}</span>
                        </div>
                        <span className="text-sm font-bold text-[#0A0A0A]">{fmt(value)}</span>
                      </div>
                      <div className="h-1.5 bg-[#F5F5F5] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ background: color, width: `${totalComm > 0 ? (value / totalComm) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-[#F5F5F5]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0A0A0A]">Total</span>
                      <span className="text-sm font-bold text-[#FF4C00]">{fmt(totalComm)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Commission per sale table */}
          <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F5F5F5]">
              <h3 className="text-sm font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Commission Per Sale — {periodLabel}</h3>
            </div>
            {loading ? <div className="p-6"><div className="h-32 bg-[#F5F5F5] rounded-xl animate-pulse" /></div> :
            salesRows.filter(s => s.tvs_commission + s.finance_commission + s.insurance_commission > 0).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[#ABABAB]">
                <Receipt className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm font-medium">No commission data for this period</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#F5F5F5]">
                    {["Date","Invoice","Customer","Bike","TVS Comm","Finance Comm","Ins. Comm","Total"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {salesRows.filter(s => s.tvs_commission + s.finance_commission + s.insurance_commission > 0).map(s => (
                    <tr key={s.id} className="border-b border-[#F8F8F8] hover:bg-[#FAFAFA]">
                      <td className="px-5 py-3"><span className="text-xs text-[#6B6B6B]">{new Date(s.sale_date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</span></td>
                      <td className="px-5 py-3"><span className="text-xs font-mono font-bold text-[#FF4C00]">{s.invoice_number}</span></td>
                      <td className="px-5 py-3"><span className="text-sm text-[#0A0A0A]">{s.customer}</span></td>
                      <td className="px-5 py-3"><span className="text-xs text-[#6B6B6B]">{s.bike}</span></td>
                      <td className="px-5 py-3"><span className="text-sm font-semibold text-[#FF4C00]">{s.tvs_commission > 0 ? fmt(s.tvs_commission) : "—"}</span></td>
                      <td className="px-5 py-3"><span className="text-sm font-semibold text-blue-600">{s.finance_commission > 0 ? fmt(s.finance_commission) : "—"}</span></td>
                      <td className="px-5 py-3"><span className="text-sm font-semibold text-purple-600">{s.insurance_commission > 0 ? fmt(s.insurance_commission) : "—"}</span></td>
                      <td className="px-5 py-3"><span className="text-sm font-bold text-[#0A0A0A]">{fmt(s.tvs_commission + s.finance_commission + s.insurance_commission)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB: Expenses                                           */}
      {/* ════════════════════════════════════════════════════════ */}
      {tab === "expenses" && (
        <div className="space-y-5">
          <div className="space-y-5">
            {/* Full-width Monthly Expenses bar */}
            <div className="bg-white border border-[#E8E8E8] rounded-2xl p-6">
              <div className="mb-5">
                <h3 className="text-[13px] font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Monthly Expenses — {year}</h3>
                <p className="text-[11px] text-[#ABABAB] mt-0.5">Total outflows by month</p>
              </div>
              {loading ? <div className="h-64 bg-[#F8F8F8] rounded-xl animate-pulse" /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthly} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
                    <CartesianGrid stroke="#F0F0F0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#ABABAB" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#ABABAB" }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                    <Tooltip content={<CT />} />
                    <Bar dataKey="expenses" name="Expenses" fill="#6B7280" shape={<RBar />} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Expense breakdown */}
            {expCatData.length > 0 && (
              <div className="bg-white border border-[#E8E8E8] rounded-2xl p-6">
                <div className="mb-5">
                  <h3 className="text-[13px] font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Expense Breakdown — {periodLabel}</h3>
                  <p className="text-[11px] text-[#ABABAB] mt-0.5">By category</p>
                </div>
                <div className="flex items-center gap-8">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie data={expCatData} cx="50%" cy="50%" innerRadius={55} outerRadius={88} dataKey="value" strokeWidth={0} paddingAngle={3}>
                        {expCatData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [`Rs. ${Number(v).toLocaleString()}`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    {expCatData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2.5 p-3 bg-[#FAFAFA] rounded-xl">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-[#6B6B6B] capitalize leading-tight">{d.name.replace(/_/g," ")}</p>
                          <p className="text-[13px] font-bold text-[#0A0A0A]">Rs. {d.value.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Expenses table */}
          <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F5F5F5] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Expenses — {periodLabel}</h3>
              <span className="text-xs text-[#9A9A9A]">{expenseRows.length} records · {fmt(totalExp)}</span>
            </div>
            {loading ? <div className="p-6"><div className="h-32 bg-[#F5F5F5] rounded-xl animate-pulse" /></div> :
            expenseRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[#ABABAB]">
                <Wallet className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm font-medium">No expenses in this period</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#F5F5F5]">
                    {["Date","Category","Description","Amount"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expenseRows.map(e => (
                    <tr key={e.id} className="border-b border-[#F8F8F8] hover:bg-[#FAFAFA]">
                      <td className="px-5 py-3"><span className="text-xs text-[#6B6B6B]">{new Date(e.expense_date).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</span></td>
                      <td className="px-5 py-3"><span className={`text-[10px] font-bold px-2 py-1 rounded-full capitalize ${EXP_CATS[e.category]||"bg-gray-100 text-gray-700"}`}>{e.category.replace("_"," ")}</span></td>
                      <td className="px-5 py-3"><span className="text-sm text-[#0A0A0A]">{e.description}</span></td>
                      <td className="px-5 py-3"><span className="text-sm font-bold text-[#0A0A0A]">{fmt(e.amount)}</span></td>
                    </tr>
                  ))}
                  <tr className="bg-[#FAFAFA] border-t-2 border-[#EFEFEF]">
                    <td colSpan={3} className="px-5 py-3"><span className="text-sm font-bold text-[#0A0A0A]">Total</span></td>
                    <td className="px-5 py-3"><span className="text-sm font-bold text-[#FF4C00]">{fmt(totalExp)}</span></td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB: Inventory                                          */}
      {/* ════════════════════════════════════════════════════════ */}
      {tab === "inventory" && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Stock", value: inventoryRows.reduce((s,r)=>s+r.total,0), sub: "All models combined" },
              { label: "Available", value: inventoryRows.reduce((s,r)=>s+r.available,0), sub: "Ready for sale" },
              { label: "Total Stock Value", value: fmt(inventoryRows.reduce((s,r)=>s+r.stockValue,0)), sub: "Available units" },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-white rounded-xl border border-[#E8E8E8] px-4 py-3 flex items-center justify-between gap-3 hover:border-[#D0D0D0] transition-colors">
                <div>
                  <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-wide">{label}</p>
                  <p className="text-xl font-bold tabular-nums mt-0.5 text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{value}</p>
                  <p className="text-[10px] text-[#ABABAB]">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stacked bar by model */}
          <div className="bg-white rounded-2xl p-6 border border-[#E8E8E8]">
            <h3 className="text-sm font-bold text-[#0A0A0A] mb-4" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Stock by Model</h3>
            {loading ? <div className="h-52 bg-[#F5F5F5] rounded-xl animate-pulse" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={inventoryRows} layout="vertical" margin={{ top: 0, right: 30, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#ABABAB" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="model" tick={{ fontSize: 11, fill: "#4A4A4A" }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="available" name="Available" stackId="a" fill="#10B981" />
                  <Bar dataKey="sold" name="Sold" stackId="a" fill="#FF4C00" />
                  <Bar dataKey="reserved" name="Reserved" stackId="a" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Inventory table */}
          <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F5F5F5]">
              <h3 className="text-sm font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Inventory by Model</h3>
            </div>
            {loading ? <div className="p-6"><div className="h-32 bg-[#F5F5F5] rounded-xl animate-pulse" /></div> : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#F5F5F5]">
                    {["Model","Total","Available","Sold","Reserved","Stock Value","Health"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inventoryRows.map(r => {
                    const pct = r.total > 0 ? (r.available / r.total) * 100 : 0;
                    const health = pct > 60 ? "good" : pct > 30 ? "medium" : "low";
                    return (
                      <tr key={r.model} className="border-b border-[#F8F8F8] hover:bg-[#FAFAFA]">
                        <td className="px-5 py-3.5"><span className="text-sm font-bold text-[#0A0A0A]">{r.model}</span></td>
                        <td className="px-5 py-3.5"><span className="text-sm text-[#4A4A4A]">{r.total}</span></td>
                        <td className="px-5 py-3.5"><span className="text-sm font-bold text-emerald-600">{r.available}</span></td>
                        <td className="px-5 py-3.5"><span className="text-sm text-[#6B6B6B]">{r.sold}</span></td>
                        <td className="px-5 py-3.5"><span className="text-sm text-amber-600">{r.reserved}</span></td>
                        <td className="px-5 py-3.5"><span className="text-sm font-semibold text-[#0A0A0A]">{fmt(r.stockValue)}</span></td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${health === "good" ? "bg-emerald-400" : health === "medium" ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${Math.max(pct, 3)}%` }} />
                            </div>
                            <span className={`text-xs font-bold ${health === "good" ? "text-emerald-600" : health === "medium" ? "text-amber-600" : "text-red-500"}`}>{Math.round(pct)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-[#FAFAFA] border-t-2 border-[#EFEFEF]">
                    <td className="px-5 py-3"><span className="text-sm font-bold text-[#0A0A0A]">Total</span></td>
                    <td className="px-5 py-3"><span className="text-sm font-bold">{inventoryRows.reduce((s,r)=>s+r.total,0)}</span></td>
                    <td className="px-5 py-3"><span className="text-sm font-bold text-emerald-600">{inventoryRows.reduce((s,r)=>s+r.available,0)}</span></td>
                    <td className="px-5 py-3"><span className="text-sm font-bold">{inventoryRows.reduce((s,r)=>s+r.sold,0)}</span></td>
                    <td className="px-5 py-3"><span className="text-sm font-bold text-amber-600">{inventoryRows.reduce((s,r)=>s+r.reserved,0)}</span></td>
                    <td className="px-5 py-3"><span className="text-sm font-bold text-[#FF4C00]">{fmt(inventoryRows.reduce((s,r)=>s+r.stockValue,0))}</span></td>
                    <td className="px-5 py-3" />
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          nav, aside { display: none !important; }
        }
      `}</style>
    </div>
  );
}
