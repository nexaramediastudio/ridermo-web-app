"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, Search, Wallet, X, ChevronLeft, ChevronRight, Receipt, TrendingDown } from "lucide-react";

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

const CATEGORY_CONFIG: Record<ExpenseCategory, { label: string; badge: string }> = {
  rent:              { label: "Rent",              badge: "r-badge-purple" },
  utilities:         { label: "Utilities",         badge: "r-badge-blue" },
  salary:            { label: "Salary",            badge: "r-badge-green" },
  broker_commission: { label: "Broker Commission", badge: "r-badge-orange" },
  bonus:             { label: "Bonus",             badge: "r-badge-amber" },
  petty_cash:        { label: "Petty Cash",        badge: "r-badge-gray" },
  other:             { label: "Other",             badge: "r-badge-gray" },
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function ExpensesPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<"all" | ExpenseCategory>("all");
  const [showAdd, setShowAdd] = useState(false);

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

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const filteredTotal = filtered.reduce((sum, e) => sum + e.amount, 0);

  const byCategory = Object.keys(CATEGORY_CONFIG).reduce((acc, cat) => {
    acc[cat] = expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <TrendingDown className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h1 className="r-page-title">Expenses</h1>
            <p className="r-page-sub">{expenses.length} entries · {MONTHS[month - 1]} {year}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Month selector */}
          <div className="flex items-center gap-1 bg-[#F0F0F0] rounded-xl p-1">
            <button onClick={() => changeMonth(-1)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white transition-colors">
              <ChevronLeft className="h-4 w-4 text-[#6B6B6B]" />
            </button>
            <span className="text-[13px] font-bold text-[#0A0A0A] px-3 min-w-[120px] text-center">{MONTHS[month - 1]} {year}</span>
            <button onClick={() => changeMonth(1)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white transition-colors">
              <ChevronRight className="h-4 w-4 text-[#6B6B6B]" />
            </button>
          </div>
          <button onClick={() => setShowAdd(true)} className="r-btn-primary">
            <Plus className="h-4 w-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="r-kpi col-span-1">
          <div className="flex items-center justify-between mb-3">
            <span className="r-page-sub">Total This Month</span>
            <Wallet className="h-4 w-4 text-[#ABABAB]" />
          </div>
          <p className="text-2xl font-bold font-display text-[#FF4C00]">Rs. {totalAmount.toLocaleString("en", { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="r-kpi">
          <div className="flex items-center justify-between mb-3">
            <span className="r-page-sub">Entries</span>
            <Receipt className="h-4 w-4 text-[#ABABAB]" />
          </div>
          <p className="text-2xl font-bold font-display text-[#0A0A0A]">{expenses.length}</p>
        </div>
        <div className="r-kpi">
          <div className="flex items-center justify-between mb-3">
            <span className="r-page-sub">Largest Category</span>
            <TrendingDown className="h-4 w-4 text-[#ABABAB]" />
          </div>
          <p className="text-[13px] font-bold text-[#0A0A0A]">
            {Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]
              ? CATEGORY_CONFIG[Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0][0] as ExpenseCategory]?.label
              : "—"}
          </p>
        </div>
      </div>

      {/* Category breakdown */}
      {Object.entries(byCategory).some(([, v]) => v > 0) && (
        <div className="r-card-p">
          <p className="r-section-title mb-3">Breakdown by Category</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
              const amount = byCategory[key] || 0;
              if (amount === 0) return null;
              const pct = totalAmount ? Math.round((amount / totalAmount) * 100) : 0;
              return (
                <button
                  key={key}
                  onClick={() => setCatFilter(catFilter === key as ExpenseCategory ? "all" : key as ExpenseCategory)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all ${
                    catFilter === key
                      ? "border-[#FF4C00] bg-[#FF4C00]/5"
                      : "border-[#E8E8E8] bg-white hover:border-[#D0D0D0]"
                  }`}
                >
                  <span className={`${cfg.badge} text-[10px] font-bold px-2 py-0.5 rounded-full`}>{cfg.label}</span>
                  <span className="text-[12px] font-bold text-[#0A0A0A]">Rs. {amount.toLocaleString("en", { maximumFractionDigits: 0 })}</span>
                  <span className="text-[10px] text-[#ABABAB]">{pct}%</span>
                </button>
              );
            })}
            {catFilter !== "all" && (
              <button onClick={() => setCatFilter("all")} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-[#E8E8E8] text-[11px] text-[#9A9A9A] hover:bg-[#F5F5F5]">
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="r-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F0F0F0] flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description..."
              className="r-input pl-9"
            />
          </div>
          <span className="ml-auto text-[11px] text-[#ABABAB] font-medium">{filtered.length} entries</span>
        </div>

        <table className="r-table">
          <thead>
            <tr className="r-thead-row">
              <th className="r-th">Date</th>
              <th className="r-th">Category</th>
              <th className="r-th">Description</th>
              <th className="r-th">Notes</th>
              <th className="r-th text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[#F5F5F5]">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="r-td"><div className="h-4 bg-[#F0F0F0] rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#F5F5F5] flex items-center justify-center mx-auto mb-3">
                    <Wallet className="h-7 w-7 text-[#ABABAB]" />
                  </div>
                  <p className="text-[13px] font-semibold text-[#4A4A4A]">No expenses this month</p>
                  <button onClick={() => setShowAdd(true)} className="mt-3 r-btn-primary mx-auto">
                    <Plus className="h-3.5 w-3.5" /> Add Expense
                  </button>
                </td>
              </tr>
            ) : (
              filtered.map((exp) => {
                const cfg = CATEGORY_CONFIG[exp.category];
                return (
                  <tr key={exp.id} className="r-tr">
                    <td className="r-td">
                      <span className="text-[12px] text-[#6B6B6B]">
                        {new Date(exp.expense_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </td>
                    <td className="r-td">
                      <span className={`${cfg.badge} text-[10px]`}>{cfg.label}</span>
                    </td>
                    <td className="r-td">
                      <span className="text-[13px] text-[#0A0A0A] font-medium">{exp.description}</span>
                    </td>
                    <td className="r-td">
                      {exp.notes && <span className="text-[11px] text-[#9A9A9A] italic">{exp.notes}</span>}
                    </td>
                    <td className="r-td text-right">
                      <span className="text-[13px] font-bold text-[#0A0A0A]">
                        Rs. {exp.amount.toLocaleString("en", { maximumFractionDigits: 0 })}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-[#F0F0F0] bg-[#FAFAFA] flex items-center justify-between">
            <span className="text-[11px] text-[#ABABAB]">{filtered.length} entries</span>
            <span className="text-[13px] font-bold text-[#0A0A0A]">
              Total: Rs. {filteredTotal.toLocaleString("en", { maximumFractionDigits: 0 })}
            </span>
          </div>
        )}
      </div>

      {showAdd && (
        <AddExpenseModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); loadExpenses(); }}
        />
      )}
    </div>
  );
}

function AddExpenseModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    category: "petty_cash",
    description: "",
    amount: "",
    expense_date: new Date().toISOString().split("T")[0],
    notes: "",
  });
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
    <div className="r-modal-overlay">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="r-modal relative max-w-md w-full">
        <div className="r-modal-header">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
              <Plus className="h-4 w-4 text-red-500" />
            </div>
            <h3 className="text-[15px] font-bold text-[#0A0A0A] font-display">Add Expense</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5]">
            <X className="h-4 w-4 text-[#6B6B6B]" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="r-modal-body">
          <div>
            <label className="r-label">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="r-select"
            >
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="r-label">Description <span className="text-[#FF4C00]">*</span></label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              placeholder="Describe the expense"
              className="r-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="r-label">Amount (Rs.) <span className="text-[#FF4C00]">*</span></label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
                placeholder="0"
                className="r-input"
              />
            </div>
            <div>
              <label className="r-label">Date</label>
              <input
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                className="r-input"
              />
            </div>
          </div>
          <div>
            <label className="r-label">Notes (optional)</label>
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional notes"
              className="r-input"
            />
          </div>
        </form>
        <div className="r-modal-footer">
          <button type="button" onClick={onClose} className="r-btn-secondary">Cancel</button>
          <button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={saving} className="r-btn-primary disabled:opacity-60">
            {saving ? "Saving..." : "Add Expense"}
          </button>
        </div>
      </div>
    </div>
  );
}
