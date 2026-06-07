"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  CheckCircle2, Clock, RotateCcw, Search, Plus, X,
  Building2, Shield, Landmark, Wallet,
} from "lucide-react";
import {
  markCommissionReceived,
  markCommissionPending,
  createStandaloneIncome,
  COMMISSION_CATEGORY_LABELS,
  INCOME_TAB_GROUPS,
  REVENUE_RECOGNITION_NOTE,
  type CommissionCategory,
  type IncomeTab,
} from "@/lib/finance/commission-records";

interface IncomeRow {
  id: string;
  sale_id: string | null;
  category: CommissionCategory;
  amount: number;
  status: "pending" | "received";
  received_at: string | null;
  income_date: string | null;
  description: string | null;
  created_at: string;
  sales: {
    invoice_number: string;
    sale_date: string;
    customers: { full_name: string } | { full_name: string }[] | null;
    inventory_bikes: { round_number: string; bike_models: { name: string } | { name: string }[] | null } | null;
  } | {
    invoice_number: string;
    sale_date: string;
    customers: { full_name: string } | { full_name: string }[] | null;
    inventory_bikes: { round_number: string; bike_models: { name: string } | { name: string }[] | null } | null;
  }[] | null;
}

const TAB_ICONS: Record<IncomeTab, React.ElementType> = {
  tvs: Building2,
  finance: Landmark,
  insurance: Shield,
  other: Wallet,
};

const TAB_COLORS: Record<IncomeTab, string> = {
  tvs: "text-orange-600 bg-orange-50 border-orange-100",
  finance: "text-blue-600 bg-blue-50 border-blue-100",
  insurance: "text-purple-600 bg-purple-50 border-purple-100",
  other: "text-emerald-600 bg-emerald-50 border-emerald-100",
};

function resolveSale(row: IncomeRow) {
  if (!row.sale_id) {
    return {
      invoice: "—",
      customer: row.description || "Manual entry",
      bike: "—",
      roundNumber: "—",
      source: "Added manually",
    };
  }
  const s = Array.isArray(row.sales) ? row.sales[0] : row.sales;
  if (!s) return { invoice: "—", customer: "—", bike: "—", roundNumber: "—", source: "From sale" };
  const c = Array.isArray(s.customers) ? s.customers[0] : s.customers;
  const ib = Array.isArray(s.inventory_bikes) ? s.inventory_bikes[0] : s.inventory_bikes;
  const bm = ib ? (Array.isArray(ib.bike_models) ? ib.bike_models[0] : ib.bike_models) : null;
  return {
    invoice: s.invoice_number,
    customer: c?.full_name || "—",
    bike: bm?.name || "—",
    roundNumber: ib?.round_number || "—",
    source: "From sale",
  };
}

