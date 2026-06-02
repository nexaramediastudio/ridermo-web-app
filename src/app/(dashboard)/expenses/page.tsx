"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, Search, Wallet, X, ChevronLeft, ChevronRight } from "lucide-react";

type ExpenseCategory = "rent" | "utilities" | "salary" | "broker_commission" | "bonus" | "petty_cash" | "other";

interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expense_date: string;
  notes?: string;
  created_at: string;
}

const CATEGORY_CONFIG: Record<ExpenseCategory, { label: string; color: string; bg: string }> = {
  rent: { label: "Rent", color: "text-purple-700", bg: "bg-purple-50" },
  utilities: { label: "Utilities", color: "text-blue-700", bg: "bg-blue-50" },
  salary: { label: "Salary", color: "text-emerald-700", bg: "bg-emerald-50" },
  broker_commission: { label: "Broker Commission", color: "text-orange-700", bg: "bg-orange-50" },
  bonus: { label: "Bonus", color: "text-amber-700", bg: "bg-amber-50" },
  petty_cash: { label: "Petty Cash", color: "text-gray-700", bg: "bg-gray-100" },
  other: { label: "Other", color: "text-slate-700", bg: "bg-slate-50" },
};

export default function ExpensesPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<"all" | ExpenseCategory>("all");
  const [showAdd, setShowAdd] = useState(false);

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .gte("expense_date", startDate)
      .lt("expense_date", endDate)
      .order("expense_date", { ascending: false });
    if (error) toast.error("Failed to load expenses");
    else setExpenses(data || []);
    setLoading(false);
  }, [month, year]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  function changeMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
  }

  const filtered = expenses.filter((e) => {
    const matchSearch = !search || e.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "all" || e.category === catFilter;
    return matchSearch && matchCat;
  });

  const totalAmount = filtered.reduce((sum, e) => sum + e.amount, 0);
  const byCategory = Object.keys(CATEGORY_CONFIG).reduce((acc, cat) => {
    acc[cat] = expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-5 max-w-[1200px]">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Expenses</h2>
          <p className="text-sm text-[#9A9A9A] mt-0.5">{expenses.length} entries this month</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 h-9 px-4 bg-[#FF4C00] hover:bg-[#E64400] text-white text-sm font-semibold rounded-xl transition-all">
          <Plus className="h-4 w-4" /> Add Expense
        </button>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="bg-white rounded-2xl border border-[#EFEFEF] p-3 flex items-center gap-3">
          <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center rounded-xl border border-[#E5E5E5] hover:bg-[#F5F5F5]"><ChevronLeft className="h-4 w-4 text-[#6B6B6B]" /></button>
          <span className="text-sm font-bold text-[#0A0A0A] w-28 text-center">{MONTHS[month - 1]} {year}</span>
          <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center rounded-xl border border-[#E5E5E5] hover:bg-[#F5F5F5]"><ChevronRight className="h-4 w-4 text-[#6B6B6B]" /></button>
        </div>
        <div className="bg-[#FF4C00]/5 border border-[#FF4C00]/20 rounded-2xl p-3 px-4">
          <p className="text-xs text-[#9A9A9A] font-medium">Total Expenses</p>
          <p className="text-lg font-bold text-[#FF4C00]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Rs. {totalAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
          const amount = byCategory[key] || 0;
          if (amount === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setCatFilter(catFilter === key as ExpenseCategory ? "all" : key as ExpenseCategory)}
              className={`p-3 rounded-xl border transition-all text-left ${catFilter === key ? "border-[#FF4C00] shadow-[0_0_0_2px_rgba(255,76,0,0.1)]" : "border-[#EFEFEF] bg-white hover:border-[#E0E0E0]"}`}
            >
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
              <p className="text-sm font-bold text-[#0A0A0A] mt-2">Rs. {amount.toLocaleString("en", { maximumFractionDigits: 0 })}</p>
            </button>
          );
        })}
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search description..." className="w-full h-9 pl-9 pr-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white" />
        </div>
        {catFilter !== "all" && (
          <button onClick={() => setCatFilter("all")} className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#E5E5E5] text-sm text-[#6B6B6B] hover:bg-[#F5F5F5]">
            <X className="h-3.5 w-3.5" /> Clear filter
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#EFEFEF] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#F0F0F0]">
              {["Date", "Category", "Description", "Amount", ""].map((h) => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-[#F8F8F8]">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-4 bg-[#F0F0F0] rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-14 text-center">
                <Wallet className="h-10 w-10 mx-auto mb-3 text-[#E0E0E0]" />
                <p className="text-sm font-semibold text-[#6B6B6B]">No expenses this month</p>
                <button onClick={() => setShowAdd(true)} className="mt-3 flex items-center gap-2 h-8 px-4 bg-[#FF4C00] text-white text-xs font-semibold rounded-xl mx-auto"><Plus className="h-3.5 w-3.5" /> Add Expense</button>
              </td></tr>
            ) : (
              filtered.map((exp) => {
                const cfg = CATEGORY_CONFIG[exp.category];
                return (
                  <tr key={exp.id} className="border-b border-[#F8F8F8] hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-4"><span className="text-sm text-[#6B6B6B]">{new Date(exp.expense_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span></td>
                    <td className="px-5 py-4"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span></td>
                    <td className="px-5 py-4"><span className="text-sm text-[#0A0A0A]">{exp.description}</span></td>
                    <td className="px-5 py-4"><span className="text-sm font-bold text-[#0A0A0A]">Rs. {exp.amount.toLocaleString()}</span></td>
                    <td className="px-5 py-4">{exp.notes && <span className="text-xs text-[#9A9A9A] italic">{exp.notes}</span>}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="border-t border-[#F0F0F0] px-5 py-3 flex items-center justify-between bg-[#FAFAFA]">
            <span className="text-xs text-[#9A9A9A] font-medium">{filtered.length} entries</span>
            <span className="text-sm font-bold text-[#0A0A0A]">Total: Rs. {filtered.reduce((s, e) => s + e.amount, 0).toLocaleString()}</span>
          </div>
        )}
      </div>

      {showAdd && (
        <AddExpenseModal onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); loadExpenses(); }} />
      )}
    </div>
  );
}

function AddExpenseModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ category: "petty_cash", description: "", amount: "", expense_date: new Date().toISOString().split("T")[0], notes: "" });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("expenses").insert({ ...form, amount: parseFloat(form.amount) || 0 });
    if (error) toast.error(error.message);
    else { toast.success("Expense added"); onSuccess(); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#EFEFEF] z-10">
        <div className="flex items-center justify-between p-6 border-b border-[#F0F0F0]">
          <h3 className="text-lg font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Add Expense</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#F5F5F5]"><X className="h-4 w-4 text-[#6B6B6B]" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#1A1A1A]">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white">
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#1A1A1A]">Description <span className="text-[#FF4C00]">*</span></label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required placeholder="Describe the expense" className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Amount (Rs.) <span className="text-[#FF4C00]">*</span></label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required placeholder="0" className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Date</label>
              <input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#1A1A1A]">Notes (optional)</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes" className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-[#E5E5E5] text-sm font-semibold text-[#4A4A4A] hover:bg-[#F5F5F5]">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-10 bg-[#FF4C00] hover:bg-[#E64400] text-white text-sm font-semibold rounded-xl disabled:opacity-60">{saving ? "Saving..." : "Add Expense"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
