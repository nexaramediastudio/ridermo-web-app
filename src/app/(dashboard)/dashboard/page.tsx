"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  CreditCard, FileCheck, Hash, Package, UserCheck,
  ArrowRight, Bike, Receipt, Building2, Shield,
  Calendar, Zap, Bell, ChevronRight, ArrowUpRight, ArrowDownRight,
  Wallet,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────
interface DashData {
  todaySales: number; todayCount: number;
  monthRevenue: number; monthCount: number;
  monthExpenses: number; stockValue: number;
  pendingCR: number; pendingPlates: number;
  pendingCheques: number; pendingChequeAmount: number;
  tvsCommission: number; financeCommission: number; insuranceCommission: number;
  prevTvs: number; prevFinance: number; prevInsurance: number;
  presentToday: number; absentToday: number; leaveToday: number; totalEmployees: number;
  recentSales: { id: string; invoice_number: string; customer_name: string; bike_model: string; total_amount: number; payment_type: string; sale_date: string }[];
  inventoryByModel: { model: string; available: number; sold: number; reserved: number; total: number }[];
  revenueSeries: { label: string; revenue: number; expenses: number; profit: number }[];
  monthlySales: { month: string; sales: number }[];
  salesDist: { name: string; value: number; color: string }[];
  reminders: { id: string; type: string; label: string; date: string; amount?: number }[];
  userName: string;
}

// ─── Utils ────────────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}
function fmtFull(n: number) { return `Rs. ${n.toLocaleString("en", { maximumFractionDigits: 0 })}`; }

