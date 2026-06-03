"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Plus, Search, CreditCard, AlertTriangle, Bike,
  CheckCircle2, XCircle, Clock, X, DollarSign, TrendingUp, Trash2,
} from "lucide-react";

type ChequeStatus = "pending" | "successful" | "returned";

interface SaleBike {
  id: string;
  invoice_number: string;
  sale_date: string;
  selling_price: number;
  customers: { full_name: string } | { full_name: string }[] | null;
  inventory_bikes: {
    round_number: string;
    bike_models: { name: string } | { name: string }[] | null;
  } | {
    round_number: string;
    bike_models: { name: string } | { name: string }[] | null;
  }[] | null;
}

interface TvsCheque {
  id: string;
  sale_id: string | null;
  cheque_number: string;
  pay_to?: string;
  issue_date?: string;
  payment_date?: string;
  amount: number;
  bank?: string;
  status: ChequeStatus;
  notes?: string;
  created_at: string;
  sales: SaleBike | SaleBike[] | null;
}

const STATUS_CONFIG: Record<ChequeStatus, { label: string; badge: string; dot: string }> = {
  pending:    { label: "Pending",  badge: "r-badge-amber", dot: "bg-amber-400" },
  successful: { label: "Cleared",  badge: "r-badge-green", dot: "bg-emerald-500" },
  returned:   { label: "Returned", badge: "r-badge-red",   dot: "bg-red-500" },
};

const TVS_PAYEE = "TVS Motor Company";

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

function resolveSale(row: { sales: SaleBike | SaleBike[] | null }) {
  const s = Array.isArray(row.sales) ? row.sales[0] : row.sales;
  if (!s) return { invoice: "—", customer: "—", bike: "—", roundNumber: "—", sellingPrice: 0, saleDate: "—" };
  const c = Array.isArray(s.customers) ? s.customers[0] : s.customers;
  const ib = Array.isArray(s.inventory_bikes) ? s.inventory_bikes[0] : s.inventory_bikes;
  const bm = ib ? (Array.isArray(ib.bike_models) ? ib.bike_models[0] : ib.bike_models) : null;
  return {
    invoice: s.invoice_number,
    customer: c?.full_name || "—",
    bike: bm?.name || "—",
    roundNumber: ib?.round_number || "—",
    sellingPrice: s.selling_price,
    saleDate: s.sale_date,
  };
}

