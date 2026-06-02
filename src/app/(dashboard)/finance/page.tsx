"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";
import {
  CreditCard, Wallet, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, Clock, XCircle,
  ChevronRight, DollarSign, BarChart2, Receipt,
  Building2, Shield, ArrowUpRight,
} from "lucide-react";

type FinanceTab = "overview" | "tvs_cheques" | "other_cheques" | "expenses";

export default function FinancePage() {
  const [tab, setTab] = useState<FinanceTab>("overview");
  const [overview, setOverview] = useState<{
    pendingCheques: number;
    pendingChequeAmount: number;
    overdueCount: number;
    monthExpenses: number;
    monthRevenue: number;
    monthProfit: number;
    tvsCommission: number;
    financeCommission: number;
    insuranceCommission: number;
    urgentCheques: { id: string; cheque_number: string; amount: number; payment_date: string; pay_to?: string; type: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const today = now.toISOString().split("T")[0];
    const in7Days = new Date(); in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysStr = in7Days.toISOString().split("T")[0];

    const [chequesRes, expensesRes, salesRes] = await Promise.all([
      supabase.from("cheques").select("id, cheque_number, amount, payment_date, status, pay_to, type").eq("status", "pending"),
      supabase.from("expenses").select("amount").gte("expense_date", startOfMonth),
      supabase.from("sales").select("total_amount, tvs_commission, finance_commission, insurance_commission").gte("sale_date", startOfMonth).eq("status", "completed"),
    ]);

    const pending = (chequesRes.data || []);
    const pendingTotal = pending.reduce((s, c) => s + c.amount, 0);
    const overdue = pending.filter((c) => c.payment_date && c.payment_date < today);
    const urgent = pending
      .filter((c) => c.payment_date && c.payment_date >= today && c.payment_date <= in7DaysStr)
      .sort((a, b) => a.payment_date.localeCompare(b.payment_date))
      .slice(0, 5);

    const monthExpenses = (expensesRes.data || []).reduce((s, e) => s + e.amount, 0);
    const monthRevenue = (salesRes.data || []).reduce((s, s2) => s + s2.total_amount, 0);
    const tvsComm = (salesRes.data || []).reduce((s, s2) => s + (s2.tvs_commission || 0), 0);
    const finComm = (salesRes.data || []).reduce((s, s2) => s + (s2.finance_commission || 0), 0);
    const insComm = (salesRes.data || []).reduce((s, s2) => s + (s2.insurance_commission || 0), 0);

    setOverview({
      pendingCheques: pending.length,
      pendingChequeAmount: pendingTotal,
      overdueCount: overdue.length,
      monthExpenses,
      monthRevenue,
      monthProfit: monthRevenue - monthExpenses,
      tvsCommission: tvsComm,
      financeCommission: finComm,
      insuranceCommission: insComm,
      urgentCheques: urgent,
    });
    setLoading(false);
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  const TABS = [
    { id: "overview" as FinanceTab, label: "Overview", icon: BarChart2 },
    { id: "tvs_cheques" as FinanceTab, label: "TVS Cheques", icon: CreditCard },
    { id: "other_cheques" as FinanceTab, label: "Other Cheques", icon: CreditCard },
    { id: "expenses" as FinanceTab, label: "Expenses", icon: Wallet },
  ];

  return (
    <div className="space-y-5 max-w-[1200px]">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Finance</h2>
        <p className="text-sm text-[#9A9A9A] mt-0.5">Cheques, expenses and financial overview</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[#F5F5F5] rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-semibold transition-all ${tab === t.id ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#6B6B6B] hover:text-[#0A0A0A]"}`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl border border-[#EFEFEF] animate-pulse" />)
            ) : overview && [
              { label: "This Month Revenue", value: `Rs. ${overview.monthRevenue.toLocaleString("en", { maximumFractionDigits: 0 })}`, icon: TrendingUp, accent: true, sub: `${overview.monthRevenue > 0 ? "From sales" : "No sales yet"}` },
              { label: "This Month Profit", value: `Rs. ${overview.monthProfit.toLocaleString("en", { maximumFractionDigits: 0 })}`, icon: DollarSign, accent: false, sub: `After Rs. ${overview.monthExpenses.toLocaleString("en", { maximumFractionDigits: 0 })} expenses` },
              { label: "Pending Cheques", value: `Rs. ${overview.pendingChequeAmount.toLocaleString("en", { maximumFractionDigits: 0 })}`, icon: Clock, accent: false, sub: `${overview.pendingCheques} cheques pending` },
              { label: "Total Commission", value: `Rs. ${(overview.tvsCommission + overview.financeCommission + overview.insuranceCommission).toLocaleString("en", { maximumFractionDigits: 0 })}`, icon: Receipt, accent: false, sub: "TVS + Finance + Insurance" },
            ].map(({ label, value, icon: Icon, accent, sub }) => (
              <div key={label} className={`bg-white rounded-2xl border p-4 ${accent ? "border-[#FF4C00]/20" : "border-[#EFEFEF]"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider leading-tight">{label}</span>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accent ? "bg-[#FF4C00]/10" : "bg-[#F5F5F5]"}`}>
                    <Icon className={`h-4 w-4 ${accent ? "text-[#FF4C00]" : "text-[#9A9A9A]"}`} />
                  </div>
                </div>
                <p className={`text-lg font-bold leading-tight ${accent ? "text-[#FF4C00]" : "text-[#0A0A0A]"}`} style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{value}</p>
                <p className="text-xs text-[#9A9A9A] mt-1">{sub}</p>
              </div>
            ))}
          </div>

          {/* Commission breakdown */}
          {overview && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-[#EFEFEF] p-5 space-y-4">
                <h3 className="text-sm font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Commission Breakdown — This Month</h3>
                {[
                  { label: "TVS Commission", value: overview.tvsCommission, icon: Receipt, color: "bg-[#FF4C00]/10 text-[#FF4C00]" },
                  { label: "Finance Commission", value: overview.financeCommission, icon: Building2, color: "bg-blue-50 text-blue-700" },
                  { label: "Insurance Commission", value: overview.insuranceCommission, icon: Shield, color: "bg-purple-50 text-purple-700" },
                ].map(({ label, value, icon: Icon, color }) => {
                  const total = overview.tvsCommission + overview.financeCommission + overview.insuranceCommission;
                  const pct = total > 0 ? (value / total) * 100 : 0;
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-sm text-[#4A4A4A] font-medium">{label}</span>
                        </div>
                        <span className="text-sm font-bold text-[#0A0A0A]">Rs. {value.toLocaleString("en", { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="h-1.5 bg-[#F5F5F5] rounded-full overflow-hidden">
                        <div className="h-full bg-[#FF4C00] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Upcoming cheques */}
              <div className="bg-white rounded-2xl border border-[#EFEFEF] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Upcoming Cheques (7 days)</h3>
                  {overview.overdueCount > 0 && (
                    <span className="text-xs font-bold px-2 py-1 rounded-xl bg-red-50 text-red-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{overview.overdueCount} overdue</span>
                  )}
                </div>
                {overview.urgentCheques.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-[#ABABAB]">
                    <CheckCircle2 className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-xs font-medium">No cheques due in the next 7 days</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {overview.urgentCheques.map((c) => {
                      const diff = Math.ceil((new Date(c.payment_date).getTime() - new Date().setHours(0,0,0,0)) / (1000*60*60*24));
                      return (
                        <div key={c.id} className="flex items-center gap-3 p-3 bg-[#FAFAFA] rounded-xl">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${diff === 0 ? "bg-[#FF4C00] text-white" : diff <= 2 ? "bg-amber-100 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                            <CreditCard className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-[#0A0A0A]">{c.cheque_number}</p>
                            <p className="text-xs text-[#9A9A9A] truncate">{c.pay_to || (c.type === "tvs" ? "TVS" : "Other")}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-bold text-[#0A0A0A]">Rs. {c.amount.toLocaleString()}</p>
                            <p className={`text-[10px] font-semibold ${diff === 0 ? "text-[#FF4C00]" : diff <= 2 ? "text-amber-600" : "text-[#9A9A9A]"}`}>
                              {diff === 0 ? "Today" : `${diff}d`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <Link href="/cheques/tvs" className="flex items-center gap-1 text-xs text-[#FF4C00] font-semibold hover:underline mt-1">
                  View all cheques <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "TVS Cheques", href: "/cheques/tvs", icon: CreditCard, desc: "Manage TVS payments" },
              { label: "Other Cheques", href: "/cheques/other", icon: CreditCard, desc: "Other cheque payments" },
              { label: "Expenses", href: "/expenses", icon: Wallet, desc: "Monthly expense tracker" },
              { label: "Reports", href: "/reports", icon: BarChart2, desc: "P&L and analytics" },
            ].map(({ label, href, icon: Icon, desc }) => (
              <Link key={href} href={href} className="bg-white rounded-2xl border border-[#EFEFEF] p-4 hover:border-[#FF4C00]/30 hover:shadow-[0_4px_16px_rgba(255,76,0,0.08)] transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#F5F5F5] group-hover:bg-[#FF4C00]/10 flex items-center justify-center transition-all">
                    <Icon className="h-4.5 w-4.5 text-[#9A9A9A] group-hover:text-[#FF4C00] transition-all" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-[#E0E0E0] group-hover:text-[#FF4C00] transition-all" />
                </div>
                <p className="text-sm font-bold text-[#0A0A0A]">{label}</p>
                <p className="text-xs text-[#9A9A9A] mt-0.5">{desc}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* TVS Cheques tab → redirect feel */}
      {tab === "tvs_cheques" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-[#F5F5F5] rounded-xl text-xs text-[#6B6B6B]">
            <CreditCard className="h-3.5 w-3.5" />
            <span>TVS Cheques are managed on the dedicated page.</span>
            <Link href="/cheques/tvs" className="text-[#FF4C00] font-semibold hover:underline ml-auto flex items-center gap-1">Open TVS Cheques <ChevronRight className="h-3 w-3" /></Link>
          </div>
          <ChequesEmbed type="tvs" />
        </div>
      )}
      {tab === "other_cheques" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-[#F5F5F5] rounded-xl text-xs text-[#6B6B6B]">
            <CreditCard className="h-3.5 w-3.5" />
            <span>Other Cheques are managed on the dedicated page.</span>
            <Link href="/cheques/other" className="text-[#FF4C00] font-semibold hover:underline ml-auto flex items-center gap-1">Open Other Cheques <ChevronRight className="h-3 w-3" /></Link>
          </div>
          <ChequesEmbed type="other" />
        </div>
      )}
      {tab === "expenses" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-[#F5F5F5] rounded-xl text-xs text-[#6B6B6B]">
            <Wallet className="h-3.5 w-3.5" />
            <span>Full expense management on the dedicated page.</span>
            <Link href="/expenses" className="text-[#FF4C00] font-semibold hover:underline ml-auto flex items-center gap-1">Open Expenses <ChevronRight className="h-3 w-3" /></Link>
          </div>
          <ExpensesEmbed />
        </div>
      )}
    </div>
  );
}

// ── Mini cheques embed ──
function ChequesEmbed({ type }: { type: "tvs" | "other" }) {
  const [data, setData] = useState<{ id: string; cheque_number: string; pay_to?: string; amount: number; payment_date?: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("cheques").select("id, cheque_number, pay_to, amount, payment_date, status").eq("type", type).order("payment_date", { ascending: true }).limit(20)
      .then(({ data: d }) => { setData(d || []); setLoading(false); });
  }, [type]);

  const STATUS_STYLE: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    successful: "bg-emerald-50 text-emerald-700",
    returned: "bg-red-50 text-red-600",
  };

  return (
    <div className="bg-white rounded-2xl border border-[#EFEFEF] overflow-hidden">
      <table className="w-full">
        <thead><tr className="border-b border-[#F0F0F0]">{["Cheque No.", "Pay To", "Amount", "Due Date", "Status"].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">{h}</th>)}</tr></thead>
        <tbody>
          {loading ? Array.from({length:3}).map((_,i) => <tr key={i} className="border-b border-[#F8F8F8]">{Array.from({length:5}).map((_,j) => <td key={j} className="px-5 py-4"><div className="h-4 bg-[#F0F0F0] rounded animate-pulse" /></td>)}</tr>) :
          data.length === 0 ? <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-[#ABABAB]">No cheques found</td></tr> :
          data.map(c => (
            <tr key={c.id} className="border-b border-[#F8F8F8] hover:bg-[#FAFAFA]">
              <td className="px-5 py-3"><span className="text-sm font-bold text-[#FF4C00] font-mono">{c.cheque_number}</span></td>
              <td className="px-5 py-3"><span className="text-sm text-[#0A0A0A]">{c.pay_to || "—"}</span></td>
              <td className="px-5 py-3"><span className="text-sm font-semibold text-[#0A0A0A]">Rs. {c.amount.toLocaleString()}</span></td>
              <td className="px-5 py-3"><span className="text-sm text-[#6B6B6B]">{c.payment_date ? new Date(c.payment_date).toLocaleDateString("en-GB", {day:"numeric",month:"short",year:"numeric"}) : "—"}</span></td>
              <td className="px-5 py-3"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[c.status] || "bg-[#F5F5F5] text-[#6B6B6B]"}`}>{c.status.charAt(0).toUpperCase()+c.status.slice(1)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Mini expenses embed ──
function ExpensesEmbed() {
  const [data, setData] = useState<{ id: string; category: string; description: string; amount: number; expense_date: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const now = new Date();
    const start = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`;
    supabase.from("expenses").select("id, category, description, amount, expense_date").gte("expense_date", start).order("expense_date", { ascending: false }).limit(20)
      .then(({ data: d }) => { setData(d || []); setLoading(false); });
  }, []);

  const CAT_COLORS: Record<string, string> = { rent:"bg-purple-50 text-purple-700", utilities:"bg-blue-50 text-blue-700", salary:"bg-emerald-50 text-emerald-700", broker_commission:"bg-orange-50 text-orange-700", bonus:"bg-amber-50 text-amber-700", petty_cash:"bg-gray-100 text-gray-700", other:"bg-slate-50 text-slate-700" };

  return (
    <div className="bg-white rounded-2xl border border-[#EFEFEF] overflow-hidden">
      <table className="w-full">
        <thead><tr className="border-b border-[#F0F0F0]">{["Date","Category","Description","Amount"].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">{h}</th>)}</tr></thead>
        <tbody>
          {loading ? Array.from({length:3}).map((_,i) => <tr key={i} className="border-b border-[#F8F8F8]">{Array.from({length:4}).map((_,j) => <td key={j} className="px-5 py-4"><div className="h-4 bg-[#F0F0F0] rounded animate-pulse" /></td>)}</tr>) :
          data.length === 0 ? <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-[#ABABAB]">No expenses this month</td></tr> :
          data.map(e => (
            <tr key={e.id} className="border-b border-[#F8F8F8] hover:bg-[#FAFAFA]">
              <td className="px-5 py-3"><span className="text-sm text-[#6B6B6B]">{new Date(e.expense_date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</span></td>
              <td className="px-5 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CAT_COLORS[e.category]||"bg-[#F5F5F5] text-[#6B6B6B]"}`}>{e.category.replace("_"," ")}</span></td>
              <td className="px-5 py-3"><span className="text-sm text-[#0A0A0A]">{e.description}</span></td>
              <td className="px-5 py-3"><span className="text-sm font-bold text-[#0A0A0A]">Rs. {e.amount.toLocaleString()}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
