"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users,
  CreditCard, FileCheck, Hash, Clock, AlertTriangle, Package,
  UserCheck, UserX, ArrowRight, Bike, Wrench, ShoppingBag,
  Car, Bell, ChevronRight, Receipt, Building2, Shield,
  Calendar, Zap,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────
interface DashData {
  todaySales: number;
  todayCount: number;
  monthRevenue: number;
  monthCount: number;
  monthExpenses: number;
  stockValue: number;
  pendingCR: number;
  pendingPlates: number;
  pendingCheques: number;
  pendingChequeAmount: number;
  tvsCommission: number;
  financeCommission: number;
  insuranceCommission: number;
  prevTvs: number;
  prevFinance: number;
  prevInsurance: number;
  presentToday: number;
  absentToday: number;
  leaveToday: number;
  totalEmployees: number;
  recentSales: RecentSale[];
  inventoryByModel: ModelStock[];
  revenueSeries: RevSeries[];
  monthlySales: MonthBar[];
  salesDist: { name: string; value: number; color: string }[];
  reminders: Reminder[];
  userName: string;
}

interface RecentSale {
  id: string;
  invoice_number: string;
  customer_name: string;
  bike_model: string;
  total_amount: number;
  payment_type: string;
  status: string;
  sale_date: string;
}

interface ModelStock {
  model: string;
  available: number;
  sold: number;
  reserved: number;
  total: number;
}

interface RevSeries {
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface MonthBar {
  month: string;
  sales: number;
}

interface Reminder {
  id: string;
  type: "cheque" | "cr" | "plate" | "salary";
  label: string;
  date: string;
  amount?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function fmt(n: number) {
  if (n >= 1_000_000) return `Rs. ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `Rs. ${(n / 1_000).toFixed(0)}K`;
  return `Rs. ${n.toLocaleString()}`;
}

function pct(now: number, prev: number) {
  if (!prev) return null;
  const d = ((now - prev) / prev) * 100;
  return { value: `${Math.abs(d).toFixed(1)}%`, up: d >= 0 };
}

// ─── Sparkline ───────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const pts = data.map((v, i) => ({ v }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={pts}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────
function KPICard({
  title, value, sub, trend, icon: Icon, accent, spark, sparkColor,
}: {
  title: string; value: string; sub?: string;
  trend?: { value: string; up: boolean } | null;
  icon: React.ElementType; accent?: boolean;
  spark?: number[]; sparkColor?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl p-6 flex flex-col gap-3 hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] transition-all duration-300 border ${accent ? "border-[#FF4C00]/15" : "border-white"} shadow-[0_1px_4px_rgba(0,0,0,0.04)]`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent ? "bg-[#FF4C00]" : "bg-[#F5F5F5]"}`}>
          <Icon className={`h-5 w-5 ${accent ? "text-white" : "text-[#6B6B6B]"}`} />
        </div>
        {trend && (
          <span className={`text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${trend.up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
            {trend.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value}
          </span>
        )}
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold text-[#9A9A9A] uppercase tracking-wider mb-1.5">{title}</p>
        <p className={`text-3xl font-bold tracking-tight leading-none ${accent ? "text-[#FF4C00]" : "text-[#0A0A0A]"}`} style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
          {value}
        </p>
        {sub && <p className="text-xs text-[#ABABAB] mt-1.5 font-medium">{sub}</p>}
      </div>
      {spark && spark.length > 1 && (
        <Sparkline data={spark} color={sparkColor || (accent ? "#FF4C00" : "#ABABAB")} />
      )}
    </div>
  );
}