export function TvsChequesView() {
  const [cheques, setCheques] = useState<TvsCheque[]>([]);
  const [awaitingSales, setAwaitingSales] = useState<SaleBike[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ChequeStatus>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [preselectedSaleId, setPreselectedSaleId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const [chequesRes, salesRes, linkedRes] = await Promise.all([
      supabase
        .from("cheques")
        .select(`
          id, sale_id, cheque_number, pay_to, issue_date, payment_date, amount, bank, status, notes, created_at,
          sales(invoice_number, sale_date, selling_price, customers(full_name), inventory_bikes(round_number, bike_models(name)))
        `)
        .eq("type", "tvs")
        .order("payment_date", { ascending: true }),
      supabase
        .from("sales")
        .select(`
          id, invoice_number, sale_date, selling_price,
          customers(full_name),
          inventory_bikes(round_number, bike_models(name))
        `)
        .eq("status", "completed")
        .order("sale_date", { ascending: false })
        .limit(500),
      supabase.from("cheques").select("sale_id").eq("type", "tvs").not("sale_id", "is", null),
    ]);

    if (chequesRes.error) toast.error("Failed to load cheques");
    else setCheques((chequesRes.data as unknown as TvsCheque[]) || []);

    const linkedIds = new Set((linkedRes.data || []).map((c) => c.sale_id).filter(Boolean));
    const awaiting = ((salesRes.data || []) as unknown as SaleBike[]).filter((s) => !linkedIds.has(s.id));
    setAwaitingSales(awaiting);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function openAddForSale(saleId?: string) {
    setPreselectedSaleId(saleId || null);
    setShowAdd(true);
  }

  const filtered = cheques.filter((c) => {
    const sale = resolveSale(c);
    const q = search.toLowerCase();
    const matchSearch = !q ||
      c.cheque_number.toLowerCase().includes(q) ||
      sale.invoice.toLowerCase().includes(q) ||
      sale.roundNumber.toLowerCase().includes(q) ||
      sale.customer.toLowerCase().includes(q) ||
      sale.bike.toLowerCase().includes(q) ||
      c.bank?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredAwaiting = awaitingSales.filter((s) => {
    const sale = resolveSale({ sales: s });
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      sale.invoice.toLowerCase().includes(q) ||
      sale.roundNumber.toLowerCase().includes(q) ||
      sale.customer.toLowerCase().includes(q) ||
      sale.bike.toLowerCase().includes(q)
    );
  });

  const urgentCheques = cheques.filter((c) => {
    if (c.status !== "pending" || !c.payment_date) return false;
    return daysDiff(c.payment_date) <= 3;
  });

  const pendingCount = cheques.filter((c) => c.status === "pending").length;
  const totalPending = cheques.filter((c) => c.status === "pending").reduce((s, c) => s + c.amount, 0);
  const totalCleared = cheques.filter((c) => c.status === "successful").reduce((s, c) => s + c.amount, 0);
  const awaitingTotal = awaitingSales.reduce((s, sale) => s + sale.selling_price, 0);

  async function deleteCheque(id: string, num: string) {
    if (!window.confirm(`Delete cheque ${num}?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("cheques").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Cheque deleted"); loadData(); }
  }

  async function updateStatus(id: string, status: ChequeStatus) {
    const supabase = createClient();
    await supabase.from("cheques").update({ status }).eq("id", id);
    toast.success(`Cheque marked as ${STATUS_CONFIG[status].label}`);
    loadData();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="r-page-title">TVS Cheques</h1>
            <p className="r-page-sub">
              After you sell a bike, write a cheque to TVS for the bike&apos;s selling price
            </p>
          </div>
        </div>
        <button
          onClick={() => openAddForSale()}
          className="r-btn-primary"
          disabled={awaitingSales.length === 0}
          title={awaitingSales.length === 0 ? "All sold bikes already have cheques" : undefined}
        >
          <Plus className="h-4 w-4" /> Write Cheque
        </button>
      </div>

      {urgentCheques.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span className="text-[13px] font-bold text-amber-800">
              {urgentCheques.length} cheque{urgentCheques.length > 1 ? "s" : ""} due within 3 days
            </span>
          </div>
          <div className="space-y-1">
            {urgentCheques.map((c) => {
              const sale = resolveSale(c);
              return (
                <div key={c.id} className="flex items-center gap-3 text-[12px] text-amber-700 flex-wrap">
                  <span className="font-mono font-bold">{c.cheque_number}</span>
                  <span className="font-mono text-[#FF4C00]">{sale.roundNumber}</span>
                  <span>{sale.bike}</span>
                  <span className="font-bold">Rs. {c.amount.toLocaleString()}</span>
                  <DueBadge date={c.payment_date} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Awaiting Cheque", value: `${awaitingSales.length}`, sub: `Rs. ${awaitingTotal.toLocaleString()} to TVS`, color: "text-amber-600", icon: Bike },
          { label: "Pending Cheques", value: `Rs. ${totalPending.toLocaleString()}`, sub: `${pendingCount} cheques`, color: "text-[#FF4C00]", icon: Clock },
          { label: "Cleared to TVS", value: `Rs. ${totalCleared.toLocaleString()}`, sub: `${cheques.filter(c => c.status === "successful").length} cheques`, color: "text-emerald-600", icon: TrendingUp },
          { label: "Total Cheques", value: `${cheques.length}`, sub: "all time", color: "text-[#0A0A0A]", icon: DollarSign },
        ].map((k) => (
          <div key={k.label} className="r-kpi">
            <div>
              <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-wide">{k.label}</p>
              <p className={`text-xl font-bold tabular-nums mt-0.5 ${k.color}`}>{k.value}</p>
              <p className="text-[10px] text-[#ABABAB]">{k.sub}</p>
            </div>
            <k.icon className="h-4 w-4 text-[#D5D5D5] flex-shrink-0" />
          </div>
        ))}
      </div>

      {!loading && filteredAwaiting.length > 0 && (
        <div className="r-card overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F0F0F0] bg-amber-50/50">
            <h2 className="text-[13px] font-bold text-[#0A0A0A]">Sold Bikes — Awaiting TVS Payment</h2>
            <p className="text-[11px] text-[#6B6B6B] mt-0.5">Select a bike to write a cheque for its selling price</p>
          </div>
          <div className="overflow-x-auto">
            <table className="r-table">
              <thead>
                <tr className="r-thead-row">
                  <th className="r-th">Round No.</th>
                  <th className="r-th">Bike</th>
                  <th className="r-th">Invoice</th>
                  <th className="r-th">Customer</th>
                  <th className="r-th">Sale Date</th>
                  <th className="r-th text-right">Selling Price</th>
                  <th className="r-th">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAwaiting.map((sale) => {
                  const info = resolveSale({ sales: sale });
                  return (
                    <tr key={sale.id} className="r-tr">
                      <td className="r-td"><span className="text-xs font-bold text-[#FF4C00] font-mono">{info.roundNumber}</span></td>
                      <td className="r-td"><span className="text-[13px] font-semibold text-[#0A0A0A]">{info.bike}</span></td>
                      <td className="r-td"><span className="text-xs font-bold text-[#FF4C00] font-mono">{info.invoice}</span></td>
                      <td className="r-td"><span className="text-sm text-[#0A0A0A]">{info.customer}</span></td>
                      <td className="r-td">
                        <span className="text-[12px] text-[#6B6B6B]">
                          {info.saleDate !== "—" ? new Date(info.saleDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </span>
                      </td>
                      <td className="r-td text-right">
                        <span className="text-[13px] font-bold text-[#0A0A0A] tabular-nums">Rs. {info.sellingPrice.toLocaleString()}</span>
                      </td>
                      <td className="r-td">
                        <button
                          onClick={() => openAddForSale(sale.id)}
                          className="flex items-center gap-1 h-8 px-3 bg-[#FF4C00] hover:bg-[#E04400] text-white text-[11px] font-semibold rounded-lg whitespace-nowrap"
                        >
                          <Plus className="h-3.5 w-3.5" /> Write Cheque
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="r-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F0F0F0] flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search round no., invoice, customer, bike..."
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
          <span className="ml-auto text-[11px] text-[#ABABAB] font-medium">{filtered.length} cheques</span>
        </div>

        <div className="overflow-x-auto">
          <table className="r-table">
            <thead>
              <tr className="r-thead-row">
                <th className="r-th">Round No.</th>
                <th className="r-th">Bike</th>
                <th className="r-th">Invoice</th>
                <th className="r-th">Customer</th>
                <th className="r-th text-right">Selling Price</th>
                <th className="r-th">Cheque No.</th>
                <th className="r-th">Bank</th>
                <th className="r-th">Payment Date</th>
                <th className="r-th">Status</th>
                <th className="r-th">Actions</th>
                <th className="r-th w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#F5F5F5]">
                    {Array.from({ length: 11 }).map((_, j) => (
                      <td key={j} className="r-td"><div className="h-4 bg-[#F0F0F0] rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-16 text-center">
                    <CreditCard className="h-8 w-8 text-[#D0D0D0] mx-auto mb-2" />
                    <p className="text-[13px] font-semibold text-[#4A4A4A]">No TVS cheques yet</p>
                    <p className="text-[11px] text-[#ABABAB] mt-1">Write a cheque when you pay TVS for a sold bike</p>
                  </td>
                </tr>
              ) : (
                filtered.map((cheque) => {
                  const sale = resolveSale(cheque);
                  const sc = STATUS_CONFIG[cheque.status];
                  const isUrgent = cheque.status === "pending" && cheque.payment_date && daysDiff(cheque.payment_date) <= 3;
                  return (
                    <tr key={cheque.id} className="r-tr group">
                      <td className="r-td"><span className="text-xs font-bold text-[#FF4C00] font-mono">{sale.roundNumber}</span></td>
                      <td className="r-td"><span className="text-[13px] font-semibold text-[#0A0A0A]">{sale.bike}</span></td>
                      <td className="r-td"><span className="text-xs font-bold text-[#FF4C00] font-mono">{sale.invoice}</span></td>
                      <td className="r-td"><span className="text-sm text-[#0A0A0A]">{sale.customer}</span></td>
                      <td className="r-td text-right">
                        <span className="text-[13px] font-bold text-[#0A0A0A] tabular-nums">Rs. {sale.sellingPrice.toLocaleString()}</span>
                      </td>
                      <td className="r-td">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold font-mono">{cheque.cheque_number}</span>
                          {cheque.status === "pending" && <DueBadge date={cheque.payment_date} />}
                        </div>
                      </td>
                      <td className="r-td"><span className="text-[12px] text-[#4A4A4A]">{cheque.bank || "—"}</span></td>
                      <td className="r-td">
                        <span className={`text-[12px] font-semibold ${isUrgent ? "text-[#FF4C00]" : "text-[#4A4A4A]"}`}>
                          {cheque.payment_date ? new Date(cheque.payment_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
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
      </div>

      {showAdd && (
        <AddTvsChequeModal
          awaitingSales={awaitingSales}
          preselectedSaleId={preselectedSaleId}
          onClose={() => { setShowAdd(false); setPreselectedSaleId(null); }}
          onSuccess={() => { setShowAdd(false); setPreselectedSaleId(null); loadData(); }}
        />
      )}
    </div>
  );
}

function AddTvsChequeModal({
  awaitingSales,
  preselectedSaleId,
  onClose,
  onSuccess,
}: {
  awaitingSales: SaleBike[];
  preselectedSaleId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [saleId, setSaleId] = useState(preselectedSaleId || "");
  const [form, setForm] = useState({
    cheque_number: "",
    bank: "",
    issue_date: new Date().toISOString().split("T")[0],
    payment_date: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const selectedSale = awaitingSales.find((s) => s.id === saleId);
  const saleInfo = selectedSale ? resolveSale({ sales: selectedSale }) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!saleId || !selectedSale) {
      toast.error("Please select a sold bike");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("cheques").insert({
      type: "tvs",
      sale_id: saleId,
      cheque_number: form.cheque_number,
      pay_to: TVS_PAYEE,
      description: `Payment to TVS — ${saleInfo?.roundNumber} ${saleInfo?.bike} (${saleInfo?.invoice})`,
      bank: form.bank || null,
      amount: selectedSale.selling_price,
      issue_date: form.issue_date || null,
      payment_date: form.payment_date || null,
      notes: form.notes || null,
      status: "pending",
    });
    if (error) toast.error(error.message);
    else { toast.success("TVS cheque added"); onSuccess(); }
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
            <h3 className="text-[15px] font-bold text-[#0A0A0A] font-display">Write Cheque to TVS</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5]">
            <X className="h-4 w-4 text-[#6B6B6B]" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="r-modal-body space-y-4">
          <div>
            <label className="r-label">Select Sold Bike <span className="text-[#FF4C00]">*</span></label>
            <select
              value={saleId}
              onChange={(e) => setSaleId(e.target.value)}
              required
              className="r-input"
            >
              <option value="">Choose a bike you sold...</option>
              {awaitingSales.map((sale) => {
                const info = resolveSale({ sales: sale });
                return (
                  <option key={sale.id} value={sale.id}>
                    {info.roundNumber} — {info.bike} — {info.invoice} — Rs. {info.sellingPrice.toLocaleString()}
                  </option>
                );
              })}
            </select>
          </div>

          {saleInfo && (
            <div className="bg-[#F5F7FA] rounded-xl p-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-bold text-[#9A9A9A] uppercase">Round No.</p>
                <p className="text-sm font-bold text-[#FF4C00] font-mono">{saleInfo.roundNumber}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#9A9A9A] uppercase">Bike</p>
                <p className="text-sm font-semibold text-[#0A0A0A]">{saleInfo.bike}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#9A9A9A] uppercase">Customer</p>
                <p className="text-sm text-[#0A0A0A]">{saleInfo.customer}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#9A9A9A] uppercase">Selling Price (Cheque Amount)</p>
                <p className="text-lg font-bold text-[#0A0A0A] tabular-nums">Rs. {saleInfo.sellingPrice.toLocaleString()}</p>
              </div>
            </div>
          )}

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
              <label className="r-label">Pay To</label>
              <input value={TVS_PAYEE} readOnly className="r-input bg-[#F5F5F5] text-[#6B6B6B]" />
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
            <div className="col-span-2">
              <label className="r-label">Payment Date</label>
              <input
                type="date"
                value={form.payment_date}
                onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                className="r-input"
              />
            </div>
          </div>
        </form>
        <div className="r-modal-footer">
          <button type="button" onClick={onClose} className="r-btn-secondary">Cancel</button>
          <button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={saving || !saleId} className="r-btn-primary disabled:opacity-60">
            {saving ? "Saving..." : "Add Cheque"}
          </button>
        </div>
      </div>
    </div>
  );
}
