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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FF4C00]/10 flex items-center justify-center">
          <FileText className="h-5 w-5 text-[#FF4C00]" />
        </div>
        <div>
          <h1 className="r-page-title">Documents</h1>
          <p className="r-page-sub">All invoices, payslips, cheque records and CR/plate documents</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="r-tabs">
          <button
            onClick={() => setActiveType("all")}
            className={activeType === "all" ? "r-tab-on" : "r-tab-off"}
          >
            All
            <span className="ml-1 text-[10px] font-bold text-[#9A9A9A]">{counts.all}</span>
          </button>
          {(Object.entries(TYPE_CONFIG) as [Exclude<DocType, "all">, typeof TYPE_CONFIG[Exclude<DocType, "all">]][]).map(([type, config]) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`${activeType === type ? "r-tab-on" : "r-tab-off"} flex items-center gap-1.5`}
            >
              <config.icon className="h-3 w-3" />
              {config.label}
              <span className="text-[10px] font-bold text-[#9A9A9A]">{counts[type]}</span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="r-input pl-9"
          />
        </div>
      </div>

      {/* Document list */}
      {loading ? (
        <div className="r-card overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[#F5F5F5] animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-[#F0F0F0] flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-[#F0F0F0] rounded w-48" />
                <div className="h-3 bg-[#F0F0F0] rounded w-32" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="r-card p-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#F5F5F5] flex items-center justify-center mx-auto mb-3">
            <FileText className="h-7 w-7 text-[#ABABAB]" />
          </div>
          <p className="text-[13px] font-semibold text-[#4A4A4A]">No documents found</p>
          <p className="text-[11px] text-[#ABABAB] mt-1">Documents are created automatically as you use the system</p>
        </div>
      ) : (
        <div className="r-card overflow-hidden">
          <div className="divide-y divide-[#F5F5F5]">
            {filtered.map((doc) => {
              const config = TYPE_CONFIG[doc.type as Exclude<DocType, "all">];
              if (!config) return null;

              return (
                <div
                  key={`${doc.type}-${doc.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#FAFAFA] transition-colors group"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                    <config.icon className={`h-4 w-4 ${config.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-[#0A0A0A]">{doc.title}</span>
                      {doc.meta && (
                        <span className="text-[10px] text-[#9A9A9A] bg-[#F5F5F5] px-2 py-0.5 rounded-full font-medium">{doc.meta}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-[#9A9A9A] flex items-center gap-1">
                        <User className="h-2.5 w-2.5" /> {doc.subtitle}
                      </span>
                      <span className="text-[11px] text-[#9A9A9A] flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(doc.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>

                  {doc.amount !== undefined && (
                    <div className="text-right flex-shrink-0">
                      <span className="text-[13px] font-bold text-[#0A0A0A]">
                        Rs. {doc.amount.toLocaleString("en", { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  )}

                  {doc.status && (
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${doc.statusStyle}`}>
                      {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                    </span>
                  )}

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:inline ${config.bg} ${config.color}`}>
                    {config.label}
                  </span>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5]" title="Preview">
                      <Eye className="h-3.5 w-3.5 text-[#9A9A9A]" />
                    </button>
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5]" title="Download">
                      <Download className="h-3.5 w-3.5 text-[#9A9A9A]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-[#F0F0F0] px-5 py-3 bg-[#FAFAFA] flex items-center justify-between">
            <span className="text-[11px] text-[#ABABAB]">{filtered.length} documents · most recent first</span>
          </div>
        </div>
      )}
    </div>
  );
}
