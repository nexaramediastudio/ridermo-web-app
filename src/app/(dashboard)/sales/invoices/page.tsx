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

function InvoicePreview({ invoice }: { invoice: InvoiceRow }) {
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
          <button className="flex-1 flex items-center justify-center gap-2 h-9 border border-[#E5E5E5] text-xs font-semibold text-[#4A4A4A] rounded-xl hover:bg-[#F5F5F5] transition-all">
            <Eye className="h-3.5 w-3.5" /> Full View
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 h-9 bg-[#FF4C00] hover:bg-[#E64400] text-white text-xs font-semibold rounded-xl transition-all">
            <Download className="h-3.5 w-3.5" /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