export function IncomePanel() {
  const [tab, setTab] = useState<IncomeTab>("tvs");
  const [statusFilter, setStatusFilter] = useState<"pending" | "received" | "all">("all");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<IncomeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const categories = INCOME_TAB_GROUPS[tab].categories;
    let q = supabase
      .from("commission_records")
      .select(`
        id, sale_id, category, amount, status, received_at, income_date, description, created_at,
        sales(invoice_number, sale_date, customers(full_name), inventory_bikes(round_number, bike_models(name)))
      `)
      .in("category", categories)
      .order("created_at", { ascending: false })
      .limit(400);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    else setRows((data as unknown as IncomeRow[]) || []);
    setLoading(false);
  }, [tab, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleMarkReceived(id: string) {
    setMarking(id);
    try {
      await markCommissionReceived(createClient(), id);
      toast.success("Marked Received — added to revenue");
      load();
    } catch (e) {
      toast.error((e as Error).message || "Failed");
    }
    setMarking(null);
  }

  async function handleMarkPending(id: string) {
    if (!window.confirm("Revert to Pending? Removes from revenue.")) return;
    setMarking(id);
    try {
      await markCommissionPending(createClient(), id);
      toast.success("Marked Pending");
      load();
    } catch (e) {
      toast.error((e as Error).message || "Failed");
    }
    setMarking(null);
  }

  const q = search.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    if (!q) return true;
    const sale = resolveSale(row);
    return (
      sale.invoice.toLowerCase().includes(q) ||
      sale.customer.toLowerCase().includes(q) ||
      sale.roundNumber.toLowerCase().includes(q) ||
      (row.description || "").toLowerCase().includes(q) ||
      COMMISSION_CATEGORY_LABELS[row.category].toLowerCase().includes(q)
    );
  });

  const receivedTotal = filtered.filter((r) => r.status === "received").reduce((s, r) => s + r.amount, 0);
  const pendingTotal = filtered.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount, 0);
  const TabIcon = TAB_ICONS[tab];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(INCOME_TAB_GROUPS) as IncomeTab[]).map((t) => {
          const Icon = TAB_ICONS[t];
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 h-10 px-4 rounded-xl border text-sm font-semibold transition-all ${
                tab === t ? "border-[#FF4C00] bg-[#FF4C00]/5 text-[#FF4C00]" : "border-[#E8E8E8] text-[#6B6B6B] hover:bg-[#F5F5F5]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {INCOME_TAB_GROUPS[t].label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-xl border px-4 py-3 ${TAB_COLORS[tab]}`}>
          <p className="text-[10px] font-bold uppercase opacity-80">{INCOME_TAB_GROUPS[tab].label}</p>
          <p className="text-lg font-bold tabular-nums mt-1 flex items-center gap-2">
            <TabIcon className="h-4 w-4" />
            {filtered.length} records
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          <p className="text-[10px] font-bold text-emerald-700 uppercase">Received</p>
          <p className="text-xl font-bold text-emerald-800 tabular-nums">Rs. {receivedTotal.toLocaleString()}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <p className="text-[10px] font-bold text-amber-700 uppercase">Not Received</p>
          <p className="text-xl font-bold text-amber-800 tabular-nums">Rs. {pendingTotal.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-[#E8E8E8] rounded-xl px-4 py-3 flex items-center justify-end">
          <button onClick={() => setShowAdd(true)} className="r-btn-primary w-full justify-center">
            <Plus className="h-4 w-4" />
            {tab === "other" ? "Add Other Income" : "Add Income"}
          </button>
        </div>
      </div>

      <p className="text-xs text-[#9A9A9A]">{REVENUE_RECOGNITION_NOTE}</p>
      {tab !== "other" && (
        <p className="text-xs text-[#6B6B6B] bg-[#F5F7FA] rounded-lg px-3 py-2">
          <strong>{INCOME_TAB_GROUPS[tab].label}</strong> is created automatically when you complete a sale (New Sale → enter commission amounts). Mark <strong>Received</strong> when the money is actually in your account.
        </p>
      )}

      <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F0F0F0] flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice, round no., description..."
              className="r-input pl-9 w-full"
            />
          </div>
          <div className="flex gap-1 bg-[#F5F5F5] rounded-xl p-1">
            {(["all", "pending", "received"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`h-8 px-3 rounded-lg text-xs font-semibold capitalize ${statusFilter === f ? "bg-white shadow-sm" : "text-[#6B6B6B]"}`}
              >
                {f === "pending" ? "Not Received" : f === "received" ? "Received" : "All"}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F0F0F0]">
                {["Date", "Source", "Invoice", "Round No.", "Customer / Description", "Type", "Amount", "Status", "Action"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-[#9A9A9A] uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-[#F0F0F0] rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <Clock className="h-8 w-8 text-[#D0D0D0] mx-auto mb-2" />
                    <p className="text-sm font-semibold text-[#6B6B6B]">No {INCOME_TAB_GROUPS[tab].label.toLowerCase()} yet</p>
                    <p className="text-xs text-[#ABABAB] mt-1">
                      {tab === "other"
                        ? "Add other income manually or enter amounts on New Sale"
                        : "Complete a sale with this commission type, or add manually"}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const sale = resolveSale(row);
                  const busy = marking === row.id;
                  const dateStr = row.income_date || row.received_at?.split("T")[0] || row.created_at.split("T")[0];
                  return (
                    <tr key={row.id} className="border-b border-[#F8F8F8] hover:bg-[#FAFAFA]">
                      <td className="px-4 py-3 text-xs text-[#6B6B6B] whitespace-nowrap">
                        {new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.sale_id ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>
                          {sale.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-[#FF4C00] font-mono">{sale.invoice}</td>
                      <td className="px-4 py-3 text-xs font-bold text-[#FF4C00] font-mono">{sale.roundNumber}</td>
                      <td className="px-4 py-3 text-sm text-[#0A0A0A] max-w-[180px] truncate">{sale.customer}</td>
                      <td className="px-4 py-3 text-xs font-medium">{COMMISSION_CATEGORY_LABELS[row.category]}</td>
                      <td className="px-4 py-3 text-sm font-bold tabular-nums">Rs. {row.amount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.status === "received" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {row.status === "received" ? "Received" : "Not Received"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.status === "pending" ? (
                          <button onClick={() => handleMarkReceived(row.id)} disabled={busy} className="flex items-center gap-1 h-8 px-3 bg-emerald-600 text-white text-[11px] font-semibold rounded-lg disabled:opacity-60">
                            <CheckCircle2 className="h-3.5 w-3.5" />{busy ? "..." : "Received"}
                          </button>
                        ) : (
                          <button onClick={() => handleMarkPending(row.id)} disabled={busy} className="flex items-center gap-1 h-8 px-3 bg-[#F5F5F5] text-[11px] font-semibold rounded-lg border border-[#E8E8E8]">
                            <RotateCcw className="h-3.5 w-3.5" />{busy ? "..." : "Undo"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <AddIncomeModal
          defaultTab={tab}
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); load(); }}
        />
      )}
    </div>
  );
}

function AddIncomeModal({
  defaultTab,
  onClose,
  onSuccess,
}: {
  defaultTab: IncomeTab;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const defaultCategory = INCOME_TAB_GROUPS[defaultTab].categories[0];
  const [form, setForm] = useState({
    category: defaultCategory as CommissionCategory,
    description: "",
    amount: "",
    income_date: new Date().toISOString().split("T")[0],
    markReceived: false,
  });
  const [saving, setSaving] = useState(false);

  const categoryOptions: CommissionCategory[] =
    defaultTab === "other"
      ? ["transport", "documentation", "other"]
      : INCOME_TAB_GROUPS[defaultTab].categories;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) {
      toast.error("Description is required");
      return;
    }
    setSaving(true);
    try {
      await createStandaloneIncome(createClient(), {
        category: form.category,
        amount: parseFloat(form.amount) || 0,
        description: form.description,
        income_date: form.income_date,
        markReceived: form.markReceived,
      });
      toast.success(form.markReceived ? "Income added as Received" : "Income added — Not Received yet");
      onSuccess();
    } catch (err) {
      toast.error((err as Error).message || "Failed to add income");
    }
    setSaving(false);
  }

  return (
    <div className="r-modal-overlay">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="r-modal relative max-w-md w-full">
        <div className="r-modal-header">
          <h3 className="text-[15px] font-bold">Add Income</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="r-modal-body space-y-4">
          <div>
            <label className="r-label">Income type</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as CommissionCategory })}
              className="r-select w-full"
            >
              {categoryOptions.map((c) => (
                <option key={c} value={c}>{COMMISSION_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="r-label">Description <span className="text-[#FF4C00]">*</span></label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              placeholder="e.g. Spare parts commission, workshop fee..."
              className="r-input w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="r-label">Amount (Rs.)</label>
              <input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required className="r-input w-full" />
            </div>
            <div>
              <label className="r-label">Date</label>
              <input type="date" value={form.income_date} onChange={(e) => setForm({ ...form, income_date: e.target.value })} className="r-input w-full" />
            </div>
          </div>
          <div className="bg-[#F5F7FA] rounded-xl p-4 space-y-3">
            <p className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wide">Received?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, markReceived: false })}
                className={`h-10 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  !form.markReceived
                    ? "border-amber-400 bg-amber-50 text-amber-800"
                    : "border-[#E8E8E8] text-[#6B6B6B] hover:bg-white"
                }`}
              >
                <Clock className="h-4 w-4" />
                Not Received
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, markReceived: true })}
                className={`h-10 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  form.markReceived
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : "border-[#E8E8E8] text-[#6B6B6B] hover:bg-white"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                Received
              </button>
            </div>
            <p className="text-[11px] text-[#9A9A9A] leading-relaxed">
              {form.markReceived
                ? "Money is in your account — this will count in revenue, dashboard, and reports."
                : "Still waiting for payment — shows as pending until you mark it Received later."}
            </p>
          </div>
        </form>
        <div className="r-modal-footer">
          <button type="button" onClick={onClose} className="r-btn-secondary">Cancel</button>
          <button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={saving} className="r-btn-primary disabled:opacity-60">
            {saving ? "Saving..." : "Add Income"}
          </button>
        </div>
      </div>
    </div>
  );
}
