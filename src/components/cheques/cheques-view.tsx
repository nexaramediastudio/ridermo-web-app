"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Plus, Search, CreditCard, AlertTriangle,
  CheckCircle2, XCircle, Clock, X, DollarSign, TrendingUp, Trash2,
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

const STATUS_CONFIG: Record<ChequeStatus, { label: string; badge: string; dot: string }> = {
  pending:    { label: "Pending",  badge: "r-badge-amber", dot: "bg-amber-400" },
  successful: { label: "Cleared",  badge: "r-badge-green", dot: "bg-emerald-500" },
  returned:   { label: "Returned", badge: "r-badge-red",   dot: "bg-red-500" },
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
  if (diff < 0)    return <span className="r-badge r-badge-red">{Math.abs(diff)}d overdue</span>;
  if (diff === 0)  return <span className="r-badge bg-[#FF4C00] text-white">Due today</span>;
  if (diff <= 3)   return <span className="r-badge r-badge-amber">Due in {diff}d</span>;
  if (diff <= 7)   return <span className="r-badge r-badge-blue">Due in {diff}d</span>;
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

  const urgentCheques = cheques.filter((c) => {
    if (c.status !== "pending" || !c.payment_date) return false;
    return daysDiff(c.payment_date) <= 3;
  });

  const pendingCount  = cheques.filter((c) => c.status === "pending").length;
  const totalPending  = cheques.filter((c) => c.status === "pending").reduce((s, c) => s + c.amount, 0);
  const totalCleared  = cheques.filter((c) => c.status === "successful").reduce((s, c) => s + c.amount, 0);
  const returnedCount = cheques.filter((c) => c.status === "returned").length;

  async function deleteCheque(id: string, num: string) {
    if (!window.confirm(`Delete cheque ${num}?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("cheques").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Cheque deleted"); loadCheques(); }
  }

  async function updateStatus(id: string, status: ChequeStatus) {
    const supabase = createClient();
    await supabase.from("cheques").update({ status }).eq("id", id);
    toast.success(`Cheque marked as ${STATUS_CONFIG[status].label}`);
    loadCheques();
  }

  const title = type === "tvs" ? "TVS Cheques" : "Other Cheques";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="r-page-title">{title}</h1>
            <p className="r-page-sub">{pendingCount} pending · {cheques.length} total</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(true)} className="r-btn-primary">
          <Plus className="h-4 w-4" /> Add Cheque
        </button>
      </div>

      {/* Urgent alert */}
      {urgentCheques.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span className="text-[13px] font-bold text-amber-800">
              {urgentCheques.length} cheque{urgentCheques.length > 1 ? "s" : ""} due within 3 days
            </span>
          </div>
          <div className="space-y-1">
            {urgentCheques.map((c) => (
              <div key={c.id} className="flex items-center gap-3 text-[12px] text-amber-700">
                <span className="font-mono font-bold">{c.cheque_number}</span>
                {c.pay_to && <span>{c.pay_to}</span>}
                <span className="font-bold">Rs. {c.amount.toLocaleString()}</span>
                <DueBadge date={c.payment_date} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Pending Amount",  value: `Rs. ${totalPending.toLocaleString("en", { maximumFractionDigits: 0 })}`, sub: `${pendingCount} cheques`, color: "text-[#FF4C00]", icon: Clock },
          { label: "Cleared Amount",  value: `Rs. ${totalCleared.toLocaleString("en", { maximumFractionDigits: 0 })}`, sub: `${cheques.filter(c => c.status === "successful").length} cheques`, color: "text-emerald-600", icon: TrendingUp },
          { label: "Returned",        value: `${returnedCount}`,    sub: "cheques", color: "text-red-600", icon: XCircle },
          { label: "Total Cheques",   value: `${cheques.length}`,   sub: "all time",  color: "text-[#0A0A0A]", icon: DollarSign },
        ].map((k) => (
          <div key={k.label} className="r-kpi">
            <div className="flex items-center justify-between mb-3">
              <span className="r-page-sub">{k.label}</span>
              <k.icon className="h-4 w-4 text-[#ABABAB]" />
            </div>
            <p className={`text-xl font-bold font-display ${k.color}`}>{k.value}</p>
            <p className="text-[11px] text-[#ABABAB] mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="r-card overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-[#F0F0F0] flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cheque no., payee, bank..."
              className="r-input pl-9"
            />
          </div>
          <div className="r-tabs">
            {(["all", "pending", "successful", "returned"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={statusFilter === s ? "r-tab-on" : "r-tab-off"}
              >
                {s === "all" ? "All" : STATUS_CONFIG[s as ChequeStatus]?.label || s}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[11px] text-[#ABABAB] font-medium">{filtered.length} results</span>
        </div>

        <div className="overflow-x-auto">
          <table className="r-table">
            <thead>
              <tr className="r-thead-row">
                <th className="r-th">Cheque No.</th>
                <th className="r-th">Pay To</th>
                <th className="r-th">Description</th>
                <th className="r-th">Bank</th>
                <th className="r-th">Issue Date</th>
                <th className="r-th">Payment Date</th>
                <th className="r-th text-right">Amount</th>
                <th className="r-th">Status</th>
              <th className="r-th">Actions</th>
              <th className="r-th w-10"></th>
            </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#F5F5F5]">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="r-td"><div className="h-4 bg-[#F0F0F0] rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-[#F5F5F5] flex items-center justify-center mx-auto mb-3">
                      <CreditCard className="h-7 w-7 text-[#ABABAB]" />
                    </div>
                    <p className="text-[13px] font-semibold text-[#4A4A4A]">No cheques found</p>
                    <button onClick={() => setShowAdd(true)} className="mt-3 r-btn-primary mx-auto">
                      <Plus className="h-3.5 w-3.5" /> Add Cheque
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map((cheque) => {
                  const sc = STATUS_CONFIG[cheque.status];
                  const isUrgent = cheque.status === "pending" && cheque.payment_date && daysDiff(cheque.payment_date) <= 3;
                  return (
                    <tr key={cheque.id} className="r-tr group">
                      <td className="r-td">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold text-[#FF4C00] font-mono">{cheque.cheque_number}</span>
                          {cheque.status === "pending" && <DueBadge date={cheque.payment_date} />}
                        </div>
                      </td>
                      <td className="r-td">
                        <span className="text-[13px] font-semibold text-[#0A0A0A]">{cheque.pay_to || "—"}</span>
                      </td>
                      <td className="r-td">
                        <span className="text-[12px] text-[#6B6B6B] max-w-[160px] truncate block">{cheque.description || "—"}</span>
                      </td>
                      <td className="r-td">
                        <span className="text-[12px] text-[#4A4A4A]">{cheque.bank || "—"}</span>
                      </td>
                      <td className="r-td">
                        <span className="text-[12px] text-[#6B6B6B]">
                          {cheque.issue_date ? new Date(cheque.issue_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </span>
                      </td>
                      <td className="r-td">
                        <span className={`text-[12px] font-semibold ${isUrgent ? "text-[#FF4C00]" : "text-[#4A4A4A]"}`}>
                          {cheque.payment_date ? new Date(cheque.payment_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </span>
                      </td>
                      <td className="r-td text-right">
                        <span className="text-[13px] font-bold text-[#0A0A0A]">
                          Rs. {cheque.amount.toLocaleString("en", { maximumFractionDigits: 0 })}
                        </span>
                      </td>
                      <td className="r-td">
                        <span className={`${sc.badge} flex items-center gap-1.5`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} flex-shrink-0`} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="r-td">
                        {cheque.status === "pending" ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => updateStatus(cheque.id, "successful")}
                              className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-semibold hover:bg-emerald-100 transition-all"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Clear
                            </button>
                            <button
                              onClick={() => updateStatus(cheque.id, "returned")}
                              className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-red-50 text-red-600 text-[11px] font-semibold hover:bg-red-100 transition-all"
                            >
                              <XCircle className="h-3 w-3" /> Return
                            </button>
                          </div>
                        ) : null}
                      </td>
                      <td className="r-td">
                        <button
                          onClick={() => deleteCheque(cheque.id, cheque.cheque_number)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 text-[#ABABAB] transition-all"
                          title="Delete cheque"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-[#F0F0F0] bg-[#FAFAFA] flex items-center justify-between">
            <span className="text-[11px] text-[#ABABAB]">{filtered.length} of {cheques.length} cheques</span>
            <span className="text-[13px] font-bold text-[#0A0A0A]">
              Showing: Rs. {filtered.reduce((s, c) => s + c.amount, 0).toLocaleString("en", { maximumFractionDigits: 0 })}
            </span>
          </div>
        )}
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
    <div className="r-modal-overlay">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="r-modal relative max-w-lg w-full">
        <div className="r-modal-header">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="text-[15px] font-bold text-[#0A0A0A] font-display">
              Add {type === "tvs" ? "TVS" : "Other"} Cheque
            </h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5]">
            <X className="h-4 w-4 text-[#6B6B6B]" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="r-modal-body">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="r-label">Cheque Number <span className="text-[#FF4C00]">*</span></label>
              <input
                value={form.cheque_number}
                onChange={(e) => setForm({ ...form, cheque_number: e.target.value })}
                required
                placeholder="CHQ-001"
                className="r-input"
              />
            </div>
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
              <label className="r-label">Pay To</label>
              <input
                value={form.pay_to}
                onChange={(e) => setForm({ ...form, pay_to: e.target.value })}
                placeholder="Payee name"
                className="r-input"
              />
            </div>
            <div>
              <label className="r-label">Bank</label>
              <input
                value={form.bank}
                onChange={(e) => setForm({ ...form, bank: e.target.value })}
                placeholder="Bank name"
                className="r-input"
              />
            </div>
            <div>
              <label className="r-label">Issue Date</label>
              <input
                type="date"
                value={form.issue_date}
                onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                className="r-input"
              />
            </div>
            <div>
              <label className="r-label">Payment Date</label>
              <input
                type="date"
                value={form.payment_date}
                onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                className="r-input"
              />
            </div>
            <div className="col-span-2">
              <label className="r-label">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What is this cheque for?"
                className="r-input"
              />
            </div>
          </div>
        </form>
        <div className="r-modal-footer">
          <button type="button" onClick={onClose} className="r-btn-secondary">Cancel</button>
          <button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={saving} className="r-btn-primary disabled:opacity-60">
            {saving ? "Saving..." : "Add Cheque"}
          </button>
        </div>
      </div>
    </div>
  );
}
