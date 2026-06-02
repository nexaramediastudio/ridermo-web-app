"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Plus, Search, CreditCard, AlertTriangle, CheckCircle2,
  XCircle, Clock, X, CalendarDays, DollarSign, Filter,
} from "lucide-react";

type ChequeStatus = "pending" | "successful" | "returned";
type ChequeType = "tvs" | "other";

interface Cheque {
  id: string;
  type: ChequeType;
  cheque_number: string;
  description?: string;
  pay_to?: string;
  issue_date?: string;
  payment_date?: string;
  amount: number;
  bank?: string;
  status: ChequeStatus;
  notes?: string;
  created_at: string;
}

const STATUS_CONFIG: Record<ChequeStatus, { label: string; icon: React.ElementType; style: string; dot: string }> = {
  pending: { label: "Pending", icon: Clock, style: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-400" },
  successful: { label: "Cleared", icon: CheckCircle2, style: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-500" },
  returned: { label: "Returned", icon: XCircle, style: "bg-red-50 text-red-600 border-red-100", dot: "bg-red-500" },
};

function daysDiff(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function DueBadge({ date }: { date?: string }) {
  if (!date) return null;
  const diff = daysDiff(date);
  if (diff < 0) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">{Math.abs(diff)}d overdue</span>;
  if (diff === 0) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF4C00] text-white">Due today</span>;
  if (diff <= 3) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Due in {diff}d</span>;
  if (diff <= 7) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Due in {diff}d</span>;
  return null;
}

export function ChequesView({ type }: { type: ChequeType }) {
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ChequeStatus>("all");
  const [showAdd, setShowAdd] = useState(false);

  const loadCheques = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("cheques")
      .select("*")
      .eq("type", type)
      .order("payment_date", { ascending: true });
    if (error) toast.error("Failed to load cheques");
    else setCheques(data || []);
    setLoading(false);
  }, [type]);

  useEffect(() => { loadCheques(); }, [loadCheques]);

  const filtered = cheques.filter((c) => {
    const matchSearch = !search ||
      c.cheque_number.toLowerCase().includes(search.toLowerCase()) ||
      c.pay_to?.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase()) ||
      c.bank?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Alert: pending cheques due within 3 days
  const urgentCheques = cheques.filter((c) => {
    if (c.status !== "pending" || !c.payment_date) return false;
    const diff = daysDiff(c.payment_date);
    return diff <= 3;
  });

  const totalPending = cheques.filter((c) => c.status === "pending").reduce((s, c) => s + c.amount, 0);
  const totalCleared = cheques.filter((c) => c.status === "successful").reduce((s, c) => s + c.amount, 0);

  async function updateStatus(id: string, status: ChequeStatus) {
    const supabase = createClient();
    await supabase.from("cheques").update({ status }).eq("id", id);
    toast.success(`Cheque marked as ${STATUS_CONFIG[status].label}`);
    loadCheques();
  }

  const title = type === "tvs" ? "TVS Cheques" : "Other Cheques";

  return (
    <div className="space-y-5 max-w-[1300px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{title}</h2>
          <p className="text-sm text-[#9A9A9A] mt-0.5">{cheques.filter((c) => c.status === "pending").length} pending</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 h-9 px-4 bg-[#FF4C00] hover:bg-[#E64400] text-white text-sm font-semibold rounded-xl transition-all"
        >
          <Plus className="h-4 w-4" /> Add Cheque
        </button>
      </div>

      {/* Urgent alerts */}
      {urgentCheques.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-bold text-amber-800">
              {urgentCheques.length} cheque{urgentCheques.length > 1 ? "s" : ""} due within 3 days
            </span>
          </div>
          <div className="space-y-1.5">
            {urgentCheques.map((c) => (
              <div key={c.id} className="flex items-center gap-3 text-sm text-amber-700">
                <span className="font-mono font-semibold">{c.cheque_number}</span>
                <span>{c.pay_to}</span>
                <span className="font-bold">Rs. {c.amount.toLocaleString()}</span>
                <DueBadge date={c.payment_date} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Pending", value: `Rs. ${totalPending.toLocaleString()}`, count: cheques.filter((c) => c.status === "pending").length, accent: true },
          { label: "Cleared", value: `Rs. ${totalCleared.toLocaleString()}`, count: cheques.filter((c) => c.status === "successful").length, accent: false },
          { label: "Returned", value: `${cheques.filter((c) => c.status === "returned").length}`, count: null, accent: false },
          { label: "Total Cheques", value: `${cheques.length}`, count: null, accent: false },
        ].map(({ label, value, count, accent }) => (
          <div key={label} className={`bg-white rounded-2xl border p-4 ${accent ? "border-[#FF4C00]/20" : "border-[#EFEFEF]"}`}>
            <span className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">{label}</span>
            <p className={`text-lg font-bold mt-2 ${accent ? "text-[#FF4C00]" : "text-[#0A0A0A]"}`} style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
              {value}
            </p>
            {count !== null && <p className="text-xs text-[#9A9A9A] mt-0.5">{count} cheques</p>}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cheque no., payee, bank..."
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white"
          />
        </div>
        <div className="flex items-center gap-1 bg-[#F5F5F5] rounded-xl p-1">
          {(["all", "pending", "successful", "returned"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`h-7 px-3 rounded-lg text-xs font-semibold transition-all capitalize ${statusFilter === s ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#6B6B6B]"}`}>
              {s === "all" ? "All" : STATUS_CONFIG[s as ChequeStatus]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#EFEFEF] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F0F0F0]">
                {["Cheque No.", "Pay To", "Description", "Bank", "Issue Date", "Payment Date", "Amount", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#F8F8F8]">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-[#F0F0F0] rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-14 text-center">
                  <CreditCard className="h-10 w-10 mx-auto mb-3 text-[#E0E0E0]" />
                  <p className="text-sm font-semibold text-[#6B6B6B]">No cheques found</p>
                  <button onClick={() => setShowAdd(true)} className="mt-3 flex items-center gap-2 h-8 px-4 bg-[#FF4C00] text-white text-xs font-semibold rounded-xl mx-auto">
                    <Plus className="h-3.5 w-3.5" /> Add Cheque
                  </button>
                </td></tr>
              ) : (
                filtered.map((cheque) => {
                  const sc = STATUS_CONFIG[cheque.status];
                  return (
                    <tr key={cheque.id} className="border-b border-[#F8F8F8] hover:bg-[#FAFAFA] transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#FF4C00] font-mono">{cheque.cheque_number}</span>
                          {cheque.status === "pending" && <DueBadge date={cheque.payment_date} />}
                        </div>
                      </td>
                      <td className="px-5 py-4"><span className="text-sm font-semibold text-[#0A0A0A]">{cheque.pay_to || "—"}</span></td>
                      <td className="px-5 py-4"><span className="text-sm text-[#6B6B6B] max-w-[160px] truncate block">{cheque.description || "—"}</span></td>
                      <td className="px-5 py-4"><span className="text-sm text-[#4A4A4A]">{cheque.bank || "—"}</span></td>
                      <td className="px-5 py-4"><span className="text-sm text-[#6B6B6B]">{cheque.issue_date ? new Date(cheque.issue_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span></td>
                      <td className="px-5 py-4"><span className={`text-sm font-semibold ${cheque.status === "pending" && cheque.payment_date && daysDiff(cheque.payment_date) <= 3 ? "text-[#FF4C00]" : "text-[#4A4A4A]"}`}>{cheque.payment_date ? new Date(cheque.payment_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span></td>
                      <td className="px-5 py-4"><span className="text-sm font-bold text-[#0A0A0A]">Rs. {cheque.amount.toLocaleString()}</span></td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${sc.style}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {cheque.status === "pending" && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => updateStatus(cheque.id, "successful")}
                              className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-all"
                              title="Mark as cleared"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Clear
                            </button>
                            <button
                              onClick={() => updateStatus(cheque.id, "returned")}
                              className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-all"
                              title="Mark as returned"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Return
                            </button>
                          </div>
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
        <AddChequeModal
          type={type}
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); loadCheques(); }}
        />
      )}
    </div>
  );
}

function AddChequeModal({ type, onClose, onSuccess }: { type: ChequeType; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    cheque_number: "",
    pay_to: "",
    description: "",
    bank: "",
    amount: "",
    issue_date: new Date().toISOString().split("T")[0],
    payment_date: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("cheques").insert({
      ...form,
      type,
      amount: parseFloat(form.amount) || 0,
      issue_date: form.issue_date || null,
      payment_date: form.payment_date || null,
      status: "pending",
    });
    if (error) toast.error(error.message);
    else { toast.success("Cheque added"); onSuccess(); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#EFEFEF] z-10">
        <div className="flex items-center justify-between p-6 border-b border-[#F0F0F0]">
          <h3 className="text-lg font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
            Add {type === "tvs" ? "TVS" : "Other"} Cheque
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#F5F5F5]"><X className="h-4 w-4 text-[#6B6B6B]" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Cheque Number <span className="text-[#FF4C00]">*</span></label>
              <input value={form.cheque_number} onChange={(e) => setForm({ ...form, cheque_number: e.target.value })} required placeholder="CHQ-001" className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Amount (Rs.) <span className="text-[#FF4C00]">*</span></label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required placeholder="0" className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Pay To</label>
              <input value={form.pay_to} onChange={(e) => setForm({ ...form, pay_to: e.target.value })} placeholder="Payee name" className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Bank</label>
              <input value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} placeholder="Bank name" className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Issue Date</label>
              <input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Payment Date</label>
              <input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is this cheque for?" className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-[#E5E5E5] text-sm font-semibold text-[#4A4A4A] hover:bg-[#F5F5F5]">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-10 bg-[#FF4C00] hover:bg-[#E64400] text-white text-sm font-semibold rounded-xl disabled:opacity-60">{saving ? "Saving..." : "Add Cheque"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
