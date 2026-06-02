"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";
import {
  Plus,
  Search,
  FileText,
  TrendingUp,
  Bike,
  User,
  CreditCard,
  ArrowRight,
  Building2,
} from "lucide-react";

interface SaleRow {
  id: string;
  invoice_number: string;
  sale_date: string;
  total_amount: number;
  payment_type: "cash" | "finance";
  status: string;
  tvs_commission: number;
  finance_commission: number;
  insurance_commission: number;
  inventory_bikes: {
    round_number: string;
    bike_models: { name: string } | null;
  } | null;
  customers: { full_name: string; phone?: string } | null;
}

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");

  const loadSales = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("sales")
      .select(`
        id, invoice_number, sale_date, total_amount, payment_type, status,
        tvs_commission, finance_commission, insurance_commission,
        inventory_bikes(round_number, bike_models(name)),
        customers(full_name, phone)
      `)
      .order("created_at", { ascending: false });

    if (dateFilter === "today") {
      query = query.eq("sale_date", new Date().toISOString().split("T")[0]);
    } else if (dateFilter === "month") {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      query = query.gte("sale_date", start);
    }

    const { data, error } = await query.limit(100);
    if (error) toast.error("Failed to load sales");
    else setSales((data as unknown as SaleRow[]) || []);
    setLoading(false);
  }, [dateFilter]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const filtered = sales.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.invoice_number.toLowerCase().includes(q) ||
      s.customers?.full_name?.toLowerCase().includes(q) ||
      s.inventory_bikes?.round_number?.toLowerCase().includes(q) ||
      s.inventory_bikes?.bike_models?.name?.toLowerCase().includes(q)
    );
  });

  const totalRevenue = filtered.reduce((sum, s) => sum + s.total_amount, 0);
  const totalTVS = filtered.reduce((sum, s) => sum + (s.tvs_commission || 0), 0);
  const totalFinance = filtered.reduce((sum, s) => sum + (s.finance_commission || 0), 0);
  const totalInsurance = filtered.reduce((sum, s) => sum + (s.insurance_commission || 0), 0);

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold text-[#0A0A0A]"
            style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
          >
            Sales History
          </h2>
          <p className="text-sm text-[#9A9A9A] mt-0.5">{filtered.length} transactions</p>
        </div>
        <Link
          href="/sales/new"
          className="flex items-center gap-2 h-9 px-4 bg-[#FF4C00] hover:bg-[#E64400] text-white text-sm font-semibold rounded-xl transition-all"
        >
          <Plus className="h-4 w-4" /> New Sale
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `Rs. ${totalRevenue.toLocaleString()}`, icon: TrendingUp, accent: true },
          { label: "TVS Commission", value: `Rs. ${totalTVS.toLocaleString()}`, icon: Bike },
          { label: "Finance Commission", value: `Rs. ${totalFinance.toLocaleString()}`, icon: Building2 },
          { label: "Insurance Commission", value: `Rs. ${totalInsurance.toLocaleString()}`, icon: CreditCard },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div
            key={label}
            className={`bg-white rounded-2xl border p-4 ${accent ? "border-[#FF4C00]/20" : "border-[#EFEFEF]"}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">{label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? "bg-[#FF4C00]/10" : "bg-[#F5F5F5]"}`}>
                <Icon className={`h-4 w-4 ${accent ? "text-[#FF4C00]" : "text-[#9A9A9A]"}`} />
              </div>
            </div>
            <p
              className={`text-lg font-bold ${accent ? "text-[#FF4C00]" : "text-[#0A0A0A]"}`}
              style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
            >
              {value}
            </p>
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
            placeholder="Search invoice, customer, bike..."
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white"
          />
        </div>
        <div className="flex items-center gap-1 bg-[#F5F5F5] rounded-xl p-1">
          {[
            { id: "all", label: "All Time" },
            { id: "month", label: "This Month" },
            { id: "today", label: "Today" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id)}
              className={`h-7 px-3 rounded-lg text-xs font-semibold transition-all ${
                dateFilter === f.id ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#6B6B6B]"
              }`}
            >
              {f.label}
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
                {["Invoice", "Date", "Customer", "Bike", "Payment", "Amount", "Commission", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3.5 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#F8F8F8]">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-[#F0F0F0] rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <FileText className="h-10 w-10 mx-auto mb-3 text-[#E0E0E0]" />
                    <p className="text-sm font-semibold text-[#6B6B6B]">No sales found</p>
                    <p className="text-xs text-[#ABABAB] mt-1">Start making sales to see them here</p>
                    <Link
                      href="/sales/new"
                      className="mt-4 inline-flex items-center gap-2 h-9 px-4 bg-[#FF4C00] text-white text-sm font-semibold rounded-xl"
                    >
                      <Plus className="h-4 w-4" /> New Sale
                    </Link>
                  </td>
                </tr>
              ) : (
                filtered.map((sale) => {
                  const totalComm =
                    (sale.tvs_commission || 0) +
                    (sale.finance_commission || 0) +
                    (sale.insurance_commission || 0);
                  return (
                    <tr key={sale.id} className="border-b border-[#F8F8F8] hover:bg-[#FAFAFA] transition-colors group">
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-[#FF4C00]">{sale.invoice_number}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-[#4A4A4A]">
                          {new Date(sale.sale_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#F5F5F5] flex items-center justify-center flex-shrink-0">
                            <User className="h-3.5 w-3.5 text-[#9A9A9A]" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#0A0A0A]">{sale.customers?.full_name || "—"}</p>
                            <p className="text-xs text-[#9A9A9A]">{sale.customers?.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-semibold text-[#0A0A0A]">{sale.inventory_bikes?.bike_models?.name || "—"}</p>
                          <p className="text-xs text-[#FF4C00] font-mono">{sale.inventory_bikes?.round_number}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${
                            sale.payment_type === "cash"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {sale.payment_type === "cash" ? "Cash" : "Finance"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-[#0A0A0A]">
                          Rs. {sale.total_amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-emerald-700">
                          {totalComm > 0 ? `Rs. ${totalComm.toLocaleString()}` : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-[#FF4C00] font-semibold hover:underline transition-all">
                          View <ArrowRight className="h-3 w-3" />
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
    </div>
  );
}
