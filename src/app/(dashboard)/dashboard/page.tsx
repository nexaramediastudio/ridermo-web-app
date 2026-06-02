"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  DollarSign, ShoppingCart, CreditCard, FileCheck, Hash,
  Package, UserCheck, ArrowRight, Bike, Bell,
  Calendar, Zap, ArrowUpRight, ArrowDownRight, Wallet,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, Tooltip, ResponsiveContainer,
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
function fmtFull(n: number) {
  return `Rs. ${n.toLocaleString("en", { maximumFractionDigits: 0 })}`;
}

// ─── Custom bar: today = orange, rest = light blue ─────────────────
function WeekBar(props: { x?: number; y?: number; width?: number; height?: number; index?: number; totalBars?: number }) {
  const { x = 0, y = 0, width = 0, height = 0, index = 0, totalBars = 7 } = props;
  if (!height || height <= 0) return <g />;
  const isToday = index === totalBars - 1;
  const fill = isToday ? "#FF4C00" : "#DBEAFE";
  const r = Math.min(6, width / 2);
  return (
    <path
      d={`M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`}
      fill={fill}
    />
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────
function CT({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-bold text-[#111827] mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[#6B7280] capitalize">{p.name}:</span>
          <span className="font-bold text-[#111827]">Rs. {Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

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

    const salesByDate: Record<string, number> = {};
    const expByDate: Record<string, number> = {};
    for (const s of monthArr) { const d = s.sale_date?.split("T")[0] || today; salesByDate[d] = (salesByDate[d] || 0) + s.total_amount; }
    for (const e of expArr) { const d = e.expense_date?.split("T")[0] || today; expByDate[d] = (expByDate[d] || 0) + e.amount; }
    const revenueSeries: DashData["revenueSeries"] = [];
    const dCur = new Date(startOfMonth);
    while (dCur <= now) {
      const k = dCur.toISOString().split("T")[0];
      const rev = salesByDate[k] || 0, exp = expByDate[k] || 0;
      revenueSeries.push({ label: `${dCur.getDate()} ${dCur.toLocaleString("en", { month: "short" })}`, revenue: rev, expenses: exp, profit: rev - exp });
      dCur.setDate(dCur.getDate() + 1);
    }

    const monthlySales: DashData["monthlySales"] = [];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ms = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
      monthlySales.push({ month: m.toLocaleString("en", { month: "short" }), sales: monthArr.filter(x => x.sale_date?.startsWith(ms)).reduce((s, r) => s + r.total_amount, 0) });
    }

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
        id: c.cheque_number, type: "cheque",
        label: `${c.cheque_number} · ${c.pay_to || c.type?.toUpperCase() || "Cheque"}`,
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
  const attPct = data.totalEmployees > 0 ? Math.round((data.presentToday / data.totalEmployees) * 100) : 0;
  const monthPct = data.monthCount > 0 ? Math.min(Math.round((data.monthCount / 30) * 100), 100) : 0;
  const weekData = data.revenueSeries.slice(-7);
  const availableBikes = data.inventoryByModel.reduce((s, m) => s + m.available, 0);
  const totalBikes = data.inventoryByModel.reduce((s, m) => s + m.total, 0);
  const stockPct = totalBikes > 0 ? Math.round((availableBikes / totalBikes) * 100) : 0;

  // Week calendar dates
  const todayDate = new Date();
  const dayOfWeek = todayDate.getDay();
  const monday = new Date(todayDate);
  monday.setDate(todayDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const CARD = { background: "#fff", borderRadius: "20px", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" } as React.CSSProperties;
  const H = { fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" } as React.CSSProperties;

  return (
    <div className="pb-10 max-w-[1600px]">
      <div className="flex gap-5 items-start">

        {/* ════════════════════ LEFT COLUMN ════════════════════ */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* ── HERO: Sales Overview ────────────────────────── */}
          <div className="p-7" style={CARD}>
            {/* Card header */}
            <div className="flex items-start justify-between mb-7">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="h-5 w-5 text-[#374151]" />
                </div>
                <div>
                  <h1 className="text-[26px] font-bold text-[#111827] leading-tight" style={H}>
                    Sales Overview
                  </h1>
                  <p className="text-[12.5px] text-[#9CA3AF] mt-0.5">
                    Monitor daily sales and track overall dealership performance trends.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#4B5563] bg-[#F9FAFB] border border-[#E5E7EB] px-3 py-1.5 rounded-xl flex-shrink-0">
                <Calendar className="h-3.5 w-3.5 text-[#9CA3AF]" />
                {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
              </div>
            </div>

            {/* Big stats LEFT + chart RIGHT */}
            <div className="flex gap-10">
              {/* LEFT: stacked metrics */}
              <div className="flex-shrink-0 w-44 space-y-6">
                {/* Today count */}
                <div>
                  <div className="flex items-end gap-1.5 leading-none">
                    <span className="text-[54px] font-black text-[#111827] tabular-nums tracking-tight" style={H}>
                      {data.todayCount}
                    </span>
                    <span className="text-[22px] font-semibold text-[#D1D5DB] pb-2">/30</span>
                  </div>
                  <p className="text-[12px] text-[#9CA3AF] font-medium mt-2">Today&#39;s Sales</p>
                </div>
                {/* Revenue inline */}
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[14px] font-bold text-[#374151] tabular-nums">{fmtFull(data.todaySales)}</span>
                  <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">TODAY</span>
                </div>
                {/* Monthly % */}
                <div>
                  <div className="text-[38px] font-black text-[#111827] leading-none tabular-nums tracking-tight" style={H}>
                    {monthPct}%
                  </div>
                  <p className="text-[12px] text-[#9CA3AF] font-medium mt-2">Monthly Performance</p>
                </div>
              </div>

              {/* RIGHT: bar chart */}
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">
                    {fmtFull(data.monthRevenue)} MONTHLY REVENUE
                  </span>
                  <Link href="/sales/new"
                    className="flex items-center gap-1.5 h-7 px-3 bg-[#111827] text-white text-[11px] font-semibold rounded-lg hover:bg-[#1F2937] transition-colors flex-shrink-0">
                    <Zap className="h-3 w-3" /> New Sale
                  </Link>
                </div>
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height={175}>
                    <BarChart data={weekData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }} barGap={4}>
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={false} formatter={(v) => [`Rs. ${Number(v).toLocaleString()}`, "Revenue"]} />
                      <Bar dataKey="revenue" maxBarSize={36} shape={<WeekBar totalBars={weekData.length} />} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-5 mt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-2.5 rounded-sm bg-[#FF4C00] inline-block" />
                    <span className="text-[11px] text-[#9CA3AF]">Today</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-2.5 rounded-sm bg-[#DBEAFE] inline-block" />
                    <span className="text-[11px] text-[#9CA3AF]">This week</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Revenue & Finance + Stock Health ─────────────── */}
          <div className="grid grid-cols-2 gap-5">

            {/* Revenue & Finance — like "Payroll & Finance Snapshot" */}
            <div className="p-6" style={CARD}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] flex items-center justify-center">
                  <DollarSign className="h-4.5 w-4.5 text-[#374151]" style={{ width: 18, height: 18 }} />
                </div>
                <span className="text-[15px] font-bold text-[#111827]" style={H}>Revenue &amp; Finance</span>
              </div>
              <p className="text-[12px] text-[#9CA3AF] mb-1.5">Total revenue this month</p>
              <div className="flex items-end gap-2.5 leading-none mb-1.5">
                <span className="text-[34px] font-black text-[#111827] tabular-nums" style={H}>
                  {fmtFull(data.monthRevenue)}
                </span>
                {profit > 0 && (
                  <span className="flex items-center gap-0.5 text-[11px] font-bold bg-[#ECFDF5] text-emerald-600 px-2 py-1 rounded-lg mb-1">
                    <ArrowUpRight className="h-3 w-3" /> Profit
                  </span>
                )}
                {profit < 0 && (
                  <span className="flex items-center gap-0.5 text-[11px] font-bold bg-red-50 text-red-500 px-2 py-1 rounded-lg mb-1">
                    <ArrowDownRight className="h-3 w-3" /> Loss
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[#9CA3AF]">
                Net: <span className={profit >= 0 ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>{fmtFull(Math.abs(profit))}</span>
                {" · "}{data.monthCount} sales
              </p>
              <div className="mt-5 pt-4 border-t border-[#F5F5F5]">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "TVS", value: data.tvsCommission, color: "#FF4C00" },
                    { label: "Finance", value: data.financeCommission, color: "#3B82F6" },
                    { label: "Insurance", value: data.insuranceCommission, color: "#8B5CF6" },
                  ].map(c => (
                    <div key={c.label}>
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.color }}>{c.label}</p>
                      <p className="text-[14px] font-bold text-[#111827] mt-0.5 tabular-nums">{fmtFull(c.value)}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Sparkline */}
              <div className="mt-4 -mx-2">
                <ResponsiveContainer width="100%" height={50}>
                  <AreaChart data={data.revenueSeries.slice(-14)} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gSpk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF4C00" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#FF4C00" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip content={<CT />} />
                    <Area type="monotone" dataKey="revenue" stroke="#FF4C00" strokeWidth={1.5} fill="url(#gSpk)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Stock Health — like "Engagement Health Score" */}
            <div className="p-6 flex flex-col" style={CARD}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] flex items-center justify-center">
                  <Package style={{ width: 18, height: 18 }} className="text-[#374151]" />
                </div>
                <div>
                  <span className="text-[15px] font-bold text-[#111827]" style={H}>Stock Health</span>
                  <p className="text-[11.5px] text-[#9CA3AF] mt-0.5">Track bike availability and inventory levels in real-time.</p>
                </div>
              </div>
              <div className="flex items-end gap-3 mt-2 mb-1">
                <span className="text-[36px] font-black text-[#111827] tabular-nums leading-none" style={H}>
                  {stockPct}%
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg mb-0.5 ${stockPct >= 60 ? "bg-[#ECFDF5] text-emerald-600" : stockPct >= 30 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-500"}`}>
                  {stockPct >= 60 ? "Healthy" : stockPct >= 30 ? "Low Stock" : "Critical"}
                </span>
              </div>
              <p className="text-[12px] text-[#9CA3AF] mb-4">{availableBikes} available out of {totalBikes} bikes</p>
              <div className="space-y-3 flex-1">
                {data.inventoryByModel.slice(0, 5).map(m => {
                  const pct = m.total > 0 ? (m.available / m.total) * 100 : 0;
                  const c = pct > 60 ? "#10B981" : pct > 30 ? "#F59E0B" : "#EF4444";
                  return (
                    <div key={m.model} className="flex items-center gap-3">
                      <span className="text-[11px] text-[#6B7280] font-medium w-28 truncate flex-shrink-0">{m.model}</span>
                      <div className="flex-1 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ background: c, width: `${Math.max(pct, 2)}%` }} />
                      </div>
                      <span className="text-[11px] font-bold w-5 text-right flex-shrink-0" style={{ color: c }}>{m.available}</span>
                    </div>
                  );
                })}
                {data.inventoryByModel.length === 0 && <p className="text-[11px] text-[#9CA3AF]">No inventory data yet</p>}
              </div>
              <Link href="/inventory/bikes" className="flex items-center gap-1 text-[11px] font-semibold text-[#FF4C00] hover:underline mt-4">
                Manage inventory <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* ── Pending Actions — like "Workload Balance Monitor" ── */}
          <div className="p-6" style={CARD}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] flex items-center justify-center">
                <Bell style={{ width: 18, height: 18 }} className="text-[#374151]" />
              </div>
              <div>
                <span className="text-[15px] font-bold text-[#111827]" style={H}>Pending Actions</span>
                <p className="text-[11.5px] text-[#9CA3AF] mt-0.5">Items requiring your attention — CR, plates, and cheque deadlines.</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "CR Pending", value: data.pendingCR, icon: FileCheck, href: "/cr-plates", urgent: data.pendingCR > 0, color: "#F59E0B", bg: "#FFFBEB" },
                { label: "Plates Pending", value: data.pendingPlates, icon: Hash, href: "/cr-plates", urgent: false, color: "#3B82F6", bg: "#EFF6FF" },
                { label: "Cheques Due", value: data.pendingCheques, icon: CreditCard, href: "/cheques/tvs", urgent: data.pendingCheques > 0, color: "#EF4444", bg: "#FEF2F2" },
                { label: "Amount Due", value: null, amount: data.pendingChequeAmount, icon: Wallet, href: "/finance", urgent: false, color: "#8B5CF6", bg: "#F5F3FF" },
              ].map(({ label, value, amount, icon: Icon, href, urgent, color, bg }) => (
                <Link key={label} href={href}
                  className={`rounded-2xl p-4 flex flex-col gap-3 transition-opacity hover:opacity-90 ${urgent ? "ring-1 ring-red-200" : ""}`}
                  style={{ background: bg }}>
                  <Icon style={{ width: 20, height: 20, color }} />
                  <div>
                    <p className="text-[22px] font-black text-[#111827] tabular-nums leading-none" style={H}>
                      {amount != null ? fmtFull(amount) : value}
                    </p>
                    <p className="text-[11px] font-medium text-[#6B7280] mt-1">{label}</p>
                  </div>
                  {urgent && <span className="text-[10px] font-bold" style={{ color }}>Needs attention →</span>}
                </Link>
              ))}
            </div>
          </div>

        </div>{/* end left col */}

        {/* ════════════════════ RIGHT PANEL (single card) ════════════════════ */}
        <div className="w-[320px] flex-shrink-0" style={CARD}>

          {/* ── Date + week calendar ─────────────────────── */}
          <div className="p-6 border-b border-[#F5F5F5]">
            <p className="text-[11.5px] text-[#9CA3AF] font-medium mb-0.5">{greeting()}, {data.userName}</p>
            <h2 className="text-[30px] font-black text-[#111827] leading-tight" style={H}>
              {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            </h2>
            {/* Week header */}
            <div className="mt-4 grid grid-cols-7 gap-1 text-center">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <div key={i} className="text-[10px] font-semibold text-[#9CA3AF] mb-1">{d}</div>
              ))}
              {weekDays.map((d, i) => {
                const isToday = d.toDateString() === todayDate.toDateString();
                return (
                  <div key={i}
                    className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-[13px] font-bold ${isToday ? "bg-[#FF4C00] text-white" : "text-[#374151] hover:bg-[#F3F4F6]"} transition-colors cursor-default`}>
                    {d.getDate()}
                  </div>
                );
              })}
            </div>
            {/* Quick stat tiles */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="bg-[#F9FAFB] rounded-xl px-3 py-2.5">
                <p className="text-[20px] font-black text-[#111827] tabular-nums leading-none" style={H}>{data.todayCount}</p>
                <p className="text-[10px] text-[#9CA3AF] font-semibold mt-1">Sales Today</p>
              </div>
              <div className="bg-[#F9FAFB] rounded-xl px-3 py-2.5">
                <p className="text-[20px] font-black text-[#111827] tabular-nums leading-none" style={H}>{data.presentToday}</p>
                <p className="text-[10px] text-[#9CA3AF] font-semibold mt-1">Present Today</p>
              </div>
            </div>
          </div>

          {/* ── Upcoming Cheques (like schedule list) ─────── */}
          <div className="p-5 border-b border-[#F5F5F5]">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-[13px] font-bold text-[#111827]" style={H}>Upcoming Cheques</h3>
              <Link href="/cheques/tvs" className="text-[11px] font-semibold text-[#FF4C00] hover:underline flex items-center gap-0.5">
                All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {data.reminders.length === 0 ? (
              <p className="text-[12px] text-[#9CA3AF] py-1">No cheques due within 7 days</p>
            ) : (
              <div className="space-y-4">
                {data.reminders.map((r, i) => {
                  const diff = Math.ceil((new Date(r.date).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
                  const isUrgent = diff <= 1;
                  return (
                    <div key={r.id + i} className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-semibold text-[#111827] truncate">{r.label}</p>
                        <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                          {diff <= 0 ? "Due today" : diff === 1 ? "Due tomorrow" : `${diff} days · `}
                          {r.amount ? fmtFull(r.amount) : ""}
                        </p>
                      </div>
                      {isUrgent && (
                        <span className="flex-shrink-0 text-[10px] font-bold bg-[#FF4C00] text-white px-2 py-1 rounded-lg">
                          Pay Now
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Recent Sales (like "Recent Attendance") ────── */}
          <div className="p-5 border-b border-[#F5F5F5]">
            <div className="flex items-center gap-2 mb-3.5">
              <ShoppingCart className="h-4 w-4 text-[#9CA3AF]" />
              <h3 className="text-[13px] font-bold text-[#111827]" style={H}>Recent Sales</h3>
            </div>
            {data.recentSales.length === 0 ? (
              <p className="text-[12px] text-[#9CA3AF]">No sales recorded yet</p>
            ) : (
              <div className="space-y-4">
                {data.recentSales.slice(0, 4).map(s => (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] font-bold text-[#374151]">
                        {s.customer_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-semibold text-[#111827] truncate">{s.customer_name}</p>
                      <p className="text-[11px] text-[#9CA3AF] truncate">{s.bike_model}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-[12px] font-bold text-[#111827] tabular-nums">Rs. {fmt(s.total_amount)}</p>
                      <span className={`inline-block text-[9.5px] font-bold px-1.5 py-0.5 rounded-md mt-0.5 ${s.payment_type === "cash" ? "bg-[#ECFDF5] text-emerald-700" : s.payment_type === "finance" ? "bg-[#EFF6FF] text-blue-700" : "bg-[#F5F3FF] text-purple-700"}`}>
                        {s.payment_type.charAt(0).toUpperCase() + s.payment_type.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Attendance donut (like "Recent Attendance") ── */}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3.5">
              <UserCheck className="h-4 w-4 text-[#9CA3AF]" />
              <h3 className="text-[13px] font-bold text-[#111827]" style={H}>Attendance Today</h3>
            </div>
            <div className="flex items-center gap-4">
              {/* Donut */}
              <div className="relative w-14 h-14 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="#F3F4F6" strokeWidth="5" />
                  <circle cx="24" cy="24" r="20" fill="none" stroke="#FF4C00" strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={`${(attPct / 100) * (2 * Math.PI * 20)} ${2 * Math.PI * 20}`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[11px] font-bold text-[#111827]">{attPct}%</span>
                </div>
              </div>
              {/* Breakdown */}
              <div className="space-y-2 flex-1">
                {[
                  { label: "Present", value: data.presentToday, badge: "bg-[#ECFDF5] text-emerald-700" },
                  { label: "Absent",  value: data.absentToday,  badge: "bg-[#FEF2F2] text-red-600" },
                  { label: "On Leave",value: data.leaveToday,   badge: "bg-amber-50 text-amber-600" },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-[11px] text-[#6B7280]">{s.label}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums ${s.badge}`}>{s.value}</span>
                  </div>
                ))}
                {data.totalEmployees === 0 && <p className="text-[10px] text-[#9CA3AF]">No attendance data</p>}
              </div>
            </div>
          </div>

        </div>{/* end right panel card */}

      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="pb-10 max-w-[1600px] animate-pulse">
      <div className="flex gap-5">
        <div className="flex-1 space-y-5">
          <div className="h-72 rounded-[20px] bg-white" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }} />
          <div className="grid grid-cols-2 gap-5">
            <div className="h-56 rounded-[20px] bg-white" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }} />
            <div className="h-56 rounded-[20px] bg-white" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }} />
          </div>
          <div className="h-32 rounded-[20px] bg-white" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }} />
        </div>
        <div className="w-[320px] flex-shrink-0 rounded-[20px] bg-white" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)", height: 600 }} />
      </div>
    </div>
  );
}
