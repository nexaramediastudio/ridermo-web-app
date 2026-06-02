"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  FileText, Receipt, CreditCard, Hash, Search,
  Download, Eye, Filter, ChevronRight,
  ArrowRight, User, Bike, Calendar,
} from "lucide-react";

type DocType = "all" | "invoices" | "payslips" | "cheques" | "cr_plates";

interface Document {
  id: string;
  type: DocType;
  title: string;
  subtitle: string;
  date: string;
  amount?: number;
  status?: string;
  statusStyle?: string;
  meta?: string;
}

const TYPE_CONFIG: Record<Exclude<DocType, "all">, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  invoices: { label: "Invoices", icon: Receipt, color: "text-[#FF4C00]", bg: "bg-[#FF4C00]/10" },
  payslips: { label: "Payslips", icon: FileText, color: "text-emerald-700", bg: "bg-emerald-50" },
  cheques: { label: "Cheques", icon: CreditCard, color: "text-blue-700", bg: "bg-blue-50" },
  cr_plates: { label: "CR & Plates", icon: Hash, color: "text-purple-700", bg: "bg-purple-50" },
};

export default function DocumentsPage() {
  const [activeType, setActiveType] = useState<DocType>("all");
  const [search, setSearch] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const docs: Document[] = [];

    // Load invoices (sales)
    if (activeType === "all" || activeType === "invoices") {
      const { data: sales } = await supabase
        .from("sales")
        .select("id, invoice_number, sale_date, total_amount, status, payment_type, customers(full_name), inventory_bikes(bike_models(name), round_number)")
        .order("sale_date", { ascending: false })
        .limit(50);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sales || []).forEach((s: any) => {
        const customer = Array.isArray(s.customers) ? s.customers[0] : s.customers;
        const bike = Array.isArray(s.inventory_bikes) ? s.inventory_bikes[0] : s.inventory_bikes;
        docs.push({
          id: s.id,
          type: "invoices",
          title: s.invoice_number,
          subtitle: customer?.full_name || "Unknown Customer",
          date: s.sale_date,
          amount: s.total_amount,
          status: s.status,
          statusStyle: s.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-[#F5F5F5] text-[#6B6B6B]",
          meta: (Array.isArray(bike?.bike_models) ? bike.bike_models[0] : bike?.bike_models)?.name || "",
        });
      });
    }

    // Load payslips
    if (activeType === "all" || activeType === "payslips") {
      const { data: payslips } = await supabase
        .from("payroll")
        .select("id, month, year, net_salary, status, employees(full_name)")
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(50);
      const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payslips || []).forEach((p: any) => {
        const employee = Array.isArray(p.employees) ? p.employees[0] : p.employees;
        docs.push({
          id: p.id,
          type: "payslips",
          title: `Payslip — ${MONTHS[p.month - 1]} ${p.year}`,
          subtitle: employee?.full_name || "Unknown",
          date: `${p.year}-${String(p.month).padStart(2, "0")}-01`,
          amount: p.net_salary,
          status: p.status,
          statusStyle: p.status === "paid" ? "bg-emerald-50 text-emerald-700" : p.status === "approved" ? "bg-amber-50 text-amber-700" : "bg-[#F5F5F5] text-[#6B6B6B]",
        });
      });
    }

    // Load cheques
    if (activeType === "all" || activeType === "cheques") {
      const { data: cheques } = await supabase
        .from("cheques")
        .select("id, cheque_number, description, pay_to, payment_date, amount, status, type")
        .order("created_at", { ascending: false })
        .limit(50);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (cheques || []).forEach((c: any) => {
        docs.push({
          id: c.id,
          type: "cheques",
          title: `CHQ ${c.cheque_number}`,
          subtitle: c.pay_to || c.description || "Cheque",
          date: c.payment_date || new Date().toISOString().split("T")[0],
          amount: c.amount,
          status: c.status === "successful" ? "Cleared" : c.status === "returned" ? "Returned" : "Pending",
          statusStyle: c.status === "successful" ? "bg-emerald-50 text-emerald-700" : c.status === "returned" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700",
          meta: c.type.toUpperCase(),
        });
      });
    }

    // Load CR & Plates
    if (activeType === "all" || activeType === "cr_plates") {
      const { data: crRecords } = await supabase
        .from("cr_number_plates")
        .select("id, cr_status, plate_status, created_at, sales(invoice_number, customers(full_name)), inventory_bikes(round_number, bike_models(name))")
        .order("created_at", { ascending: false })
        .limit(50);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (crRecords || []).forEach((r: any) => {
        const sale = Array.isArray(r.sales) ? r.sales[0] : r.sales;
        const bike = Array.isArray(r.inventory_bikes) ? r.inventory_bikes[0] : r.inventory_bikes;
        const customer = Array.isArray(sale?.customers) ? sale.customers[0] : sale?.customers;
        docs.push({
          id: r.id,
          type: "cr_plates",
          title: `CR/Plate — ${bike?.round_number || "Unknown"}`,
          subtitle: customer?.full_name || "Unknown",
          date: r.created_at.split("T")[0],
          status: `CR: ${r.cr_status} · Plate: ${r.plate_status}`,
          statusStyle: (r.cr_status === "pending" || r.plate_status === "pending") ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700",
          meta: sale?.invoice_number || "",
        });
      });
    }

    // Sort by date desc
    docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setDocuments(docs);
    setLoading(false);
  }, [activeType]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const filtered = documents.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      d.subtitle.toLowerCase().includes(q) ||
      d.meta?.toLowerCase().includes(q) ||
      d.status?.toLowerCase().includes(q)
    );
  });

  const counts = {
    all: documents.length,
    invoices: documents.filter((d) => d.type === "invoices").length,
    payslips: documents.filter((d) => d.type === "payslips").length,
    cheques: documents.filter((d) => d.type === "cheques").length,
    cr_plates: documents.filter((d) => d.type === "cr_plates").length,
  };

  return (
    <div className="space-y-5 max-w-[1200px]">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Documents</h2>
        <p className="text-sm text-[#9A9A9A] mt-0.5">All invoices, payslips, cheque records and CR/plate documents</p>
      </div>

      {/* Type tabs */}
      <div className="flex items-center gap-1 bg-[#F5F5F5] rounded-xl p-1 w-fit flex-wrap">
        <button
          onClick={() => setActiveType("all")}
          className={`flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-semibold transition-all ${activeType === "all" ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#6B6B6B]"}`}
        >
          All
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeType === "all" ? "bg-[#FF4C00]/10 text-[#FF4C00]" : "bg-[#E5E5E5] text-[#6B6B6B]"}`}>{counts.all}</span>
        </button>
        {(Object.entries(TYPE_CONFIG) as [Exclude<DocType, "all">, typeof TYPE_CONFIG[Exclude<DocType, "all">]][]).map(([type, config]) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-semibold transition-all ${activeType === type ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#6B6B6B]"}`}
          >
            <config.icon className="h-3.5 w-3.5" />
            {config.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeType === type ? "bg-[#FF4C00]/10 text-[#FF4C00]" : "bg-[#E5E5E5] text-[#6B6B6B]"}`}>{counts[type]}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents..."
          className="w-full h-9 pl-9 pr-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white"
        />
      </div>

      {/* Document list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#EFEFEF] p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#F0F0F0] flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#F0F0F0] rounded w-48" />
                  <div className="h-3 bg-[#F0F0F0] rounded w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EFEFEF] p-14 text-center">
          <FileText className="h-12 w-12 mx-auto mb-3 text-[#E0E0E0]" />
          <p className="text-sm font-semibold text-[#6B6B6B]">No documents found</p>
          <p className="text-xs text-[#ABABAB] mt-1">Documents are created automatically as you use the system</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#EFEFEF] overflow-hidden">
          <div className="divide-y divide-[#F5F5F5]">
            {filtered.map((doc) => {
              const config = TYPE_CONFIG[doc.type as Exclude<DocType, "all">];
              if (!config) return null;

              return (
                <div
                  key={`${doc.type}-${doc.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-[#FAFAFA] transition-colors group"
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                    <config.icon className={`h-5 w-5 ${config.color}`} />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[#0A0A0A]">{doc.title}</span>
                      {doc.meta && (
                        <span className="text-xs text-[#9A9A9A] bg-[#F5F5F5] px-2 py-0.5 rounded-full">{doc.meta}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-[#9A9A9A] flex items-center gap-1">
                        <User className="h-3 w-3" /> {doc.subtitle}
                      </span>
                      <span className="text-xs text-[#9A9A9A] flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(doc.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>

                  {/* Amount */}
                  {doc.amount !== undefined && (
                    <div className="text-right flex-shrink-0">
                      <span className="text-sm font-bold text-[#0A0A0A]">
                        Rs. {doc.amount.toLocaleString("en", { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  )}

                  {/* Status */}
                  {doc.status && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${doc.statusStyle}`}>
                      {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                    </span>
                  )}

                  {/* Type badge */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:block ${config.bg} ${config.color}`}>
                    {config.label}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                    <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#F5F5F5] transition-all" title="Preview">
                      <Eye className="h-4 w-4 text-[#9A9A9A]" />
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#FF4C00]/10 transition-all" title="Download PDF">
                      <Download className="h-4 w-4 text-[#9A9A9A] hover:text-[#FF4C00]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer count */}
          <div className="border-t border-[#F0F0F0] px-5 py-3 bg-[#FAFAFA] flex items-center justify-between">
            <span className="text-xs text-[#9A9A9A]">{filtered.length} documents</span>
            <span className="text-xs text-[#9A9A9A]">Showing most recent first</span>
          </div>
        </div>
      )}
    </div>
  );
}
