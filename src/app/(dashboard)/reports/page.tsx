"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Download, TrendingUp, TrendingDown, DollarSign, Bike, ChevronLeft, ChevronRight } from "lucide-react";

interface MonthlySummary {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  sales_count: number;
}

export default function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthlyData, setMonthlyData] = useState<MonthlySummary[]>([]);
  const [currentMonth, setCurrentMonth] = useState<{
    revenue: number; expenses: number; profit: number;
    tvs_commission: number; finance_commission: number; insurance_commission: number;
    sales_count: number; cash_sales: number; finance_sales: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const loadReports = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const currentMonthNum = now.getMonth() + 1;
    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year + 1}-01-01`;
    const startOfMonth = `${year}-${String(currentMonthNum).padStart(2, "0")}-01`;
    const endOfMonth = currentMonthNum === 12 ? `${year + 1}-01-01` : `${year}-${String(currentMonthNum + 1).padStart(2, "0")}-01`;

    const [salesRes, expensesRes] = await Promise.all([
      supabase.from("sales").select("sale_date, total_amount, payment_type, tvs_commission, finance_commission, insurance_commission").gte("sale_date", startOfYear).lt("sale_date", endOfYear).eq("status", "completed"),
      supabase.from("expenses").select("expense_date, amount").gte("expense_date", startOfYear).lt("expense_date", endOfYear),
    ]);

    const sales = salesRes.data || [];
    const expenses = expensesRes.data || [];

    // Build monthly data
    const monthly: MonthlySummary[] = MONTHS_SHORT.map((m, idx) => {
      const monthStr = `${year}-${String(idx + 1).padStart(2, "0")}`;
      const monthSales = sales.filter((s) => s.sale_date.startsWith(monthStr));
      const monthExpenses = expenses.filter((e) => e.expense_date.startsWith(monthStr));
      const revenue = monthSales.reduce((s, sale) => s + sale.total_amount, 0);
      const expense = monthExpenses.reduce((s, e) => s + e.amount, 0);
      return { month: m, revenue, expenses: expense, profit: revenue - expense, sales_count: monthSales.length };
    });
    setMonthlyData(monthly);

    // Current month summary
    const cmSales = sales.filter((s) => s.sale_date >= startOfMonth && s.sale_date < endOfMonth);
    const cmExpenses = expenses.filter((e) => e.expense_date >= startOfMonth && e.expense_date < endOfMonth);
    const revenue = cmSales.reduce((s, sale) => s + sale.total_amount, 0);
    const expense = cmExpenses.reduce((s, e) => s + e.amount, 0);
    setCurrentMonth({
      revenue,
      expenses: expense,
      profit: revenue - expense,
      tvs_commission: cmSales.reduce((s, sale) => s + (sale.tvs_commission || 0), 0),
      finance_commission: cmSales.reduce((s, sale) => s + (sale.finance_commission || 0), 0),
      insurance_commission: cmSales.reduce((s, sale) => s + (sale.insurance_commission || 0), 0),
      sales_count: cmSales.length,
      cash_sales: cmSales.filter((s) => s.payment_type === "cash").length,
      finance_sales: cmSales.filter((s) => s.payment_type === "finance").length,
    });

    setLoading(false);
  }, [year]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const totalYearRevenue = monthlyData.reduce((s, m) => s + m.revenue, 0);
  const totalYearProfit = monthlyData.reduce((s, m) => s + m.profit, 0);

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Reports</h2>
          <p className="text-sm text-[#9A9A9A] mt-0.5">Financial overview and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-[#EFEFEF] rounded-xl p-2">
            <button onClick={() => setYear(y => y - 1)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5]"><ChevronLeft className="h-3.5 w-3.5 text-[#6B6B6B]" /></button>
            <span className="text-sm font-bold text-[#0A0A0A] w-12 text-center">{year}</span>
            <button onClick={() => setYear(y => y + 1)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5]"><ChevronRight className="h-3.5 w-3.5 text-[#6B6B6B]" /></button>
          </div>
          <button className="flex items-center gap-2 h-9 px-4 border border-[#E5E5E5] text-sm font-semibold text-[#4A4A4A] rounded-xl hover:bg-[#F5F5F5]">
            <Download className="h-3.5 w-3.5" /> Export PDF
          </button>
        </div>
      </div>

      {/* Current month KPIs */}
      {currentMonth && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: `This Month Revenue`, value: `Rs. ${currentMonth.revenue.toLocaleString("en", { maximumFractionDigits: 0 })}`, sub: `${currentMonth.sales_count} sales`, icon: TrendingUp, accent: true },
            { label: "This Month Profit", value: `Rs. ${currentMonth.profit.toLocaleString("en", { maximumFractionDigits: 0 })}`, sub: `After Rs. ${currentMonth.expenses.toLocaleString("en", { maximumFractionDigits: 0 })} expenses`, icon: DollarSign },
            { label: "Commission Earned", value: `Rs. ${(currentMonth.tvs_commission + currentMonth.finance_commission + currentMonth.insurance_commission).toLocaleString("en", { maximumFractionDigits: 0 })}`, sub: "TVS + Finance + Insurance", icon: TrendingUp },
            { label: "Sales Split", value: `${currentMonth.cash_sales}C / ${currentMonth.finance_sales}F`, sub: "Cash / Finance", icon: Bike },
          ].map(({ label, value, sub, icon: Icon, accent }) => (
            <div key={label} className={`bg-white rounded-2xl border p-4 ${accent ? "border-[#FF4C00]/20" : "border-[#EFEFEF]"}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">{label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? "bg-[#FF4C00]/10" : "bg-[#F5F5F5]"}`}>
                  <Icon className={`h-4 w-4 ${accent ? "text-[#FF4C00]" : "text-[#9A9A9A]"}`} />
                </div>
              </div>
              <p className={`text-lg font-bold ${accent ? "text-[#FF4C00]" : "text-[#0A0A0A]"}`} style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{value}</p>
              <p className="text-xs text-[#9A9A9A] mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Year overview cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#EFEFEF] p-4">
          <p className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">Year Revenue</p>
          <p className="text-2xl font-bold text-[#0A0A0A] mt-1" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Rs. {totalYearRevenue.toLocaleString("en", { maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-[#9A9A9A] mt-0.5">{monthlyData.reduce((s, m) => s + m.sales_count, 0)} total sales in {year}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#EFEFEF] p-4">
          <p className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">Year Profit</p>
          <p className={`text-2xl font-bold mt-1 ${totalYearProfit >= 0 ? "text-emerald-600" : "text-red-500"}`} style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
            {totalYearProfit >= 0 ? "" : "- "}Rs. {Math.abs(totalYearProfit).toLocaleString("en", { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-[#9A9A9A] mt-0.5">Revenue minus expenses</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue & Expenses bar chart */}
        <div className="bg-white rounded-2xl border border-[#EFEFEF] p-5">
          <h3 className="text-sm font-bold text-[#0A0A0A] mb-4" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Monthly Revenue vs Expenses — {year}</h3>
          {loading ? (
            <div className="h-48 bg-[#F5F5F5] rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9A9A9A" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9A9A9A" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value) => [`Rs. ${Number(value).toLocaleString("en", { maximumFractionDigits: 0 })}`, ""]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #EFEFEF", fontSize: "12px" }}
                />
                <Bar dataKey="revenue" fill="#FF4C00" radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="expenses" fill="#F0F0F0" radius={[4, 4, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Profit line chart */}
        <div className="bg-white rounded-2xl border border-[#EFEFEF] p-5">
          <h3 className="text-sm font-bold text-[#0A0A0A] mb-4" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Monthly Profit — {year}</h3>
          {loading ? (
            <div className="h-48 bg-[#F5F5F5] rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9A9A9A" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9A9A9A" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value) => [`Rs. ${Number(value).toLocaleString("en", { maximumFractionDigits: 0 })}`, "Profit"]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #EFEFEF", fontSize: "12px" }}
                />
                <Line type="monotone" dataKey="profit" stroke="#FF4C00" strokeWidth={2.5} dot={{ fill: "#FF4C00", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Monthly breakdown table */}
      <div className="bg-white rounded-2xl border border-[#EFEFEF] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F0F0F0]">
          <h3 className="text-sm font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Monthly Breakdown — {year}</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#F0F0F0]">
              {["Month", "Sales", "Revenue", "Expenses", "Profit", "Margin"].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((m, idx) => {
              const margin = m.revenue > 0 ? ((m.profit / m.revenue) * 100).toFixed(1) : "0.0";
              const isPositive = m.profit >= 0;
              return (
                <tr key={m.month} className={`border-b border-[#F8F8F8] hover:bg-[#FAFAFA] transition-colors ${idx + 1 === now.getMonth() + 1 && year === now.getFullYear() ? "bg-[#FF4C00]/3" : ""}`}>
                  <td className="px-5 py-3.5">
                    <span className={`text-sm font-semibold ${idx + 1 === now.getMonth() + 1 && year === now.getFullYear() ? "text-[#FF4C00]" : "text-[#0A0A0A]"}`}>{m.month} {year}</span>
                    {idx + 1 === now.getMonth() + 1 && year === now.getFullYear() && <span className="ml-2 text-[10px] font-bold text-[#FF4C00] bg-[#FF4C00]/10 px-1.5 py-0.5 rounded-full">Current</span>}
                  </td>
                  <td className="px-5 py-3.5"><span className="text-sm text-[#4A4A4A]">{m.sales_count}</span></td>
                  <td className="px-5 py-3.5"><span className="text-sm font-semibold text-[#0A0A0A]">{m.revenue > 0 ? `Rs. ${m.revenue.toLocaleString("en", { maximumFractionDigits: 0 })}` : "—"}</span></td>
                  <td className="px-5 py-3.5"><span className="text-sm text-[#4A4A4A]">{m.expenses > 0 ? `Rs. ${m.expenses.toLocaleString("en", { maximumFractionDigits: 0 })}` : "—"}</span></td>
                  <td className="px-5 py-3.5"><span className={`text-sm font-bold ${isPositive ? "text-emerald-600" : "text-red-500"}`}>{m.revenue > 0 ? `${isPositive ? "" : "-"}Rs. ${Math.abs(m.profit).toLocaleString("en", { maximumFractionDigits: 0 })}` : "—"}</span></td>
                  <td className="px-5 py-3.5">
                    {m.revenue > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[80px] h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${isPositive ? "bg-emerald-500" : "bg-red-400"}`} style={{ width: `${Math.min(100, Math.abs(parseFloat(margin)))}%` }} />
                        </div>
                        <span className={`text-xs font-semibold ${isPositive ? "text-emerald-600" : "text-red-500"}`}>{margin}%</span>
                      </div>
                    ) : <span className="text-[#ABABAB] text-xs">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
