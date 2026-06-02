"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";
import { Search, Download, Eye, FileText, Plus, ArrowRight } from "lucide-react";

interface InvoiceRow {
  id: string;
  invoice_number: string;
  sale_date: string;
  total_amount: number;
  payment_type: "cash" | "finance";
  status: string;
  tvs_commission: number;
  finance_commission: number;
  insurance_commission: number;
  customers: { full_name: string; phone?: string; nic?: string } | null;
  inventory_bikes: {
    round_number: string;
    chassis_number: string;
    engine_number: string;
    bike_models: { name: string } | null;
    bike_colors: { name: string; hex_code?: string } | null;
  } | null;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<InvoiceRow | null>(null);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("sales")
      .select(`
        id, invoice_number, sale_date, total_amount, payment_type, status,
        tvs_commission, finance_commission, insurance_commission,
        customers(full_name, phone, nic),
        inventory_bikes(round_number, chassis_number, engine_number, bike_models(name), bike_colors(name, hex_code))
      `)
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load invoices");
    else setInvoices((data as unknown as InvoiceRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const filtered = invoices.filter((inv) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(q) ||
      (inv.customers as { full_name: string } | null)?.full_name?.toLowerCase().includes(q) ||
      (inv.inventory_bikes as { round_number: string } | null)?.round_number?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex gap-5 max-w-[1400px]">
      {/* Left: Invoice list */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Invoices</h2>
            <p className="text-sm text-[#9A9A9A] mt-0.5">{invoices.length} total invoices</p>
          </div>
          <Link href="/sales/new" className="flex items-center gap-2 h-9 px-4 bg-[#FF4C00] hover:bg-[#E64400] text-white text-sm font-semibold rounded-xl">
            <Plus className="h-4 w-4" /> New Sale
          </Link>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice, customer..." className="w-full h-9 pl-9 pr-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white" />
        </div>

        <div className="bg-white rounded-2xl border border-[#EFEFEF] overflow-hidden">
          {loading ? (
            <div className="divide-y divide-[#F5F5F5]">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-[#F0F0F0]" />
                  <div className="flex-1 space-y-2"><div className="h-4 bg-[#F0F0F0] rounded w-40" /><div className="h-3 bg-[#F0F0F0] rounded w-28" /></div>
                  <div className="h-4 bg-[#F0F0F0] rounded w-20" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-14 text-center">
              <FileText className="h-10 w-10 mx-auto mb-3 text-[#E0E0E0]" />
              <p className="text-sm font-semibold text-[#6B6B6B]">No invoices yet</p>
              <p className="text-xs text-[#ABABAB] mt-1">Invoices are created when you complete a sale</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F5F5F5]">
              {filtered.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => setSelected(inv)}
                  className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors group ${selected?.id === inv.id ? "bg-[#FF4C00]/5" : "hover:bg-[#FAFAFA]"}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${selected?.id === inv.id ? "bg-[#FF4C00]/15" : "bg-[#F5F5F5]"}`}>
                    <FileText className={`h-5 w-5 ${selected?.id === inv.id ? "text-[#FF4C00]" : "text-[#9A9A9A]"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${selected?.id === inv.id ? "text-[#FF4C00]" : "text-[#0A0A0A]"}`}>{inv.invoice_number}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${inv.payment_type === "cash" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{inv.payment_type === "cash" ? "Cash" : "Finance"}</span>
                    </div>
                    <p className="text-xs text-[#9A9A9A] mt-0.5 truncate">
                      {(inv.customers as { full_name: string } | null)?.full_name} · {(inv.inventory_bikes as { bike_models: { name: string } | null } | null)?.bike_models?.name}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-[#0A0A0A]">Rs. {inv.total_amount.toLocaleString("en", { maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-[#9A9A9A]">{new Date(inv.sale_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                  </div>
                  <ArrowRight className={`h-4 w-4 flex-shrink-0 transition-all ${selected?.id === inv.id ? "text-[#FF4C00]" : "text-[#E0E0E0] group-hover:text-[#9A9A9A]"}`} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Invoice preview */}
      {selected ? (
        <div className="w-[420px] flex-shrink-0">
          <InvoicePreview invoice={selected} />
        </div>
      ) : (
        <div className="w-[420px] flex-shrink-0 bg-white rounded-2xl border border-dashed border-[#E5E5E5] flex flex-col items-center justify-center p-12 text-center">
          <Eye className="h-10 w-10 text-[#E0E0E0] mb-3" />
          <p className="text-sm font-semibold text-[#9A9A9A]">Select an invoice</p>
          <p className="text-xs text-[#ABABAB] mt-1">Click any invoice to preview it here</p>
        </div>
      )}
    </div>
  );
}

// ── Build printable HTML and open in new window ───────────────────
function printInvoice(invoice: InvoiceRow) {
  const bike = invoice.inventory_bikes as {
    round_number: string; chassis_number: string; engine_number: string;
    bike_models: { name: string } | null;
    bike_colors: { name: string; hex_code?: string } | null;
  } | null;
  const customer = invoice.customers as { full_name: string; phone?: string; nic?: string } | null;
  const totalComm = (invoice.tvs_commission || 0) + (invoice.finance_commission || 0) + (invoice.insurance_commission || 0);
  const dateStr = new Date(invoice.sale_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${invoice.invoice_number} – RIDERMO</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Inter',system-ui,sans-serif;background:#fff;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .page{max-width:680px;margin:0 auto;padding:48px 40px;}
    .header{background:#111;border-radius:16px;padding:32px;margin-bottom:32px;}
    .header-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;}
    .logo{display:flex;align-items:center;gap:10px;}
    .logo-box{width:36px;height:36px;background:#FF4C00;border-radius:10px;display:flex;align-items:center;justify-content:center;}
    .logo-text{color:#fff;font-weight:800;font-size:16px;letter-spacing:-0.5px;}
    .invoice-label{color:rgba(255,255,255,0.4);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:2px;}
    .header-bottom{display:flex;justify-content:space-between;align-items:flex-end;}
    .inv-num-label{color:rgba(255,255,255,0.4);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px;}
    .inv-num{color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;}
    .inv-date{color:rgba(255,255,255,0.6);font-size:13px;font-weight:500;text-align:right;}
    .section{margin-bottom:24px;}
    .section-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#9CA3AF;margin-bottom:10px;}
    .card{background:#F9FAFB;border-radius:12px;padding:16px;}
    .row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;}
    .row+.row{border-top:1px solid #F0F0F0;}
    .row-label{font-size:12px;color:#6B7280;}
    .row-value{font-size:12px;font-weight:600;color:#111;}
    .row-value.orange{color:#FF4C00;}
    .row-value.mono{font-family:monospace;font-size:11px;}
    .row-value.badge{padding:2px 10px;border-radius:20px;font-size:11px;}
    .badge-cash{background:#ECFDF5;color:#059669;}
    .badge-finance{background:#EFF6FF;color:#2563EB;}
    .divider{border:none;border-top:1px solid #F0F0F0;margin:12px 0;}
    .total-row{display:flex;justify-content:space-between;align-items:center;padding-top:12px;}
    .total-label{font-size:15px;font-weight:700;color:#111;}
    .total-value{font-size:20px;font-weight:800;color:#FF4C00;}
    .footer{margin-top:40px;padding-top:20px;border-top:1px solid #F0F0F0;display:flex;justify-content:space-between;align-items:center;}
    .footer-note{font-size:11px;color:#9CA3AF;}
    .footer-brand{font-size:11px;font-weight:700;color:#FF4C00;}
    @media print{
      body{padding:0;}
      .page{padding:24px 20px;}
      .header{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-top">
        <div class="logo">
          <div class="logo-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" fill="white" fill-opacity="0.9"/>
              <path d="M12 2L3 7l9 5 9-5-9-5z" fill="white"/>
            </svg>
          </div>
          <span class="logo-text">RIDERMO</span>
        </div>
        <span class="invoice-label">Invoice</span>
      </div>
      <div class="header-bottom">
        <div>
          <p class="inv-num-label">Invoice No.</p>
          <p class="inv-num">${invoice.invoice_number}</p>
        </div>
        <div class="inv-date">${dateStr}</div>
      </div>
    </div>

    <div class="section">
      <p class="section-label">Bill To</p>
      <div class="card">
        <div style="font-size:14px;font-weight:700;color:#111;margin-bottom:4px;">${customer?.full_name || "—"}</div>
        ${customer?.phone ? `<div style="font-size:12px;color:#6B7280;">${customer.phone}</div>` : ""}
        ${customer?.nic ? `<div style="font-size:12px;color:#6B7280;">NIC: ${customer.nic}</div>` : ""}
      </div>
    </div>

    <div class="section">
      <p class="section-label">Vehicle Details</p>
      <div class="card">
        <div class="row"><span class="row-label">Model</span><span class="row-value">${bike?.bike_models?.name || "—"}</span></div>
        <div class="row"><span class="row-label">Round Number</span><span class="row-value orange">${bike?.round_number || "—"}</span></div>
        <div class="row"><span class="row-label">Chassis Number</span><span class="row-value mono">${bike?.chassis_number || "—"}</span></div>
        <div class="row"><span class="row-label">Engine Number</span><span class="row-value mono">${bike?.engine_number || "—"}</span></div>
        ${bike?.bike_colors ? `<div class="row"><span class="row-label">Color</span><span class="row-value">${bike.bike_colors.name}</span></div>` : ""}
      </div>
    </div>

    <div class="section">
      <p class="section-label">Payment Summary</p>
      <div class="card">
        <div class="row">
          <span class="row-label">Payment Type</span>
          <span class="row-value badge ${invoice.payment_type === "cash" ? "badge-cash" : "badge-finance"}">
            ${invoice.payment_type === "cash" ? "Full Cash" : "Finance"}
          </span>
        </div>
        ${invoice.tvs_commission > 0 ? `<div class="row"><span class="row-label">TVS Commission</span><span class="row-value">Rs. ${invoice.tvs_commission.toLocaleString("en")}</span></div>` : ""}
        ${invoice.finance_commission > 0 ? `<div class="row"><span class="row-label">Finance Commission</span><span class="row-value">Rs. ${invoice.finance_commission.toLocaleString("en")}</span></div>` : ""}
        ${invoice.insurance_commission > 0 ? `<div class="row"><span class="row-label">Insurance Commission</span><span class="row-value">Rs. ${invoice.insurance_commission.toLocaleString("en")}</span></div>` : ""}
        ${totalComm > 0 ? `<div class="row"><span class="row-label">Total Commission</span><span class="row-value" style="color:#059669;">Rs. ${totalComm.toLocaleString("en")}</span></div>` : ""}
        <hr class="divider"/>
        <div class="total-row">
          <span class="total-label">Total Amount</span>
          <span class="total-value">Rs. ${invoice.total_amount.toLocaleString("en", { maximumFractionDigits: 0 })}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <span class="footer-note">Thank you for your business. This is a computer-generated invoice.</span>
      <span class="footer-brand">RIDERMO</span>
    </div>
  </div>
  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=780,height=900");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

function InvoicePreview({ invoice }: { invoice: InvoiceRow }) {
  const [fullView, setFullView] = useState(false);
  const bike = invoice.inventory_bikes as {
    round_number: string;
    chassis_number: string;
    engine_number: string;
    bike_models: { name: string } | null;
    bike_colors: { name: string; hex_code?: string } | null;
  } | null;
  const customer = invoice.customers as { full_name: string; phone?: string; nic?: string } | null;
  const totalComm = (invoice.tvs_commission || 0) + (invoice.finance_commission || 0) + (invoice.insurance_commission || 0);

  return (
    <>
      {/* Full view modal */}
      {fullView && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6" onClick={() => setFullView(false)}>
          <div className="bg-white rounded-3xl overflow-hidden w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F0F0]">
              <span className="text-sm font-bold text-[#0A0A0A]">Invoice {invoice.invoice_number}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => printInvoice(invoice)}
                  className="flex items-center gap-1.5 h-8 px-3 bg-[#FF4C00] hover:bg-[#E64400] text-white text-xs font-semibold rounded-lg transition-all">
                  <Download className="h-3.5 w-3.5" /> Download PDF
                </button>
                <button onClick={() => setFullView(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5] text-[#9A9A9A] hover:text-[#0A0A0A] transition-colors text-lg font-bold">×</button>
              </div>
            </div>
            {/* Invoice body (same design, full size) */}
            <div className="bg-[#111] p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF4C00] flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v10l9 5 9-5V7L12 2z" fill="white" fillOpacity="0.9"/><path d="M12 2L3 7l9 5 9-5-9-5z" fill="white"/></svg>
                  </div>
                  <span className="text-white font-extrabold text-lg">RIDERMO</span>
                </div>
                <span className="text-xs text-white/40 font-bold uppercase tracking-widest">Invoice</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Invoice No.</p>
                  <p className="text-white font-extrabold text-2xl">{invoice.invoice_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Date</p>
                  <p className="text-white text-sm font-semibold">
                    {new Date(invoice.sale_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {[
                { label: "Bill To", rows: [
                  { l: "Name", v: customer?.full_name || "—", bold: true },
                  ...(customer?.phone ? [{ l: "Phone", v: customer.phone }] : []),
                  ...(customer?.nic ? [{ l: "NIC", v: customer.nic }] : []),
                ]},
                { label: "Vehicle", rows: [
                  { l: "Model", v: bike?.bike_models?.name || "—", bold: true },
                  { l: "Round No.", v: bike?.round_number || "—", orange: true },
                  { l: "Chassis", v: bike?.chassis_number || "—", mono: true },
                  { l: "Engine", v: bike?.engine_number || "—", mono: true },
                  ...(bike?.bike_colors ? [{ l: "Color", v: bike.bike_colors.name }] : []),
                ]},
              ].map(sec => (
                <div key={sec.label}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A9A] mb-2">{sec.label}</p>
                  <div className="bg-[#F9FAFB] rounded-xl overflow-hidden divide-y divide-[#F0F0F0]">
                    {sec.rows.map(r => (
                      <div key={r.l} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-xs text-[#9A9A9A]">{r.l}</span>
                        <span className={`text-xs font-semibold ${'orange' in r && r.orange ? "text-[#FF4C00]" : "text-[#111827]"} ${'mono' in r && r.mono ? "font-mono" : ""} ${'bold' in r && r.bold ? "font-bold text-sm" : ""}`}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A9A] mb-2">Payment</p>
                <div className="bg-[#F9FAFB] rounded-xl overflow-hidden divide-y divide-[#F0F0F0]">
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-[#9A9A9A]">Type</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${invoice.payment_type === "cash" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                      {invoice.payment_type === "cash" ? "Full Cash" : "Finance"}
                    </span>
                  </div>
                  {totalComm > 0 && (
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-[#9A9A9A]">Commission</span>
                      <span className="text-xs font-semibold text-emerald-600">Rs. {totalComm.toLocaleString("en")}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-4 py-3.5 bg-white">
                    <span className="text-sm font-bold text-[#111827]">Total</span>
                    <span className="text-xl font-extrabold text-[#FF4C00]">Rs. {invoice.total_amount.toLocaleString("en", { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#EFEFEF] overflow-hidden sticky top-6">
        {/* Invoice header */}
        <div className="bg-[#0A0A0A] p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FF4C00] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v10l9 5 9-5V7L12 2z" fill="white" fillOpacity="0.9"/><path d="M12 2L3 7l9 5 9-5-9-5z" fill="white"/></svg>
              </div>
              <span className="text-white font-bold text-base" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>RIDERMO</span>
            </div>
            <span className="text-xs text-white/50 font-medium uppercase tracking-widest">Invoice</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Invoice No.</p>
              <p className="text-white font-bold text-lg mt-0.5" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{invoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Date</p>
              <p className="text-white text-sm font-semibold mt-0.5">
                {new Date(invoice.sale_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Customer */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">Bill To</p>
            <div className="p-3 bg-[#FAFAFA] rounded-xl">
              <p className="text-sm font-bold text-[#0A0A0A]">{customer?.full_name}</p>
              {customer?.phone && <p className="text-xs text-[#9A9A9A] mt-0.5">{customer.phone}</p>}
              {customer?.nic && <p className="text-xs text-[#9A9A9A]">NIC: {customer.nic}</p>}
            </div>
          </div>

          {/* Vehicle */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">Vehicle</p>
            <div className="p-3 bg-[#FAFAFA] rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#9A9A9A]">Model</span>
                <span className="text-xs font-semibold text-[#0A0A0A]">{bike?.bike_models?.name || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#9A9A9A]">Round No.</span>
                <span className="text-xs font-bold text-[#FF4C00] font-mono">{bike?.round_number || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#9A9A9A]">Chassis</span>
                <span className="text-xs font-mono text-[#4A4A4A]">{bike?.chassis_number || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#9A9A9A]">Engine</span>
                <span className="text-xs font-mono text-[#4A4A4A]">{bike?.engine_number || "—"}</span>
              </div>
              {bike?.bike_colors && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#9A9A9A]">Color</span>
                  <div className="flex items-center gap-1.5">
                    {bike.bike_colors.hex_code && <div className="w-3 h-3 rounded-full border border-[#E5E5E5]" style={{ backgroundColor: bike.bike_colors.hex_code }} />}
                    <span className="text-xs text-[#4A4A4A]">{bike.bike_colors.name}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment summary */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">Payment</p>
            <div className="p-3 bg-[#FAFAFA] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#9A9A9A]">Payment Type</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${invoice.payment_type === "cash" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                  {invoice.payment_type === "cash" ? "Full Cash" : "Finance"}
                </span>
              </div>
              {totalComm > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#9A9A9A]">Commission</span>
                  <span className="text-xs font-semibold text-emerald-700">Rs. {totalComm.toLocaleString("en", { maximumFractionDigits: 0 })}</span>
                </div>
              )}
              <div className="border-t border-[#E5E5E5] pt-2 flex items-center justify-between">
                <span className="text-sm font-bold text-[#0A0A0A]">Total</span>
                <span className="text-base font-bold text-[#FF4C00]">Rs. {invoice.total_amount.toLocaleString("en", { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setFullView(true)}
              className="flex-1 flex items-center justify-center gap-2 h-9 border border-[#E5E5E5] text-xs font-semibold text-[#4A4A4A] rounded-xl hover:bg-[#F5F5F5] transition-all">
              <Eye className="h-3.5 w-3.5" /> Full View
            </button>
            <button
              onClick={() => printInvoice(invoice)}
              className="flex-1 flex items-center justify-center gap-2 h-9 bg-[#FF4C00] hover:bg-[#E64400] text-white text-xs font-semibold rounded-xl transition-all">
              <Download className="h-3.5 w-3.5" /> Download PDF
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
