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

// ─── Week bar (last bar = today, orange) ──────────────────────────
function WeekBar(props: { x?: number; y?: number; width?: number; height?: number; index?: number; totalBars?: number }) {
  const { x = 0, y = 0, width = 0, height = 0, index = 0, totalBars = 7 } = props;
  if (!height || height <= 0) return <g />;
  const isToday = index === totalBars - 1;
  const fill = isToday ? "#FF4C00" : "#BFDBFE";
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
    <div className="bg-white rounded-2xl border border-[#EBEBEB] p-5 hover:border-[#D5D5D5] transition-colors" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)" }}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon style={{ width: 17, height: 17 }} />
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-1 rounded-lg ${trend.up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
            {trend.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {trend.v}
          </span>
        )}
      </div>
      <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-[26px] font-bold text-[#0A0A0A] leading-none tracking-tight tabular-nums" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{value}</p>
      {sub && <p className="text-[11px] text-[#ABABAB] mt-1.5">{sub}</p>}
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
  const revData = data.revenueSeries;
  const attPct = data.totalEmployees > 0 ? Math.round((data.presentToday / data.totalEmployees) * 100) : 0;

  const monthPct = data.monthCount > 0 ? Math.min(Math.round((data.monthCount / 30) * 100), 100) : 0;
  const weekData = data.revenueSeries.slice(-7);

  return (
    <div className="pb-8 max-w-[1600px]">
      <div className="flex gap-5 items-start">

        {/* ═══ LEFT — main content ═══ */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* ── Hero card (Sales Overview) ── */}
          <div className="bg-white rounded-2xl border border-[#EBEBEB] p-6" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            {/* Card header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#FFF3EF] flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-[#FF4C00]" />
                </div>
                <div>
                  <h2 className="text-[18px] font-bold text-[#111827] leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Sales Overview</h2>
                  <p className="text-[12px] text-[#9CA3AF] mt-0.5">Monitor daily sales and track monthly performance</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[12px] font-semibold text-[#6B7280] bg-[#F9FAFB] border border-[#E5E7EB] px-3 py-1.5 rounded-lg">
                <Calendar className="h-3.5 w-3.5" />
                {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
              </div>
            </div>

            {/* Big stats + chart side by side */}
            <div className="flex gap-8 items-end">
              {/* Left: big numbers */}
              <div className="flex-shrink-0 w-52 space-y-6">
                <div>
                  <div className="flex items-end gap-2">
                    <span className="text-[56px] font-extrabold text-[#111827] leading-none tracking-tight tabular-nums" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{data.todayCount}</span>
                    <span className="text-[22px] font-semibold text-[#D1D5DB] mb-1.5">/30</span>
                  </div>
                  <p className="text-[12px] text-[#9CA3AF] font-medium mt-1.5">Today&#39;s Sales</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Rs. {fmt(data.todaySales)}</span>
                  <p className="text-[11px] text-[#9CA3AF] font-medium">Today&#39;s Revenue</p>
                </div>
                <div>
                  <div className="text-[40px] font-extrabold text-[#111827] leading-none tracking-tight tabular-nums" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{monthPct}%</div>
                  <p className="text-[12px] text-[#9CA3AF] font-medium mt-1">Monthly Performance</p>
                </div>
              </div>

              {/* Right: bar chart */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Rs. {fmt(data.monthRevenue)} MONTHLY REVENUE</span>
                  <Link href="/sales/new" className="flex items-center gap-1.5 h-7 px-3 bg-[#FF4C00] text-white text-[11px] font-semibold rounded-lg hover:bg-[#E04400] transition-colors">
                    <Zap className="h-3 w-3" /> New Sale
                  </Link>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={weekData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={4}>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={false} formatter={(v) => [`Rs. ${Number(v).toLocaleString()}`, "Revenue"]} />
                    <Bar dataKey="revenue" maxBarSize={28} shape={<WeekBar totalBars={weekData.length} />} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-[#FF4C00]" /><span className="text-[10px] text-[#9CA3AF]">Today</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-[#BFDBFE]" /><span className="text-[10px] text-[#9CA3AF]">This week</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Revenue Snapshot ── */}
          <div className="bg-white rounded-2xl border border-[#EBEBEB] p-6" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-[12px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1">Revenue Snapshot</p>
                <div className="flex items-end gap-3">
                  <span className="text-[40px] font-extrabold text-[#111827] leading-none tabular-nums" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                    Rs. {fmt(data.monthRevenue)}
                  </span>
                  {profit > 0 && (
                    <span className="flex items-center gap-1 text-[12px] font-bold bg-emerald-50 text-emerald-600 px-2.5 py-1.5 rounded-xl mb-1">
                      <ArrowUpRight className="h-3.5 w-3.5" /> Profitable
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#9CA3AF] mt-1.5">
                  {data.monthCount} sales · Expenses: Rs. {fmt(data.monthExpenses)} · Net: <span className={profit >= 0 ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>Rs. {fmt(Math.abs(profit))}</span>
                </p>
              </div>
              <Link href="/reports" className="text-[11px] font-semibold text-[#FF4C00] hover:underline flex items-center gap-1">Full Report <ArrowRight className="h-3 w-3" /></Link>
            </div>

            {/* Revenue trend area chart */}
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={revData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF4C00" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#FF4C00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} interval={revRange === "30d" ? 5 : 0} />
                <Tooltip content={<CT />} />
                <Area type="monotone" dataKey="revenue" stroke="#FF4C00" strokeWidth={2} fill="url(#gRev)" />
              </AreaChart>
            </ResponsiveContainer>

            {/* Commission row */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-[#F3F4F6]">
              {[
                { label: "TVS Commission", value: data.tvsCommission, color: "#FF4C00", bg: "#FFF3EF" },
                { label: "Finance Commission", value: data.financeCommission, color: "#3B82F6", bg: "#EFF6FF" },
                { label: "Insurance Commission", value: data.insuranceCommission, color: "#8B5CF6", bg: "#F5F3FF" },
              ].map(c => (
                <div key={c.label} className="rounded-xl px-4 py-3" style={{ background: c.bg }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: c.color }}>{c.label}</p>
                  <p className="text-[18px] font-bold text-[#111827] tabular-nums" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Rs. {fmt(c.value)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Two cards: Inventory Health + Pending Actions ── */}
          <div className="grid grid-cols-2 gap-5">

            {/* Inventory Health */}
            <div className="bg-white rounded-2xl border border-[#EBEBEB] overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div className="px-5 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-bold text-[#111827]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Inventory Health</h3>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5">Stock by model</p>
                </div>
                <Link href="/inventory/bikes" className="text-[11px] font-semibold text-[#FF4C00] flex items-center gap-1 hover:underline">Manage <ArrowRight className="h-3 w-3" /></Link>
              </div>
              {data.inventoryByModel.length === 0 ? (
                <div className="py-10 text-center text-[#9CA3AF]">
                  <Bike className="h-6 w-6 mx-auto mb-2 text-[#D1D5DB]" />
                  <p className="text-[12px]">No inventory data</p>
                </div>
              ) : (
                <div className="divide-y divide-[#F9FAFB]">
                  {data.inventoryByModel.slice(0, 5).map(m => {
                    const pct = m.total > 0 ? (m.available / m.total) * 100 : 0;
                    const color = pct > 60 ? "#10B981" : pct > 30 ? "#F59E0B" : "#EF4444";
                    return (
                      <div key={m.model} className="flex items-center gap-3 px-5 py-3 hover:bg-[#F9FAFB] transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-[#FFF3EF] flex items-center justify-center flex-shrink-0">
                          <Bike className="h-3.5 w-3.5 text-[#FF4C00]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-[#111827] truncate">{m.model}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1 bg-[#F3F4F6] rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ background: color, width: `${Math.max(pct, 2)}%` }} />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-right flex-shrink-0">
                          <span className="text-[12px] font-bold text-emerald-600">{m.available}</span>
                          <span className="text-[11px] text-[#9CA3AF]">/ {m.total}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pending Actions */}
            <div className="bg-white rounded-2xl border border-[#EBEBEB] overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div className="px-5 py-4 border-b border-[#F3F4F6]">
                <h3 className="text-[14px] font-bold text-[#111827]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Pending Actions</h3>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">Items needing attention</p>
              </div>
              <div className="divide-y divide-[#F9FAFB]">
                {[
                  { label: "CR Pending", count: data.pendingCR, icon: FileCheck, href: "/cr-plates", urgent: data.pendingCR > 0, accent: "#F59E0B", bg: "#FFFBEB" },
                  { label: "Plates Pending", count: data.pendingPlates, icon: Hash, href: "/cr-plates", urgent: false, accent: "#3B82F6", bg: "#EFF6FF" },
                  { label: "Cheques Due (7d)", count: data.pendingCheques, icon: CreditCard, href: "/cheques/tvs", urgent: data.pendingCheques > 0, accent: "#EF4444", bg: "#FEF2F2" },
                  { label: "Cheque Amount Due", count: null, amount: data.pendingChequeAmount, icon: Wallet, href: "/finance", urgent: false, accent: "#8B5CF6", bg: "#F5F3FF" },
                ].map(({ label, count, amount, icon: Icon, href, urgent, accent, bg }) => (
                  <Link key={label} href={href} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                      <Icon className="h-4 w-4" style={{ color: accent }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[12px] font-semibold text-[#111827]">{label}</p>
                      {urgent && <p className="text-[10px] font-semibold" style={{ color: accent }}>Needs attention</p>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[15px] font-bold text-[#111827] tabular-nums">
                        {amount != null ? `Rs. ${fmt(amount)}` : count}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-[#D1D5DB]" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* ═══ RIGHT — panel ═══ */}
        <div className="w-[300px] flex-shrink-0 space-y-5">

          {/* Date card */}
          <div className="bg-white rounded-2xl border border-[#EBEBEB] p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">{greeting()}, {data.userName}</p>
            <h2 className="text-[28px] font-extrabold text-[#111827] leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
              {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
            </h2>
            <p className="text-[12px] text-[#9CA3AF] mt-0.5">
              {new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric" })}
            </p>
            <div className="mt-4 pt-4 border-t border-[#F3F4F6] grid grid-cols-2 gap-2">
              <div className="bg-[#FFF3EF] rounded-xl px-3 py-2.5 text-center">
                <p className="text-[22px] font-extrabold text-[#FF4C00] tabular-nums" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{data.todayCount}</p>
                <p className="text-[10px] text-[#FF7043] font-semibold mt-0.5">Sales Today</p>
              </div>
              <div className="bg-[#F0FDF4] rounded-xl px-3 py-2.5 text-center">
                <p className="text-[22px] font-extrabold text-emerald-600 tabular-nums" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{data.presentToday}</p>
                <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Present</p>
              </div>
            </div>
          </div>

          {/* Reminders / cheques due */}
          <div className="bg-white rounded-2xl border border-[#EBEBEB] overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div className="px-5 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-[#111827]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Upcoming Cheques</h3>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">Due within 7 days</p>
              </div>
              <Link href="/cheques/tvs" className="text-[11px] font-semibold text-[#FF4C00] flex items-center gap-0.5 hover:underline">All <ArrowRight className="h-3 w-3" /></Link>
            </div>
            {data.reminders.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="h-5 w-5 mx-auto mb-2 text-[#D1D5DB]" />
                <p className="text-[12px] text-[#9CA3AF]">No cheques due soon</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F9FAFB]">
                {data.reminders.map((r, i) => {
                  const diff = Math.ceil((new Date(r.date).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={r.id + i} className="flex items-center gap-3 px-5 py-3.5">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${diff <= 0 ? "bg-[#FF4C00]" : diff <= 2 ? "bg-amber-400" : "bg-[#D1D5DB]"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-[#111827] truncate">{r.label}</p>
                        <p className="text-[10px] text-[#9CA3AF]">{diff <= 0 ? "Today" : diff === 1 ? "Tomorrow" : `In ${diff} days`}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[12px] font-bold text-[#111827] tabular-nums">Rs. {fmt(r.amount || 0)}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${diff <= 0 ? "bg-[#FF4C00] text-white" : diff <= 2 ? "bg-amber-100 text-amber-700" : "bg-[#F3F4F6] text-[#9CA3AF]"}`}>
                          {diff <= 0 ? "Today" : `${diff}d`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Sales feed */}
          <div className="bg-white rounded-2xl border border-[#EBEBEB] overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div className="px-5 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-[#111827]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Recent Sales</h3>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">{data.monthCount} this month</p>
              </div>
              <Link href="/sales" className="text-[11px] font-semibold text-[#FF4C00] flex items-center gap-0.5 hover:underline">All <ArrowRight className="h-3 w-3" /></Link>
            </div>
            {data.recentSales.length === 0 ? (
              <div className="py-8 text-center">
                <ShoppingCart className="h-5 w-5 mx-auto mb-2 text-[#D1D5DB]" />
                <p className="text-[12px] text-[#9CA3AF]">No sales yet</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F9FAFB]">
                {data.recentSales.slice(0, 5).map(s => (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#F9FAFB] transition-colors">
                    <div className="w-8 h-8 rounded-full bg-[#FFF3EF] flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-[#FF4C00]">
                        {s.customer_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[#111827] truncate">{s.customer_name}</p>
                      <p className="text-[10px] text-[#9CA3AF] truncate">{s.bike_model}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-[12px] font-bold text-[#111827]">Rs. {fmt(s.total_amount)}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${s.payment_type === "cash" ? "bg-emerald-50 text-emerald-700" : s.payment_type === "finance" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>
                        {s.payment_type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attendance snapshot */}
          <div className="bg-white rounded-2xl border border-[#EBEBEB] p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-bold text-[#111827]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Today&#39;s Attendance</h3>
              <Link href="/hr/attendance" className="text-[11px] font-semibold text-[#FF4C00] hover:underline">Mark</Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
                  <circle cx="30" cy="30" r="24" fill="none" stroke="#F3F4F6" strokeWidth="6" />
                  <circle cx="30" cy="30" r="24" fill="none" stroke="#FF4C00" strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${(attPct / 100) * (2 * Math.PI * 24)} ${2 * Math.PI * 24}`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[13px] font-bold text-[#111827]">{attPct}%</span>
                </div>
              </div>
              <div className="space-y-2 flex-1">
                {[
                  { label: "Present", value: data.presentToday, color: "bg-emerald-400" },
                  { label: "Absent",  value: data.absentToday,  color: "bg-red-400" },
                  { label: "On Leave",value: data.leaveToday,   color: "bg-amber-400" },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${s.color}`} />
                      <span className="text-[11px] text-[#6B7280]">{s.label}</span>
                    </div>
                    <span className="text-[12px] font-bold text-[#111827] tabular-nums">{s.value}</span>
                  </div>
                ))}
                {data.totalEmployees === 0 && <p className="text-[10px] text-[#9CA3AF]">No data today</p>}
              </div>
            </div>
          </div>

        </div>
      </div>{/* end flex gap-5 */}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="pb-8 max-w-[1600px] animate-pulse">
      <div className="flex gap-5">
        <div className="flex-1 space-y-5">
          <div className="h-64 bg-white border border-[#EBEBEB] rounded-2xl" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }} />
          <div className="h-52 bg-white border border-[#EBEBEB] rounded-2xl" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }} />
          <div className="grid grid-cols-2 gap-5"><div className="h-48 bg-white border border-[#EBEBEB] rounded-2xl" /><div className="h-48 bg-white border border-[#EBEBEB] rounded-2xl" /></div>
        </div>
        <div className="w-[300px] space-y-5 flex-shrink-0">
          <div className="h-44 bg-white border border-[#EBEBEB] rounded-2xl" />
          <div className="h-52 bg-white border border-[#EBEBEB] rounded-2xl" />
          <div className="h-52 bg-white border border-[#EBEBEB] rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