// ─── Custom tooltip ──────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur border border-[#EFEFEF] rounded-2xl px-4 py-3 shadow-xl text-xs">
      <p className="font-bold text-[#0A0A0A] mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-[#6B6B6B] capitalize">{p.name}:</span>
          <span className="font-bold text-[#0A0A0A]">Rs. {Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Custom bar shape (rounded top) ──────────────────────────────
function RoundedBar(props: { x?: number; y?: number; width?: number; height?: number; fill?: string }) {
  const { x = 0, y = 0, width = 0, height = 0, fill } = props;
  if (!height || height < 0) return null;
  const r = Math.min(6, width / 2);
  return (
    <path
      d={`M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`}
      fill={fill}
    />
  );
}

// ─── Section title ───────────────────────────────────────────────
function Section({ title, action, actionHref }: { title: string; action?: string; actionHref?: string }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h3 className="text-base font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{title}</h3>
      {action && actionHref && (
        <Link href={actionHref} className="flex items-center gap-1 text-xs text-[#FF4C00] font-semibold hover:underline">
          {action} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [revRange, setRevRange] = useState<"7d" | "30d" | "12m">("30d");

  const load = useCallback(async () => {
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startPrev = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-01`;
    const endPrev = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const in7Days = new Date(); in7Days.setDate(in7Days.getDate() + 7);
    const todayStr = in7Days.toISOString().split("T")[0];

    const [
      todaySalesR, monthSalesR, prevSalesR, expR, prevExpR,
      inventoryR, crR, platesR, chequesR, attR,
      recentR, profileR, bikeModelsR,
    ] = await Promise.all([
      supabase.from("sales").select("total_amount, tvs_commission, finance_commission, insurance_commission").eq("status", "completed").gte("sale_date", today),
      supabase.from("sales").select("total_amount, tvs_commission, finance_commission, insurance_commission, payment_type, sale_date").eq("status", "completed").gte("sale_date", startOfMonth),
      supabase.from("sales").select("total_amount, tvs_commission, finance_commission, insurance_commission").eq("status", "completed").gte("sale_date", startPrev).lt("sale_date", endPrev),
      supabase.from("expenses").select("amount, expense_date").gte("expense_date", startOfMonth),
      supabase.from("expenses").select("amount").gte("expense_date", startPrev).lt("expense_date", endPrev),
      supabase.from("inventory_bikes").select("status, purchase_price, bike_models(name)"),
      supabase.from("cr_plates").select("cr_status").eq("cr_status", "pending"),
      supabase.from("cr_plates").select("plate_status").eq("plate_status", "pending"),
      supabase.from("cheques").select("amount, payment_date, cheque_number, pay_to, type").eq("status", "pending").lte("payment_date", todayStr),
      supabase.from("attendance").select("status").eq("date", today),
      supabase.from("sales").select("id, invoice_number, customers(full_name), inventory_bikes(bike_models(name)), total_amount, payment_type, status, sale_date").eq("status", "completed").order("created_at", { ascending: false }).limit(8),
      supabase.from("profiles").select("full_name").limit(1).single(),
      supabase.from("bike_models").select("name, is_active").eq("is_active", true),
    ]);

    // Today
    const todaySales = (todaySalesR.data || []).reduce((s, r) => s + r.total_amount, 0);
    const todayCount = (todaySalesR.data || []).length;

    // Month
    const monthSalesArr = monthSalesR.data || [];
    const monthRevenue = monthSalesArr.reduce((s, r) => s + r.total_amount, 0);
    const tvsComm = monthSalesArr.reduce((s, r) => s + (r.tvs_commission || 0), 0);
    const finComm = monthSalesArr.reduce((s, r) => s + (r.finance_commission || 0), 0);
    const insComm = monthSalesArr.reduce((s, r) => s + (r.insurance_commission || 0), 0);
    const monthExpenses = (expR.data || []).reduce((s, r) => s + r.amount, 0);

    // Prev month
    const prevArr = prevSalesR.data || [];
    const prevTvs = prevArr.reduce((s, r) => s + (r.tvs_commission || 0), 0);
    const prevFinance = prevArr.reduce((s, r) => s + (r.finance_commission || 0), 0);
    const prevInsurance = prevArr.reduce((s, r) => s + (r.insurance_commission || 0), 0);

    // Stock value
    const invArr = inventoryR.data || [];
    const stockValue = invArr.filter(b => b.status === "available").reduce((s, b) => s + (b.purchase_price || 0), 0);

    // Pending
    const pendingCR = crR.data?.length || 0;
    const pendingPlates = platesR.data?.length || 0;
    const chequesArr = chequesR.data || [];
    const pendingCheques = chequesArr.length;
    const pendingChequeAmount = chequesArr.reduce((s, c) => s + c.amount, 0);

    // Attendance
    const attArr = attR.data || [];
    const presentToday = attArr.filter(a => a.status === "present").length;
    const absentToday = attArr.filter(a => a.status === "absent").length;
    const leaveToday = attArr.filter(a => ["casual_leave", "sick_leave", "annual_leave"].includes(a.status)).length;
    const totalEmployees = attArr.length;

    // Recent sales
    const recentSales: RecentSale[] = (recentR.data || []).map((s: Record<string, unknown>) => {
      const cust = Array.isArray(s.customers) ? s.customers[0] : s.customers;
      const ib = Array.isArray(s.inventory_bikes) ? s.inventory_bikes[0] : s.inventory_bikes;
      const bm = ib ? (Array.isArray(ib.bike_models) ? ib.bike_models[0] : ib.bike_models) : null;
      return {
        id: s.id as string,
        invoice_number: s.invoice_number as string,
        customer_name: cust?.full_name || "Unknown",
        bike_model: bm?.name || "—",
        total_amount: s.total_amount as number,
        payment_type: s.payment_type as string,
        status: s.status as string,
        sale_date: s.sale_date as string,
      };
    });

    // Inventory by model
    const modelMap: Record<string, ModelStock> = {};
    for (const b of invArr) {
      const bm = Array.isArray(b.bike_models) ? b.bike_models[0] : b.bike_models;
      const name = (bm as { name?: string } | null)?.name || "Unknown";
      if (!modelMap[name]) modelMap[name] = { model: name, available: 0, sold: 0, reserved: 0, total: 0 };
      modelMap[name].total++;
      if (b.status === "available") modelMap[name].available++;
      else if (b.status === "sold") modelMap[name].sold++;
      else if (b.status === "reserved") modelMap[name].reserved++;
    }
    const inventoryByModel = Object.values(modelMap).sort((a, b) => b.total - a.total).slice(0, 8);

    // Revenue series (last 30 days by default)
    const salesByDate: Record<string, number> = {};
    const expByDate: Record<string, number> = {};
    for (const s of monthSalesArr) {
      const d = s.sale_date?.split("T")[0] || today;
      salesByDate[d] = (salesByDate[d] || 0) + s.total_amount;
    }
    for (const e of expR.data || []) {
      const d = e.expense_date?.split("T")[0] || today;
      expByDate[d] = (expByDate[d] || 0) + e.amount;
    }
    const revenueSeries: RevSeries[] = [];
    const d = new Date(startOfMonth);
    while (d <= now) {
      const k = d.toISOString().split("T")[0];
      const rev = salesByDate[k] || 0;
      const exp = expByDate[k] || 0;
      revenueSeries.push({
        label: `${d.getDate()} ${d.toLocaleString("en", { month: "short" })}`,
        revenue: rev, expenses: exp, profit: rev - exp,
      });
      d.setDate(d.getDate() + 1);
    }

    // Monthly bar (last 6 months)
    const monthlySales: MonthBar[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-01`;
      const end = new Date(m.getFullYear(), m.getMonth() + 1, 1).toISOString().split("T")[0];
      const s = (monthSalesR.data || []).filter(x => x.sale_date >= start && x.sale_date < end).reduce((s, r) => s + r.total_amount, 0);
      monthlySales.push({ month: m.toLocaleString("en", { month: "short" }), sales: s });
    }

    // Sales distribution
    const cashSales = monthSalesArr.filter(s => s.payment_type === "cash").reduce((s, r) => s + r.total_amount, 0);
    const financeSales = monthSalesArr.filter(s => s.payment_type === "finance").reduce((s, r) => s + r.total_amount, 0);
    const insSales = monthSalesArr.filter(s => s.payment_type === "insurance").reduce((s, r) => s + r.total_amount, 0);
    const salesDist = [
      { name: "Cash", value: cashSales, color: "#FF4C00" },
      { name: "Finance", value: financeSales, color: "#3B82F6" },
      { name: "Insurance", value: insSales, color: "#8B5CF6" },
    ].filter(d => d.value > 0);
    if (!salesDist.length) salesDist.push({ name: "No Sales", value: 1, color: "#E5E7EB" });

    // Reminders
    const reminders: Reminder[] = chequesArr.slice(0, 4).map(c => ({
      id: c.cheque_number,
      type: c.type === "tvs" ? "cheque" : "cheque",
      label: `${c.cheque_number} — ${c.pay_to || "Cheque Due"}`,
      date: c.payment_date || today,
      amount: c.amount,
    }));
    if (pendingCR > 0) reminders.push({ id: "cr", type: "cr", label: `${pendingCR} CR documents pending`, date: today });
    if (pendingPlates > 0) reminders.push({ id: "pl", type: "plate", label: `${pendingPlates} number plates pending`, date: today });

    setData({
      todaySales, todayCount, monthRevenue, monthCount: monthSalesArr.length,
      monthExpenses, stockValue,
      pendingCR, pendingPlates, pendingCheques, pendingChequeAmount,
      tvsCommission: tvsComm, financeCommission: finComm, insuranceCommission: insComm,
      prevTvs, prevFinance, prevInsurance,
      presentToday, absentToday, leaveToday, totalEmployees,
      recentSales, inventoryByModel, revenueSeries, monthlySales, salesDist, reminders,
      userName: (profileR.data?.full_name as string | null)?.split(" ")[0] || "Admin",
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <DashboardSkeleton />;
  if (!data) return null;

  const profit = data.monthRevenue - data.monthExpenses;
  const revData = revRange === "7d"
    ? data.revenueSeries.slice(-7)
    : revRange === "30d"
      ? data.revenueSeries
      : data.monthlySales.map(m => ({ label: m.month, revenue: m.sales, expenses: 0, profit: m.sales }));

  const attendancePct = data.totalEmployees > 0 ? Math.round((data.presentToday / data.totalEmployees) * 100) : 0;
  const circumference = 2 * Math.PI * 36;
  const dashArray = `${(attendancePct / 100) * circumference} ${circumference}`;

  return (
    <div className="space-y-6 max-w-[1600px] pb-8">

      {/* ── Row 1: Welcome ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#9A9A9A] font-medium mb-1">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          <h1 className="text-3xl font-bold text-[#0A0A0A] tracking-tight leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
            {getGreeting()}, {data.userName} 👋
          </h1>
          <p className="text-sm text-[#9A9A9A] mt-1.5">Here&apos;s the pulse of RIDERMO today.</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link href="/notifications" className="w-9 h-9 rounded-xl bg-white border border-[#EFEFEF] shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex items-center justify-center hover:shadow-md transition-all">
            <Bell className="h-4 w-4 text-[#6B6B6B]" />
          </Link>
          <Link href="/sales/new" className="flex items-center gap-2 h-9 px-4 bg-[#FF4C00] text-white text-sm font-semibold rounded-xl hover:bg-[#E04400] shadow-[0_4px_12px_rgba(255,76,0,0.35)] transition-all">
            <Zap className="h-4 w-4" /> New Sale
          </Link>
        </div>
      </div>

      {/* ── Row 2: KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Today's Sales"
          value={fmt(data.todaySales)}
          sub={`${data.todayCount} ${data.todayCount === 1 ? "sale" : "sales"} today`}
          icon={DollarSign}
          accent
          spark={data.revenueSeries.slice(-7).map(r => r.revenue)}
          sparkColor="#FF4C00"
        />
        <KPICard
          title="Monthly Revenue"
          value={fmt(data.monthRevenue)}
          sub={`${data.monthCount} sales this month`}
          icon={TrendingUp}
          spark={data.monthlySales.map(m => m.sales)}
          sparkColor="#3B82F6"
        />
        <KPICard
          title="Profit"
          value={fmt(profit)}
          sub={`After Rs. ${(data.monthExpenses / 1000).toFixed(0)}K expenses`}
          icon={Receipt}
          trend={profit > 0 ? { value: "Profitable", up: true } : profit < 0 ? { value: "Loss", up: false } : null}
          spark={data.revenueSeries.slice(-14).map(r => r.profit)}
          sparkColor="#10B981"
        />
        <KPICard
          title="Stock Value"
          value={fmt(data.stockValue)}
          sub="Available inventory"
          icon={Package}
          spark={[data.stockValue * 0.85, data.stockValue * 0.90, data.stockValue * 0.95, data.stockValue]}
          sparkColor="#8B5CF6"
        />
      </div>

      {/* ── Row 3: Revenue Chart + Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Area chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Revenue Analytics</h3>
              <p className="text-xs text-[#9A9A9A] mt-0.5">Revenue vs Expenses vs Profit</p>
            </div>
            <div className="flex items-center gap-1 bg-[#F5F5F5] rounded-xl p-1">
              {(["7d", "30d", "12m"] as const).map(r => (
                <button key={r} onClick={() => setRevRange(r)}
                  className={`h-7 px-3 rounded-lg text-xs font-semibold transition-all ${revRange === r ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#9A9A9A] hover:text-[#0A0A0A]"}`}>
                  {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "12 Months"}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF4C00" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#FF4C00" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6B7280" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#6B7280" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#ABABAB" }} axisLine={false} tickLine={false}
                interval={revRange === "30d" ? 4 : 0} />
              <YAxis tick={{ fontSize: 11, fill: "#ABABAB" }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#FF4C00" strokeWidth={2.5} fill="url(#gRevenue)" />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#9CA3AF" strokeWidth={2} fill="url(#gExpenses)" />
              <Area type="monotone" dataKey="profit" name="Profit" stroke="#10B981" strokeWidth={2} fill="url(#gProfit)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-4 pt-4 border-t border-[#F5F5F5]">
            {[{ color: "#FF4C00", label: "Revenue" }, { color: "#9CA3AF", label: "Expenses" }, { color: "#10B981", label: "Profit" }].map(l => (
              <div key={l.label} className="flex items-center gap-2">
                <span className="w-3 h-0.5 rounded-full" style={{ background: l.color }} />
                <span className="text-xs text-[#6B6B6B] font-medium">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Donut chart */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Sales Distribution</h3>
            <p className="text-xs text-[#9A9A9A] mt-0.5">By payment type this month</p>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="relative">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={data.salesDist} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                    dataKey="value" strokeWidth={0} paddingAngle={3}>
                    {data.salesDist.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`Rs. ${Number(v).toLocaleString()}`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-xs text-[#9A9A9A] font-medium">Total</p>
                <p className="text-lg font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{fmt(data.monthRevenue)}</p>
              </div>
            </div>
          </div>
          <div className="space-y-2.5 mt-2">
            {data.salesDist.filter(d => d.name !== "No Sales").map(d => (
              <div key={d.name} className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                <span className="text-xs text-[#6B6B6B] flex-1">{d.name}</span>
                <span className="text-xs font-bold text-[#0A0A0A]">Rs. {d.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 4: Monthly Bar + Commission Pie + Attendance ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly bar */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white">
          <Section title="Monthly Performance" action="Reports" actionHref="/reports" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.monthlySales} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#ABABAB" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#ABABAB" }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`} />
              <Tooltip cursor={{ fill: "#F5F5F5" }} formatter={(v) => [`Rs. ${Number(v).toLocaleString()}`, "Sales"]} />
              <Bar dataKey="sales" fill="#FF4C00" shape={<RoundedBar />} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Commission pie */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white">
          <Section title="Commission Breakdown" />
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={[
                  { name: "TVS", value: data.tvsCommission || 1, color: "#FF4C00" },
                  { name: "Finance", value: data.financeCommission || 1, color: "#3B82F6" },
                  { name: "Insurance", value: data.insuranceCommission || 1, color: "#8B5CF6" },
                ]} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0} paddingAngle={3}>
                  {[{ color: "#FF4C00" }, { color: "#3B82F6" }, { color: "#8B5CF6" }].map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {[
                { label: "TVS", value: data.tvsCommission, prev: data.prevTvs, color: "#FF4C00" },
                { label: "Finance", value: data.financeCommission, prev: data.prevFinance, color: "#3B82F6" },
                { label: "Insurance", value: data.insuranceCommission, prev: data.prevInsurance, color: "#8B5CF6" },
              ].map(c => {
                const t = pct(c.value, c.prev);
                return (
                  <div key={c.label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                        <span className="text-xs text-[#6B6B6B]">{c.label}</span>
                      </div>
                      <span className="text-xs font-bold text-[#0A0A0A]">Rs. {c.value.toLocaleString()}</span>
                    </div>
                    {t && (
                      <span className={`text-[10px] font-semibold ${t.up ? "text-emerald-600" : "text-red-500"}`}>
                        {t.up ? "↑" : "↓"} {t.value} vs last month
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Attendance */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white">
          <Section title="Today's Attendance" action="Mark" actionHref="/hr/attendance" />
          <div className="flex items-center gap-5">
            {/* Circular progress */}
            <div className="flex-shrink-0 relative w-24 h-24">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
                <circle cx="44" cy="44" r="36" fill="none" stroke="#F5F5F5" strokeWidth="8" />
                <circle cx="44" cy="44" r="36" fill="none" stroke="#FF4C00" strokeWidth="8"
                  strokeLinecap="round" strokeDasharray={dashArray} strokeDashoffset="0" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{attendancePct}%</span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {[
                { label: "Present", value: data.presentToday, color: "bg-emerald-500", dot: "bg-emerald-400" },
                { label: "Absent", value: data.absentToday, color: "bg-red-400", dot: "bg-red-400" },
                { label: "On Leave", value: data.leaveToday, color: "bg-amber-400", dot: "bg-amber-400" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    <span className="text-xs text-[#6B6B6B]">{s.label}</span>
                  </div>
                  <span className="text-sm font-bold text-[#0A0A0A]">{s.value}</span>
                </div>
              ))}
              {data.totalEmployees === 0 && <p className="text-xs text-[#ABABAB]">No attendance marked today</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 5: Recent Sales + Pending Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Sales */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white">
          <Section title="Recent Sales" action="View All" actionHref="/sales" />
          {data.recentSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#ABABAB]">
              <ShoppingCart className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No sales yet</p>
              <p className="text-xs mt-1">Your recent sales will appear here</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-3 pb-2 border-b border-[#F5F5F5]">
                {["Customer", "Bike", "Amount", "Type"].map(h => (
                  <span key={h} className="text-xs font-semibold text-[#ABABAB] uppercase tracking-wider">{h}</span>
                ))}
              </div>
              {data.recentSales.map((s) => (
                <div key={s.id} className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-3 py-3 rounded-xl hover:bg-[#FAFAFA] transition-colors items-center">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#FF4C00]/8 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-[#FF4C00]">
                        {s.customer_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0A0A0A] truncate">{s.customer_name}</p>
                      <p className="text-xs text-[#ABABAB] font-mono">{s.invoice_number}</p>
                    </div>
                  </div>
                  <p className="text-sm text-[#4A4A4A] truncate">{s.bike_model}</p>
                  <p className="text-sm font-bold text-[#0A0A0A] whitespace-nowrap">Rs. {s.total_amount.toLocaleString()}</p>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                    s.payment_type === "cash" ? "bg-emerald-50 text-emerald-700" :
                    s.payment_type === "finance" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                  }`}>{s.payment_type.charAt(0).toUpperCase() + s.payment_type.slice(1)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white">
          <Section title="Pending Actions" />
          <div className="space-y-3">
            {[
              { label: "CR Pending", value: data.pendingCR, icon: FileCheck, color: "bg-amber-50 text-amber-700", href: "/cr-plates", urgent: data.pendingCR > 3 },
              { label: "Number Plates", value: data.pendingPlates, icon: Hash, color: "bg-blue-50 text-blue-700", href: "/cr-plates", urgent: false },
              { label: "Cheques Due", value: data.pendingCheques, icon: CreditCard, color: "bg-red-50 text-red-700", href: "/cheques/tvs", urgent: data.pendingCheques > 0 },
              { label: "Total Cheque Amt", value: null, amount: data.pendingChequeAmount, icon: DollarSign, color: "bg-purple-50 text-purple-700", href: "/finance", urgent: false },
            ].map(({ label, value, amount, icon: Icon, color, href, urgent }) => (
              <Link key={label} href={href} className={`flex items-center gap-3 p-3.5 rounded-xl transition-all hover:shadow-sm group ${urgent ? "bg-red-50/50 border border-red-100" : "bg-[#FAFAFA] border border-transparent hover:border-[#EFEFEF]"}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0A0A0A]">{label}</p>
                  {urgent && <p className="text-xs text-red-500 font-medium">Needs attention</p>}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-base font-bold ${urgent ? "text-red-600" : "text-[#0A0A0A]"}`} style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                    {amount != null ? fmt(amount) : value}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-[#DADADA] group-hover:text-[#9A9A9A]" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 6: Inventory Overview ── */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white">
        <Section title="Inventory Overview" action="Manage" actionHref="/inventory/bikes" />
        {data.inventoryByModel.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-[#ABABAB]">
            <Bike className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm font-medium">No inventory data yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F5F5F5]">
                  {["Model", "Available", "Sold", "Reserved", "Stock Health"].map(h => (
                    <th key={h} className="text-left pb-3 text-xs font-semibold text-[#ABABAB] uppercase tracking-wider pr-6 last:pr-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.inventoryByModel.map(m => {
                  const pct = m.total > 0 ? (m.available / m.total) * 100 : 0;
                  const health = pct > 60 ? "good" : pct > 30 ? "medium" : "low";
                  return (
                    <tr key={m.model} className="border-b border-[#F8F8F8] hover:bg-[#FAFAFA] transition-colors">
                      <td className="py-3.5 pr-6">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#FF4C00]/8 flex items-center justify-center">
                            <Bike className="h-3.5 w-3.5 text-[#FF4C00]" />
                          </div>
                          <span className="text-sm font-semibold text-[#0A0A0A]">{m.model}</span>
                        </div>
                      </td>
                      <td className="py-3.5 pr-6"><span className="text-sm font-bold text-emerald-600">{m.available}</span></td>
                      <td className="py-3.5 pr-6"><span className="text-sm text-[#6B6B6B]">{m.sold}</span></td>
                      <td className="py-3.5 pr-6"><span className="text-sm text-amber-600">{m.reserved}</span></td>
                      <td className="py-3.5 min-w-[180px]">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-[#F5F5F5] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${health === "good" ? "bg-emerald-400" : health === "medium" ? "bg-amber-400" : "bg-red-400"}`}
                              style={{ width: `${Math.max(pct, 3)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold w-8 ${health === "good" ? "text-emerald-600" : health === "medium" ? "text-amber-600" : "text-red-500"}`}>
                            {Math.round(pct)}%
                          </span>
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

      {/* ── Row 7: Finance Snapshot ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {[
          { label: "TVS Commission", current: data.tvsCommission, prev: data.prevTvs, icon: Receipt, color: "#FF4C00", bg: "from-[#FF4C00]/8 to-[#FF4C00]/3" },
          { label: "Finance Commission", current: data.financeCommission, prev: data.prevFinance, icon: Building2, color: "#3B82F6", bg: "from-blue-500/8 to-blue-500/3" },
          { label: "Insurance Commission", current: data.insuranceCommission, prev: data.prevInsurance, icon: Shield, color: "#8B5CF6", bg: "from-violet-500/8 to-violet-500/3" },
        ].map(({ label, current, prev, icon: Icon, color, bg }) => {
          const t = pct(current, prev);
          return (
            <div key={label} className={`bg-gradient-to-br ${bg} rounded-2xl p-6 border border-white/60 shadow-[0_1px_4px_rgba(0,0,0,0.04)] backdrop-blur-sm`}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                {t && (
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${t.up ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                    {t.up ? "↑" : "↓"} {t.value}
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-[#9A9A9A] uppercase tracking-wider mb-1">{label}</p>
              <p className="text-2xl font-bold text-[#0A0A0A] leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                Rs. {current.toLocaleString()}
              </p>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/60">
                <span className="text-xs text-[#9A9A9A]">Last month:</span>
                <span className="text-xs font-semibold text-[#4A4A4A]">Rs. {prev.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Row 8: Upcoming Reminders ── */}
      {data.reminders.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white">
          <Section title="Upcoming Reminders" action="View Finance" actionHref="/finance" />
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-[#F0F0F0]" />
            <div className="space-y-4">
              {data.reminders.map((r, idx) => {
                const typeMap = {
                  cheque: { icon: CreditCard, color: "bg-[#FF4C00] text-white", dot: "bg-[#FF4C00]" },
                  cr: { icon: FileCheck, color: "bg-amber-100 text-amber-700", dot: "bg-amber-400" },
                  plate: { icon: Hash, color: "bg-blue-100 text-blue-700", dot: "bg-blue-400" },
                  salary: { icon: DollarSign, color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-400" },
                };
                const { icon: Icon, color, dot } = typeMap[r.type];
                const diff = Math.ceil((new Date(r.date).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
                return (
                  <div key={r.id + idx} className="flex items-start gap-4 pl-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 z-10 ${color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 flex items-center justify-between py-1">
                      <div>
                        <p className="text-sm font-semibold text-[#0A0A0A]">{r.label}</p>
                        <p className="text-xs text-[#9A9A9A] mt-0.5">
                          {diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : `In ${diff} days`}
                          {r.amount ? ` · Rs. ${r.amount.toLocaleString()}` : ""}
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${diff <= 0 ? "bg-[#FF4C00] text-white" : diff <= 2 ? "bg-amber-100 text-amber-700" : "bg-[#F5F5F5] text-[#6B6B6B]"}`}>
                        {diff <= 0 ? "Today" : diff === 1 ? "Tomorrow" : `${diff}d`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-[1600px] pb-8 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-40 bg-[#EEEEEE] rounded-lg" />
          <div className="h-8 w-72 bg-[#EEEEEE] rounded-xl" />
          <div className="h-3 w-48 bg-[#EEEEEE] rounded-lg" />
        </div>
        <div className="flex gap-3">
          <div className="h-9 w-9 bg-[#EEEEEE] rounded-xl" />
          <div className="h-9 w-28 bg-[#EEEEEE] rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-36 bg-white rounded-2xl border border-[#F0F0F0]" />)}
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 h-80 bg-white rounded-2xl border border-[#F0F0F0]" />
        <div className="h-80 bg-white rounded-2xl border border-[#F0F0F0]" />
      </div>
      <div className="grid grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-52 bg-white rounded-2xl border border-[#F0F0F0]" />)}
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 h-72 bg-white rounded-2xl border border-[#F0F0F0]" />
        <div className="h-72 bg-white rounded-2xl border border-[#F0F0F0]" />
      </div>
    </div>
  );
}