// ─── Tooltip ──────────────────────────────────────────────────────
function CT({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-xl px-3 py-2.5 text-xs">
      <p className="font-bold text-[#0A0A0A] mb-1.5">{label}</p>
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

// ─── Rounded bar ──────────────────────────────────────────────────
function RBar(props: { x?: number; y?: number; width?: number; height?: number; fill?: string }) {
  const { x = 0, y = 0, width = 0, height = 0, fill } = props;
  if (!height || height <= 0) return null;
  const r = Math.min(5, width / 2);
  return <path d={`M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`} fill={fill} />;
}

// ─── KPI Card ─────────────────────────────────────────────────────
function KPI({ label, value, sub, trend, color, icon: Icon }: {
  label: string; value: string; sub?: string;
  trend?: { v: string; up: boolean } | null;
  color: string; icon: React.ElementType;
}) {
  return (
    <div className="bg-white border border-[#E8E8E8] rounded-2xl p-5 hover:border-[#D0D0D0] transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg ${trend.up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
            {trend.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {trend.v}
          </span>
        )}
      </div>
      <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-[28px] font-bold text-[#0A0A0A] leading-none tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{value}</p>
      {sub && <p className="text-xs text-[#ABABAB] mt-1.5">{sub}</p>}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────
function SH({ title, sub, href, action }: { title: string; sub?: string; href?: string; action?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-[13px] font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{title}</h3>
        {sub && <p className="text-[11px] text-[#ABABAB] mt-0.5">{sub}</p>}
      </div>
      {href && action && (
        <Link href={href} className="flex items-center gap-1 text-[11px] font-semibold text-[#FF4C00] hover:underline">
          {action} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [revRange, setRevRange] = useState<"7d" | "30d">("30d");

  const load = useCallback(async () => {
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startPrev = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-01`;
    const endPrev = startOfMonth;
    const in7 = new Date(); in7.setDate(in7.getDate() + 7);
    const in7Str = in7.toISOString().split("T")[0];

    const [todayR, monthR, prevR, expR, invR, crR, plR, chqR, attR, recentR, profR] = await Promise.all([
      supabase.from("sales").select("total_amount").eq("status", "completed").gte("sale_date", today),
      supabase.from("sales").select("total_amount, tvs_commission, finance_commission, insurance_commission, payment_type, sale_date").eq("status", "completed").gte("sale_date", startOfMonth),
      supabase.from("sales").select("total_amount, tvs_commission, finance_commission, insurance_commission").eq("status", "completed").gte("sale_date", startPrev).lt("sale_date", endPrev),
      supabase.from("expenses").select("amount, expense_date").gte("expense_date", startOfMonth),
      supabase.from("inventory_bikes").select("status, purchase_price, bike_models(name)"),
      supabase.from("cr_plates").select("id").eq("cr_status", "pending"),
      supabase.from("cr_plates").select("id").eq("plate_status", "pending"),
      supabase.from("cheques").select("id, cheque_number, amount, payment_date, pay_to, type").eq("status", "pending").lte("payment_date", in7Str),
      supabase.from("attendance").select("status").eq("date", today),
      supabase.from("sales").select("id, invoice_number, customers(full_name), inventory_bikes(bike_models(name)), total_amount, payment_type, status, sale_date").eq("status", "completed").order("created_at", { ascending: false }).limit(7),
      supabase.from("profiles").select("full_name").limit(1).single(),
    ]);

    const todayArr = todayR.data || [];
    const monthArr = monthR.data || [];
    const prevArr = prevR.data || [];
    const expArr = expR.data || [];
    const invArr = invR.data || [];
    const attArr = attR.data || [];
    const chqArr = chqR.data || [];

    const todaySales = todayArr.reduce((s, r) => s + r.total_amount, 0);
    const monthRevenue = monthArr.reduce((s, r) => s + r.total_amount, 0);
    const monthExpenses = expArr.reduce((s, r) => s + r.amount, 0);
    const tvsComm = monthArr.reduce((s, r) => s + (r.tvs_commission || 0), 0);
    const finComm = monthArr.reduce((s, r) => s + (r.finance_commission || 0), 0);
    const insComm = monthArr.reduce((s, r) => s + (r.insurance_commission || 0), 0);
    const stockValue = invArr.filter(b => b.status === "available").reduce((s, b) => s + (b.purchase_price || 0), 0);

    // Revenue series
    const salesByDate: Record<string, number> = {};
    const expByDate: Record<string, number> = {};
    for (const s of monthArr) { const d = s.sale_date?.split("T")[0] || today; salesByDate[d] = (salesByDate[d] || 0) + s.total_amount; }
    for (const e of expArr) { const d = e.expense_date?.split("T")[0] || today; expByDate[d] = (expByDate[d] || 0) + e.amount; }
    const revenueSeries: DashData["revenueSeries"] = [];
    const d = new Date(startOfMonth);
    while (d <= now) {
      const k = d.toISOString().split("T")[0];
      const rev = salesByDate[k] || 0, exp = expByDate[k] || 0;
      revenueSeries.push({ label: `${d.getDate()} ${d.toLocaleString("en", { month: "short" })}`, revenue: rev, expenses: exp, profit: rev - exp });
      d.setDate(d.getDate() + 1);
    }

    // Monthly
    const monthlySales: DashData["monthlySales"] = [];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ms = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
      monthlySales.push({ month: m.toLocaleString("en", { month: "short" }), sales: monthArr.filter(x => x.sale_date?.startsWith(ms)).reduce((s, r) => s + r.total_amount, 0) });
    }

    // Inventory by model
    const modelMap: Record<string, { model: string; available: number; sold: number; reserved: number; total: number }> = {};
    for (const b of invArr) {
      const bm = Array.isArray(b.bike_models) ? b.bike_models[0] : b.bike_models;
      const name = (bm as { name?: string } | null)?.name || "Unknown";
      if (!modelMap[name]) modelMap[name] = { model: name, available: 0, sold: 0, reserved: 0, total: 0 };
      modelMap[name].total++;
      if (b.status === "available") modelMap[name].available++;
      else if (b.status === "sold") modelMap[name].sold++;
      else if (b.status === "reserved") modelMap[name].reserved++;
    }

    const cashTotal = monthArr.filter(s => s.payment_type === "cash").reduce((s, r) => s + r.total_amount, 0);
    const finTotal = monthArr.filter(s => s.payment_type === "finance").reduce((s, r) => s + r.total_amount, 0);
    const insTotal = monthArr.filter(s => s.payment_type === "insurance").reduce((s, r) => s + r.total_amount, 0);
    const salesDist = [
      { name: "Cash", value: cashTotal, color: "#FF4C00" },
      { name: "Finance", value: finTotal, color: "#3B82F6" },
      { name: "Insurance", value: insTotal, color: "#8B5CF6" },
    ].filter(d => d.value > 0);
    if (!salesDist.length) salesDist.push({ name: "No Sales", value: 1, color: "#E5E5E5" });

    const recentSales = (recentR.data || []).map((s: Record<string, unknown>) => {
      const c = Array.isArray(s.customers) ? s.customers[0] : s.customers;
      const ib = Array.isArray(s.inventory_bikes) ? s.inventory_bikes[0] : s.inventory_bikes;
      const bm = ib ? (Array.isArray((ib as Record<string, unknown>).bike_models) ? (ib as Record<string, unknown[]>).bike_models[0] : (ib as Record<string, unknown>).bike_models) : null;
      return {
        id: s.id as string, invoice_number: s.invoice_number as string,
        customer_name: (c as Record<string, string> | null)?.full_name || "—",
        bike_model: (bm as Record<string, string> | null)?.name || "—",
        total_amount: s.total_amount as number, payment_type: s.payment_type as string,
        sale_date: s.sale_date as string,
      };
    });

    setData({
      todaySales, todayCount: todayArr.length,
      monthRevenue, monthCount: monthArr.length,
      monthExpenses, stockValue,
      pendingCR: crR.data?.length || 0, pendingPlates: plR.data?.length || 0,
      pendingCheques: chqArr.length, pendingChequeAmount: chqArr.reduce((s, c) => s + c.amount, 0),
      tvsCommission: tvsComm, financeCommission: finComm, insuranceCommission: insComm,
      prevTvs: prevArr.reduce((s, r) => s + (r.tvs_commission || 0), 0),
      prevFinance: prevArr.reduce((s, r) => s + (r.finance_commission || 0), 0),
      prevInsurance: prevArr.reduce((s, r) => s + (r.insurance_commission || 0), 0),
      presentToday: attArr.filter(a => a.status === "present").length,
      absentToday: attArr.filter(a => a.status === "absent").length,
      leaveToday: attArr.filter(a => ["casual_leave", "sick_leave", "annual_leave"].includes(a.status)).length,
      totalEmployees: attArr.length,
      recentSales, inventoryByModel: Object.values(modelMap).sort((a, b) => b.total - a.total).slice(0, 7),
      revenueSeries, monthlySales, salesDist,
      reminders: chqArr.slice(0, 5).map(c => ({
        id: c.cheque_number, type: "cheque", label: `${c.cheque_number} · ${c.pay_to || c.type?.toUpperCase() || "Cheque"}`,
        date: c.payment_date || today, amount: c.amount,
      })),
      userName: (profR.data?.full_name as string | null)?.split(" ")[0] || "Admin",
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Skeleton />;
  if (!data) return null;

  const profit = data.monthRevenue - data.monthExpenses;
  const revData = revRange === "7d" ? data.revenueSeries.slice(-7) : data.revenueSeries;
  const attPct = data.totalEmployees > 0 ? Math.round((data.presentToday / data.totalEmployees) * 100) : 0;
  const circ = 2 * Math.PI * 30;

  return (
    <div className="space-y-5 max-w-[1600px] pb-8">

      {/* ── Hero row ───────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-[#ABABAB] font-semibold uppercase tracking-widest mb-1">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
            {greeting()}, {data.userName} 👋
          </h1>
        </div>
        <Link href="/sales/new" className="flex items-center gap-2 h-9 px-4 bg-[#FF4C00] text-white text-[13px] font-semibold rounded-xl hover:bg-[#E04400] transition-colors">
          <Zap className="h-3.5 w-3.5" /> New Sale
        </Link>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Today's Sales" value={`Rs. ${fmt(data.todaySales)}`}
          sub={`${data.todayCount} sale${data.todayCount !== 1 ? "s" : ""} today`}
          icon={DollarSign} color="bg-[#FF4C00] text-white" />
        <KPI label="Monthly Revenue" value={`Rs. ${fmt(data.monthRevenue)}`}
          sub={`${data.monthCount} sales this month`}
          icon={TrendingUp} color="bg-[#0A0A0A] text-white" />
        <KPI label="Net Profit" value={`Rs. ${fmt(Math.abs(profit))}`}
          sub={profit >= 0 ? "Profitable this month" : "Net loss this month"}
          trend={profit > 0 ? { v: "Profitable", up: true } : profit < 0 ? { v: "Loss", up: false } : null}
          icon={Receipt} color={profit >= 0 ? "bg-emerald-500 text-white" : "bg-red-400 text-white"} />
        <KPI label="Stock Value" value={`Rs. ${fmt(data.stockValue)}`}
          sub="Available inventory value"
          icon={Package} color="bg-[#F5F5F5] text-[#6B6B6B]" />
      </div>

      {/* ── Revenue chart + Donut ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Area chart */}
        <div className="lg:col-span-2 bg-white border border-[#E8E8E8] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[13px] font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Revenue Analytics</h3>
              <p className="text-[11px] text-[#ABABAB] mt-0.5">Revenue · Expenses · Profit</p>
            </div>
            <div className="flex items-center gap-1 bg-[#F5F5F5] rounded-lg p-0.5">
              {(["7d", "30d"] as const).map(r => (
                <button key={r} onClick={() => setRevRange(r)}
                  className={`h-6 px-2.5 rounded-md text-[11px] font-semibold transition-all ${revRange === r ? "bg-white text-[#0A0A0A]" : "text-[#9A9A9A]"}`}>
                  {r === "7d" ? "7D" : "30D"}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF4C00" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#FF4C00" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F0F0F0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#ABABAB" }} axisLine={false} tickLine={false}
                interval={revRange === "30d" ? 5 : 0} />
              <YAxis tick={{ fontSize: 10, fill: "#ABABAB" }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`} />
              <Tooltip content={<CT />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#FF4C00" strokeWidth={2} fill="url(#gR)" />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#D0D0D0" strokeWidth={1.5} fill="none" strokeDasharray="4 2" />
              <Area type="monotone" dataKey="profit" name="Profit" stroke="#10B981" strokeWidth={2} fill="url(#gP)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 pt-3 mt-3 border-t border-[#F5F5F5]">
            {[{ c: "#FF4C00", l: "Revenue" }, { c: "#D0D0D0", l: "Expenses" }, { c: "#10B981", l: "Profit" }].map(x => (
              <div key={x.l} className="flex items-center gap-1.5">
                <span className="w-3 h-[2px] rounded" style={{ background: x.c }} />
                <span className="text-[11px] text-[#9A9A9A] font-medium">{x.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Donut */}
        <div className="bg-white border border-[#E8E8E8] rounded-2xl p-5 flex flex-col">
          <SH title="Sales Distribution" sub="By payment type" />
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={data.salesDist} cx="50%" cy="50%" innerRadius={48} outerRadius={72}
                    dataKey="value" strokeWidth={0} paddingAngle={3}>
                    {data.salesDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`Rs. ${Number(v).toLocaleString()}`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[10px] text-[#ABABAB] font-medium">Total</p>
                <p className="text-[15px] font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Rs. {fmt(data.monthRevenue)}</p>
              </div>
            </div>
          </div>
          <div className="space-y-2 pt-2 border-t border-[#F5F5F5]">
            {data.salesDist.filter(d => d.name !== "No Sales").map(d => (
              <div key={d.name} className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                <span className="text-[11px] text-[#6B6B6B] flex-1">{d.name}</span>
                <span className="text-[11px] font-bold text-[#0A0A0A]">Rs. {d.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bar + Commission + Attendance ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Monthly bar */}
        <div className="bg-white border border-[#E8E8E8] rounded-2xl p-5">
          <SH title="Monthly Performance" sub="Last 6 months" href="/reports" action="Full Report" />
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={data.monthlySales} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#F0F0F0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#ABABAB" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#ABABAB" }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`} />
              <Tooltip cursor={{ fill: "#F9F9F9" }} formatter={(v) => [`Rs. ${Number(v).toLocaleString()}`, "Sales"]} />
              <Bar dataKey="sales" fill="#FF4C00" shape={<RBar />} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Commission */}
        <div className="bg-white border border-[#E8E8E8] rounded-2xl p-5">
          <SH title="Commission Breakdown" sub="This month" href="/finance" action="Finance" />
          <div className="space-y-3">
            {[
              { label: "TVS Commission", value: data.tvsCommission, color: "#FF4C00", bg: "bg-[#FF4C00]/8" },
              { label: "Finance Commission", value: data.financeCommission, color: "#3B82F6", bg: "bg-blue-50" },
              { label: "Insurance Commission", value: data.insuranceCommission, color: "#8B5CF6", bg: "bg-purple-50" },
            ].map(c => {
              const total = data.tvsCommission + data.financeCommission + data.insuranceCommission;
              const pct = total > 0 ? (c.value / total) * 100 : 0;
              return (
                <div key={c.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                      <span className="text-[11px] text-[#6B6B6B] font-medium">{c.label}</span>
                    </div>
                    <span className="text-[12px] font-bold text-[#0A0A0A]">Rs. {c.value.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 bg-[#F5F5F5] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ background: c.color, width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="pt-2 border-t border-[#F5F5F5] flex items-center justify-between">
              <span className="text-[11px] text-[#ABABAB] font-medium">Total Commission</span>
              <span className="text-[13px] font-bold text-[#FF4C00]">Rs. {(data.tvsCommission + data.financeCommission + data.insuranceCommission).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Attendance */}
        <div className="bg-white border border-[#E8E8E8] rounded-2xl p-5">
          <SH title="Today's Attendance" sub={`${data.totalEmployees} total employees`} href="/hr/attendance" action="Mark" />
          <div className="flex items-center gap-5">
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r="30" fill="none" stroke="#F0F0F0" strokeWidth="7" />
                <circle cx="36" cy="36" r="30" fill="none" stroke="#FF4C00" strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${(attPct / 100) * circ} ${circ}`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[16px] font-bold text-[#0A0A0A]">{attPct}%</span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {[
                { label: "Present", value: data.presentToday, color: "bg-emerald-400" },
                { label: "Absent", value: data.absentToday, color: "bg-red-400" },
                { label: "On Leave", value: data.leaveToday, color: "bg-amber-400" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${s.color}`} />
                    <span className="text-[11px] text-[#6B6B6B]">{s.label}</span>
                  </div>
                  <span className="text-[13px] font-bold text-[#0A0A0A]">{s.value}</span>
                </div>
              ))}
              {data.totalEmployees === 0 && <p className="text-[11px] text-[#ABABAB]">No attendance today</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Sales + Pending Actions ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent Sales */}
        <div className="lg:col-span-2 bg-white border border-[#E8E8E8] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F0F0F0] flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Recent Sales</h3>
              <p className="text-[11px] text-[#ABABAB] mt-0.5">{data.monthCount} sales this month</p>
            </div>
            <Link href="/sales" className="flex items-center gap-1 text-[11px] font-semibold text-[#FF4C00] hover:underline">View all <ArrowRight className="h-3 w-3" /></Link>
          </div>
          {data.recentSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-[#D0D0D0]">
              <ShoppingCart className="h-8 w-8 mb-2" />
              <p className="text-[12px] font-medium text-[#ABABAB]">No sales yet</p>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-[1.2fr_1fr_auto_auto] gap-3 px-5 py-2.5 border-b border-[#F8F8F8]">
                {["Customer", "Bike", "Amount", "Type"].map(h => (
                  <span key={h} className="text-[10px] font-bold text-[#ABABAB] uppercase tracking-wider">{h}</span>
                ))}
              </div>
              {data.recentSales.map((s) => (
                <div key={s.id} className="grid grid-cols-[1.2fr_1fr_auto_auto] gap-3 px-5 py-3 hover:bg-[#FAFAFA] transition-colors items-center border-b border-[#F8F8F8] last:border-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#FF4C00]/8 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-[#FF4C00]">
                        {s.customer_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-[#0A0A0A] truncate">{s.customer_name}</p>
                      <p className="text-[10px] text-[#ABABAB] font-mono">{s.invoice_number}</p>
                    </div>
                  </div>
                  <p className="text-[12px] text-[#6B6B6B] truncate">{s.bike_model}</p>
                  <p className="text-[13px] font-bold text-[#0A0A0A] whitespace-nowrap">Rs. {s.total_amount.toLocaleString()}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${s.payment_type === "cash" ? "bg-emerald-50 text-emerald-700" : s.payment_type === "finance" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>
                    {s.payment_type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending */}
        <div className="bg-white border border-[#E8E8E8] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F0F0F0]">
            <h3 className="text-[13px] font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Pending Actions</h3>
            <p className="text-[11px] text-[#ABABAB] mt-0.5">Items needing attention</p>
          </div>
          <div className="p-3 space-y-1.5">
            {[
              { label: "CR Pending", count: data.pendingCR, icon: FileCheck, href: "/cr-plates", urgent: data.pendingCR > 0, accent: "#F59E0B" },
              { label: "Plates Pending", count: data.pendingPlates, icon: Hash, href: "/cr-plates", urgent: false, accent: "#3B82F6" },
              { label: "Cheques Due (7d)", count: data.pendingCheques, icon: CreditCard, href: "/cheques/tvs", urgent: data.pendingCheques > 0, accent: "#EF4444" },
              { label: "Cheque Amount", count: null, amount: data.pendingChequeAmount, icon: Wallet, href: "/finance", urgent: false, accent: "#8B5CF6" },
            ].map(({ label, count, amount, icon: Icon, href, urgent, accent }) => (
              <Link key={label} href={href}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-colors group ${urgent ? "bg-red-50 border border-red-100" : "hover:bg-[#FAFAFA] border border-transparent"}`}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${accent}15` }}>
                  <Icon className="h-4 w-4" style={{ color: accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[#0A0A0A]">{label}</p>
                  {urgent && <p className="text-[10px] font-semibold" style={{ color: accent }}>Needs attention</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-[14px] font-bold text-[#0A0A0A]">
                    {amount != null ? `Rs. ${fmt(amount)}` : count}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-[#D0D0D0]" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Inventory Overview ───────────────────────────────── */}
      <div className="bg-white border border-[#E8E8E8] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F0F0F0] flex items-center justify-between">
          <div>
            <h3 className="text-[13px] font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Inventory Overview</h3>
            <p className="text-[11px] text-[#ABABAB] mt-0.5">Stock health by model</p>
          </div>
          <Link href="/inventory/bikes" className="flex items-center gap-1 text-[11px] font-semibold text-[#FF4C00] hover:underline">Manage <ArrowRight className="h-3 w-3" /></Link>
        </div>
        {data.inventoryByModel.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-[#D0D0D0]">
            <Bike className="h-8 w-8 mb-2" />
            <p className="text-[12px] font-medium text-[#ABABAB]">No inventory data yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F5F5F5]">
                  {["Model", "Available", "Sold", "Reserved", "Total", "Stock Health"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-[#ABABAB] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.inventoryByModel.map(m => {
                  const pct = m.total > 0 ? (m.available / m.total) * 100 : 0;
                  const color = pct > 60 ? "#10B981" : pct > 30 ? "#F59E0B" : "#EF4444";
                  return (
                    <tr key={m.model} className="border-b border-[#F8F8F8] last:border-0 hover:bg-[#FAFAFA] transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-[#FF4C00]/8 flex items-center justify-center">
                            <Bike className="h-3 w-3 text-[#FF4C00]" />
                          </div>
                          <span className="text-[12px] font-semibold text-[#0A0A0A]">{m.model}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3"><span className="text-[12px] font-bold text-emerald-600">{m.available}</span></td>
                      <td className="px-5 py-3"><span className="text-[12px] text-[#9A9A9A]">{m.sold}</span></td>
                      <td className="px-5 py-3"><span className="text-[12px] text-amber-600">{m.reserved}</span></td>
                      <td className="px-5 py-3"><span className="text-[12px] font-medium text-[#0A0A0A]">{m.total}</span></td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 max-w-[100px] h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ background: color, width: `${Math.max(pct, 2)}%` }} />
                          </div>
                          <span className="text-[11px] font-bold" style={{ color }}>{Math.round(pct)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Finance Snapshot ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: "TVS Commission", current: data.tvsCommission, prev: data.prevTvs, accent: "#FF4C00" },
          { label: "Finance Commission", current: data.financeCommission, prev: data.prevFinance, accent: "#3B82F6" },
          { label: "Insurance Commission", current: data.insuranceCommission, prev: data.prevInsurance, accent: "#8B5CF6" },
        ].map(({ label, current, prev, accent }) => {
          const diff = prev > 0 ? ((current - prev) / prev) * 100 : null;
          return (
            <div key={label} className="bg-white border border-[#E8E8E8] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold text-[#9A9A9A] uppercase tracking-wider">{label}</span>
                {diff !== null && (
                  <span className={`text-[11px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${diff >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                    {diff >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(diff).toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-[26px] font-bold text-[#0A0A0A] leading-none" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                Rs. {current.toLocaleString()}
              </p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F5F5F5]">
                <span className="text-[11px] text-[#ABABAB]">Last month</span>
                <span className="text-[11px] font-semibold text-[#6B6B6B]">Rs. {prev.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Reminders Timeline ───────────────────────────────── */}
      {data.reminders.length > 0 && (
        <div className="bg-white border border-[#E8E8E8] rounded-2xl p-5">
          <SH title="Upcoming Reminders" sub="Cheques and actions due soon" href="/finance" action="View All" />
          <div className="relative space-y-3 pl-8">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-[#F0F0F0]" />
            {data.reminders.map((r, i) => {
              const diff = Math.ceil((new Date(r.date).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
              return (
                <div key={r.id + i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`absolute left-[7px] w-2.5 h-2.5 rounded-full border-2 ${diff <= 0 ? "bg-[#FF4C00] border-[#FF4C00]" : diff <= 2 ? "bg-amber-400 border-amber-400" : "bg-[#E0E0E0] border-[#E0E0E0]"}`} />
                    <div>
                      <p className="text-[12px] font-semibold text-[#0A0A0A]">{r.label}</p>
                      <p className="text-[10px] text-[#ABABAB]">{diff <= 0 ? "Today" : diff === 1 ? "Tomorrow" : `In ${diff} days`}{r.amount ? ` · Rs. ${r.amount.toLocaleString()}` : ""}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${diff <= 0 ? "bg-[#FF4C00] text-white" : diff <= 2 ? "bg-amber-100 text-amber-700" : "bg-[#F5F5F5] text-[#9A9A9A]"}`}>
                    {diff <= 0 ? "Today" : diff === 1 ? "Tomorrow" : `${diff}d`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-5 max-w-[1600px] pb-8 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2"><div className="h-3 w-48 bg-[#EBEBEB] rounded" /><div className="h-7 w-64 bg-[#EBEBEB] rounded-lg" /></div>
        <div className="h-9 w-28 bg-[#EBEBEB] rounded-xl" />
      </div>
      <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-white border border-[#EBEBEB] rounded-2xl" />)}</div>
      <div className="grid grid-cols-3 gap-4"><div className="col-span-2 h-72 bg-white border border-[#EBEBEB] rounded-2xl" /><div className="h-72 bg-white border border-[#EBEBEB] rounded-2xl" /></div>
      <div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-52 bg-white border border-[#EBEBEB] rounded-2xl" />)}</div>
    </div>
  );
}
