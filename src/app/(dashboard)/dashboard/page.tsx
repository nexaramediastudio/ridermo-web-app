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
import { sumReceivedByCategory, type CommissionCategory } from "@/lib/finance/commission-records";

// ─── Types ────────────────────────────────────────────────────────
interface DashData {
  todaySales: number; todayCount: number;
  monthRevenue: number; monthCount: number; prevMonthCount: number;
  monthExpenses: number; stockValue: number;
  pendingCR: number; pendingPlates: number;
  pendingCheques: number; pendingChequeAmount: number;
  tvsCommission: number; financeCommission: number; insuranceCommission: number;
  prevTvs: number; prevFinance: number; prevInsurance: number;
  presentToday: number; absentToday: number; leaveToday: number; totalEmployees: number;
  recentSales: { id: string; invoice_number: string; customer_name: string; bike_model: string; dealership_income: number; payment_type: string; sale_date: string }[];
  inventoryByModel: { model: string; available: number; sold: number; reserved: number; total: number }[];
  revenueSeries: { label: string; revenue: number; expenses: number; profit: number }[];
  monthlySales: { month: string; sales: number }[];
  salesDist: { name: string; value: number; color: string }[];
  reminders: { id: string; type: string; label: string; date: string; amount?: number; href: string }[];
  pendingIncome: number;
  pendingIncomeCount: number;
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

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    const nextMonthStart = now.getMonth() === 11
      ? `${now.getFullYear() + 1}-01-01`
      : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, "0")}-01`;

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split("T")[0];

    const [todaySalesR, monthSalesCountR, prevMonthSalesR, todayCommR, monthCommR, prevCommR, histCommR, pendingCommR, expR, invR, crR, plR, chqR, attR, empCountR, recentR, authR] = await Promise.all([
      supabase.from("sales").select("id").eq("status", "completed").gte("sale_date", today).lt("sale_date", tomorrowStr),
      supabase.from("sales").select("id").eq("status", "completed").gte("sale_date", startOfMonth).lt("sale_date", nextMonthStart),
      supabase.from("sales").select("id").eq("status", "completed").gte("sale_date", startPrev).lt("sale_date", endPrev),
      supabase.from("commission_records").select("amount, category, received_at").eq("status", "received").gte("received_at", `${today}T00:00:00`).lt("received_at", `${tomorrowStr}T00:00:00`),
      supabase.from("commission_records").select("amount, category, received_at, sale_id").eq("status", "received").gte("received_at", `${startOfMonth}T00:00:00`).lt("received_at", `${nextMonthStart}T00:00:00`),
      supabase.from("commission_records").select("amount, category").eq("status", "received").gte("received_at", `${startPrev}T00:00:00`).lt("received_at", `${endPrev}T00:00:00`),
      supabase.from("commission_records").select("amount, received_at").eq("status", "received").gte("received_at", `${sixMonthsAgo}T00:00:00`),
      supabase.from("commission_records").select("amount").eq("status", "pending"),
      supabase.from("expenses").select("amount, expense_date").gte("expense_date", startOfMonth).lt("expense_date", nextMonthStart),
      supabase.from("inventory_bikes").select("status, purchase_price, bike_models(name)"),
      supabase.from("cr_number_plates").select("id").eq("cr_status", "pending"),
      supabase.from("cr_number_plates").select("id").eq("plate_status", "pending"),
      supabase.from("cheques").select("id, cheque_number, amount, payment_date, pay_to, type").eq("status", "pending").gte("payment_date", today).lte("payment_date", in7Str),
      supabase.from("attendance").select("status").eq("date", today),
      supabase.from("employees").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("sales").select("id, invoice_number, customers(full_name), inventory_bikes(bike_models(name)), payment_type, sale_date").eq("status", "completed").order("created_at", { ascending: false }).limit(7),
      supabase.auth.getUser(),
    ]);

    let userName = "Admin";
    if (authR.data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", authR.data.user.id)
        .maybeSingle();
      userName = profile?.full_name?.split(" ")[0] || authR.data.user.email?.split("@")[0] || "Admin";
    }

    const todayCommArr = todayCommR.data || [];
    const monthCommArr = monthCommR.data || [];
    const prevCommArr = prevCommR.data || [];
    const histCommArr = histCommR.data || [];
    const pendingCommArr = pendingCommR.data || [];
    const expArr = expR.data || [];
    const invArr = invR.data || [];
    const attArr = attR.data || [];
    const chqArr = chqR.data || [];
    const monthCount = monthSalesCountR.data?.length || 0;
    const prevMonthCount = prevMonthSalesR.data?.length || 0;
    const totalEmployees = empCountR.count || 0;
    const pendingIncome = pendingCommArr.reduce((s, r) => s + Number(r.amount || 0), 0);
    const pendingIncomeCount = pendingCommArr.length;

    const todaySales = todayCommArr.reduce((s, r) => s + Number(r.amount || 0), 0);
    const monthRevenue = monthCommArr.reduce((s, r) => s + Number(r.amount || 0), 0);
    const monthExpenses = expArr.reduce((s, r) => s + r.amount, 0);
    const monthByCat = sumReceivedByCategory(monthCommArr as unknown as { amount: number; status: "received"; category: CommissionCategory }[]);
    const tvsComm = monthByCat.tvs;
    const finComm = monthByCat.finance;
    const insComm = monthByCat.insurance;
    const otherIncome = monthByCat.transport + monthByCat.documentation + monthByCat.other;
    const stockValue = invArr.filter(b => b.status === "in_stock").reduce((s, b) => s + (b.purchase_price || 0), 0);

    const incomeByDate: Record<string, number> = {};
    const expByDate: Record<string, number> = {};
    for (const c of monthCommArr) {
      const d = (c.received_at as string)?.split("T")[0] || today;
      incomeByDate[d] = (incomeByDate[d] || 0) + Number(c.amount || 0);
    }
    for (const e of expArr) { const d = e.expense_date?.split("T")[0] || today; expByDate[d] = (expByDate[d] || 0) + e.amount; }
    const revenueSeries: DashData["revenueSeries"] = [];
    const dCur = new Date(startOfMonth);
    while (dCur <= now) {
      const k = dCur.toISOString().split("T")[0];
      const rev = incomeByDate[k] || 0, exp = expByDate[k] || 0;
      revenueSeries.push({ label: `${dCur.getDate()} ${dCur.toLocaleString("en", { month: "short" })}`, revenue: rev, expenses: exp, profit: rev - exp });
      dCur.setDate(dCur.getDate() + 1);
    }

    const monthlySales: DashData["monthlySales"] = [];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStart = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-01`;
      const mEnd = m.getMonth() === 11 ? `${m.getFullYear() + 1}-01-01` : `${m.getFullYear()}-${String(m.getMonth() + 2).padStart(2, "0")}-01`;
      const monthIncome = histCommArr
        .filter((c) => (c.received_at as string) >= mStart && (c.received_at as string) < mEnd)
        .reduce((s, c) => s + Number(c.amount || 0), 0);
      monthlySales.push({ month: m.toLocaleString("en", { month: "short" }), sales: monthIncome });
    }

    const modelMap: Record<string, { model: string; available: number; sold: number; reserved: number; total: number }> = {};
    for (const b of invArr) {
      const bm = Array.isArray(b.bike_models) ? b.bike_models[0] : b.bike_models;
      const name = (bm as { name?: string } | null)?.name || "Unknown";
      if (!modelMap[name]) modelMap[name] = { model: name, available: 0, sold: 0, reserved: 0, total: 0 };
      modelMap[name].total++;
      if (b.status === "in_stock") modelMap[name].available++;
      else if (b.status === "sold") modelMap[name].sold++;
      else if (b.status === "reserved") modelMap[name].reserved++;
    }

    const salesDist = [
      { name: "TVS", value: monthByCat.tvs, color: "#FF4C00" },
      { name: "Finance", value: monthByCat.finance, color: "#3B82F6" },
      { name: "Insurance", value: monthByCat.insurance, color: "#8B5CF6" },
      { name: "Other", value: otherIncome, color: "#10B981" },
    ].filter(d => d.value > 0);
    if (!salesDist.length) salesDist.push({ name: "No Income", value: 1, color: "#E5E5E5" });

    const recentSaleIds = (recentR.data || []).map((s: { id: string }) => s.id);
    let receivedBySale: Record<string, number> = {};
    if (recentSaleIds.length) {
      const { data: recents } = await supabase
        .from("commission_records")
        .select("sale_id, amount")
        .in("sale_id", recentSaleIds)
        .eq("status", "received");
      for (const r of recents || []) {
        receivedBySale[r.sale_id] = (receivedBySale[r.sale_id] || 0) + Number(r.amount || 0);
      }
    }

    const recentSales = (recentR.data || []).map((s: Record<string, unknown>) => {
      const c = Array.isArray(s.customers) ? s.customers[0] : s.customers;
      const ib = Array.isArray(s.inventory_bikes) ? s.inventory_bikes[0] : s.inventory_bikes;
      const bm = ib ? (Array.isArray((ib as Record<string, unknown>).bike_models) ? (ib as Record<string, unknown[]>).bike_models[0] : (ib as Record<string, unknown>).bike_models) : null;
      return {
        id: s.id as string, invoice_number: s.invoice_number as string,
        customer_name: (c as Record<string, string> | null)?.full_name || "—",
        bike_model: (bm as Record<string, string> | null)?.name || "—",
        dealership_income: receivedBySale[s.id as string] || 0,
        payment_type: s.payment_type as string,
        sale_date: s.sale_date as string,
      };
    });

    const prevByCat = sumReceivedByCategory(prevCommArr as unknown as { amount: number; status: "received"; category: CommissionCategory }[]);

    setData({
      todaySales, todayCount: todaySalesR.data?.length || 0,
      monthRevenue, monthCount, prevMonthCount,
      monthExpenses, stockValue,
      pendingCR: crR.data?.length || 0, pendingPlates: plR.data?.length || 0,
      pendingCheques: chqArr.length, pendingChequeAmount: chqArr.reduce((s, c) => s + c.amount, 0),
      tvsCommission: tvsComm, financeCommission: finComm, insuranceCommission: insComm,
      prevTvs: prevByCat.tvs,
      prevFinance: prevByCat.finance,
      prevInsurance: prevByCat.insurance,
      presentToday: attArr.filter(a => a.status === "present" || a.status === "half_day").length,
      absentToday: attArr.filter(a => a.status === "absent").length,
      leaveToday: attArr.filter(a => ["sick_leave", "casual_leave", "holiday"].includes(a.status)).length,
      totalEmployees,
      recentSales, inventoryByModel: Object.values(modelMap).sort((a, b) => b.total - a.total).slice(0, 7),
      revenueSeries, monthlySales, salesDist,
      reminders: chqArr.slice(0, 5).map(c => ({
        id: c.id,
        type: "cheque",
        label: `${c.cheque_number} · ${c.pay_to || (c.type === "tvs" ? "TVS" : "Other")}`,
        date: c.payment_date || today,
        amount: c.amount,
        href: c.type === "tvs" ? "/cheques/tvs" : "/cheques/other",
      })),
      pendingIncome,
      pendingIncomeCount,
      userName,
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Skeleton />;
  if (!data) return null;

  const todayDate = new Date();
  const profit = data.monthRevenue - data.monthExpenses;
  const attPct = data.totalEmployees > 0 ? Math.round((data.presentToday / data.totalEmployees) * 100) : 0;
  const daysInMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate();
  const dayOfMonth = todayDate.getDate();
  const monthProgressPct = Math.round((dayOfMonth / daysInMonth) * 100);
  const salesGrowthPct = data.prevMonthCount > 0
    ? Math.round(((data.monthCount - data.prevMonthCount) / data.prevMonthCount) * 100)
    : data.monthCount > 0 ? 100 : 0;
  const weekData = data.revenueSeries.slice(-7);
  const availableBikes = data.inventoryByModel.reduce((s, m) => s + m.available, 0);
  const totalBikes = data.inventoryByModel.reduce((s, m) => s + m.total, 0);
  const stockPct = totalBikes > 0 ? Math.round((availableBikes / totalBikes) * 100) : 0;

  // Week calendar dates
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
              <Link href="/sales" className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center flex-shrink-0 group-hover:bg-[#FF4C00]/10 transition-colors">
                  <ShoppingCart className="h-5 w-5 text-[#374151] group-hover:text-[#FF4C00]" />
                </div>
                <div>
                  <h1 className="text-[26px] font-bold text-[#111827] leading-tight group-hover:text-[#FF4C00] transition-colors" style={H}>
                    Sales Overview
                  </h1>
                  <p className="text-[12.5px] text-[#9CA3AF] mt-0.5">
                    Monitor daily sales and track overall dealership performance trends.
                  </p>
                </div>
              </Link>
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#4B5563] bg-[#F9FAFB] border border-[#E5E7EB] px-3 py-1.5 rounded-xl flex-shrink-0">
                <Calendar className="h-3.5 w-3.5 text-[#9CA3AF]" />
                {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
              </div>
            </div>

            {/* Big stats LEFT + chart RIGHT */}
            <div className="flex gap-10">
              {/* LEFT: stacked metrics */}
              <div className="flex-shrink-0 w-44 space-y-6">
                <Link href="/sales" className="block group">
                  <div className="flex items-end gap-1.5 leading-none">
                    <span className="text-[54px] font-black text-[#111827] tabular-nums tracking-tight group-hover:text-[#FF4C00] transition-colors" style={H}>
                      {data.todayCount}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#9CA3AF] font-medium mt-2 group-hover:text-[#FF4C00]">Today&#39;s Sales →</p>
                </Link>
                <Link href="/income" className="block group">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[14px] font-bold text-[#374151] tabular-nums group-hover:text-[#FF4C00]">{fmtFull(data.todaySales)}</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest group-hover:text-[#FF4C00]">Received Today →</span>
                </Link>
                <Link href="/sales" className="block group">
                  <div className="text-[38px] font-black text-[#111827] leading-none tabular-nums tracking-tight group-hover:text-[#FF4C00] transition-colors" style={H}>
                    {data.monthCount}
                  </div>
                  <p className="text-[12px] text-[#9CA3AF] font-medium mt-2">
                    Sales This Month
                    {salesGrowthPct !== 0 && (
                      <span className={`ml-1 font-bold ${salesGrowthPct > 0 ? "text-emerald-600" : "text-red-500"}`}>
                        ({salesGrowthPct > 0 ? "+" : ""}{salesGrowthPct}% vs last month)
                      </span>
                    )}
                  </p>
                </Link>
              </div>

              {/* RIGHT: bar chart */}
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">
                    <Link href="/income" className="hover:text-[#FF4C00] transition-colors">{fmtFull(data.monthRevenue)} RECEIVED THIS MONTH →</Link>
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
                      <Tooltip cursor={false} formatter={(v) => [`Rs. ${Number(v).toLocaleString()}`, "Income"]} />
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
            <Link href="/income" className="p-6 block hover:ring-2 hover:ring-[#FF4C00]/20 transition-all rounded-[20px]" style={CARD}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] flex items-center justify-center">
                  <DollarSign className="h-4.5 w-4.5 text-[#374151]" style={{ width: 18, height: 18 }} />
                </div>
                <span className="text-[15px] font-bold text-[#111827]" style={H}>Income &amp; Finance →</span>
              </div>
              <p className="text-[12px] text-[#9CA3AF] mb-1.5">Received commissions &amp; charges this month</p>
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
                {" · "}{data.monthCount} sales · {fmtFull(data.monthExpenses)} expenses
              </p>
              {data.pendingIncomeCount > 0 && (
                <p className="text-[11px] text-amber-600 font-semibold mt-2">
                  {data.pendingIncomeCount} pending · {fmtFull(data.pendingIncome)} not received yet
                </p>
              )}
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
            </Link>

            {/* Stock Health — bar chart */}
            <div className="p-6 flex flex-col" style={CARD}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] flex items-center justify-center">
                  <Package style={{ width: 18, height: 18 }} className="text-[#374151]" />
                </div>
                <div>
                  <span className="text-[15px] font-bold text-[#111827]" style={H}>Stock Health</span>
                  <p className="text-[11.5px] text-[#9CA3AF] mt-0.5">Available bikes per model.</p>
                </div>
              </div>
              <div className="flex items-end gap-3 mb-1">
                <span className="text-[36px] font-black text-[#111827] tabular-nums leading-none" style={H}>
                  {stockPct}%
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg mb-0.5 ${stockPct >= 60 ? "bg-[#ECFDF5] text-emerald-600" : stockPct >= 30 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-500"}`}>
                  {stockPct >= 60 ? "Healthy" : stockPct >= 30 ? "Low Stock" : "Critical"}
                </span>
              </div>
              <p className="text-[12px] text-[#9CA3AF] mb-3">{availableBikes} available · {totalBikes} total</p>

              {/* Grouped bar chart: available vs sold per model */}
              {data.inventoryByModel.length > 0 ? (
                <div className="flex-1 -mx-1">
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart
                      data={data.inventoryByModel.slice(0, 6).map(m => ({
                        name: m.model.replace(/TVS\s*/i, "").slice(0, 8),
                        Available: m.available,
                        Sold: m.sold,
                        Reserved: m.reserved,
                      }))}
                      margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
                      barCategoryGap="30%"
                      barGap={2}
                    >
                      <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: "#F9FAFB" }}
                        contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #E5E7EB", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                        formatter={(v, n) => [Number(v), String(n)]}
                      />
                      <Bar dataKey="Available" fill="#10B981" maxBarSize={12} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Sold"      fill="#E5E7EB" maxBarSize={12} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Reserved"  fill="#FCD34D" maxBarSize={12} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-4 mt-1 px-1">
                    {[{ c: "#10B981", l: "Available" }, { c: "#E5E7EB", l: "Sold" }, { c: "#FCD34D", l: "Reserved" }].map(x => (
                      <div key={x.l} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-sm inline-block" style={{ background: x.c }} />
                        <span className="text-[10px] text-[#9CA3AF]">{x.l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-[#9CA3AF] flex-1">No inventory data yet</p>
              )}

              <Link href="/inventory/bikes" className="flex items-center gap-1 text-[11px] font-semibold text-[#FF4C00] hover:underline mt-3">
                Manage inventory <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* ── Quick Access ─────────────────────────────────── */}
          <div className="p-6" style={CARD}>
            <p className="text-[13px] font-bold text-[#111827] mb-4" style={H}>Quick Access</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {[
                { label: "New Sale", href: "/sales/new", icon: ShoppingCart },
                { label: "Sales", href: "/sales", icon: ShoppingCart },
                { label: "Income", href: "/income", icon: DollarSign },
                { label: "Expenses", href: "/expenses", icon: Wallet },
                { label: "Inventory", href: "/inventory/bikes", icon: Package },
                { label: "Customers", href: "/customers", icon: UserCheck },
                { label: "CR & Plates", href: "/cr-plates", icon: Hash },
                { label: "Reports", href: "/reports", icon: ArrowUpRight },
              ].map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[#F0F0F0] hover:border-[#FF4C00]/30 hover:bg-[#FF4C00]/5 transition-all text-center"
                >
                  <Icon className="h-4 w-4 text-[#6B7280]" />
                  <span className="text-[10px] font-semibold text-[#374151]">{label}</span>
                </Link>
              ))}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: "CR Pending", value: data.pendingCR, icon: FileCheck, href: "/cr-plates", urgent: data.pendingCR > 0, color: "#F59E0B", bg: "#FFFBEB" },
                { label: "Plates Pending", value: data.pendingPlates, icon: Hash, href: "/cr-plates", urgent: false, color: "#3B82F6", bg: "#EFF6FF" },
                { label: "Cheques Due", value: data.pendingCheques, icon: CreditCard, href: "/cheques/tvs", urgent: data.pendingCheques > 0, color: "#EF4444", bg: "#FEF2F2" },
                { label: "Pending Income", value: data.pendingIncomeCount, icon: DollarSign, href: "/income", urgent: data.pendingIncomeCount > 0, color: "#8B5CF6", bg: "#F5F3FF" },
                { label: "Amount Due", value: null, amount: data.pendingChequeAmount, icon: Wallet, href: "/cheques/tvs", urgent: false, color: "#6366F1", bg: "#EEF2FF" },
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
              <Link href="/sales" className="bg-[#F9FAFB] rounded-xl px-3 py-2.5 hover:bg-[#FF4C00]/5 transition-colors">
                <p className="text-[20px] font-black text-[#111827] tabular-nums leading-none" style={H}>{data.todayCount}</p>
                <p className="text-[10px] text-[#9CA3AF] font-semibold mt-1">Sales Today →</p>
              </Link>
              <Link href="/hr/attendance" className="bg-[#F9FAFB] rounded-xl px-3 py-2.5 hover:bg-[#FF4C00]/5 transition-colors">
                <p className="text-[20px] font-black text-[#111827] tabular-nums leading-none" style={H}>{data.presentToday}</p>
                <p className="text-[10px] text-[#9CA3AF] font-semibold mt-1">Present Today →</p>
              </Link>
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
                    <Link key={r.id + i} href={r.href} className="flex items-start justify-between gap-2 hover:bg-[#F9FAFB] -mx-2 px-2 py-1 rounded-lg transition-colors">
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
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Recent Sales (like "Recent Attendance") ────── */}
          <div className="p-5 border-b border-[#F5F5F5]">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-[#9CA3AF]" />
                <h3 className="text-[13px] font-bold text-[#111827]" style={H}>Recent Sales</h3>
              </div>
              <Link href="/sales" className="text-[11px] font-semibold text-[#FF4C00] hover:underline flex items-center gap-0.5">
                All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {data.recentSales.length === 0 ? (
              <p className="text-[12px] text-[#9CA3AF]">No sales recorded yet · <Link href="/sales/new" className="text-[#FF4C00] font-semibold hover:underline">Create first sale</Link></p>
            ) : (
              <div className="space-y-4">
                {data.recentSales.slice(0, 4).map(s => (
                  <Link key={s.id} href="/sales/invoices" className="flex items-center gap-3 hover:bg-[#F9FAFB] -mx-2 px-2 py-1 rounded-lg transition-colors">
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
                      <p className="text-[12px] font-bold text-[#111827] tabular-nums">Rs. {fmt(s.dealership_income)}</p>
                      <span className={`inline-block text-[9.5px] font-bold px-1.5 py-0.5 rounded-md mt-0.5 ${s.payment_type === "cash" ? "bg-[#ECFDF5] text-emerald-700" : s.payment_type === "finance" ? "bg-[#EFF6FF] text-blue-700" : "bg-[#F5F3FF] text-purple-700"}`}>
                        {s.payment_type.charAt(0).toUpperCase() + s.payment_type.slice(1)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* ── Attendance donut (like "Recent Attendance") ── */}
          <Link href="/hr/attendance" className="p-5 block hover:bg-[#FAFAFA] transition-colors rounded-b-[20px]">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#9CA3AF]" />
                <h3 className="text-[13px] font-bold text-[#111827]" style={H}>Attendance Today →</h3>
              </div>
              <span className="text-[10px] text-[#9CA3AF]">{data.totalEmployees} employees</span>
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
                {data.totalEmployees === 0 && <p className="text-[10px] text-[#9CA3AF]">No employees · <span className="text-[#FF4C00]">Add in HR</span></p>}
              </div>
            </div>
          </Link>

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
