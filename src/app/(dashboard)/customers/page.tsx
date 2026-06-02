"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, Search, X, Users, UserPlus, TrendingUp, ChevronRight, Phone, CreditCard, MapPin } from "lucide-react";

interface CustomerRow {
  id: string;
  full_name: string;
  phone?: string;
  nic?: string;
  address?: string;
  email?: string;
  created_at: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load customers");
    else setCustomers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.nic?.includes(q)
    );
  });

  const thisMonth = customers.filter((c) => {
    const d = new Date(c.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF4C00]/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-[#FF4C00]" />
          </div>
          <div>
            <h1 className="r-page-title">Customers</h1>
            <p className="r-page-sub">{customers.length} total · {thisMonth} added this month</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(true)} className="r-btn-primary">
          <Plus className="h-4 w-4" /> Add Customer
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Customers", value: customers.length, icon: Users, color: "text-[#0A0A0A]" },
          { label: "Added This Month", value: thisMonth, icon: UserPlus, color: "text-emerald-600" },
          { label: "Total Purchases", value: "—", icon: TrendingUp, color: "text-[#FF4C00]" },
        ].map((kpi) => (
          <div key={kpi.label} className="r-kpi">
            <div className="flex items-center justify-between mb-3">
              <span className="r-page-sub">{kpi.label}</span>
              <kpi.icon className="h-4 w-4 text-[#ABABAB]" />
            </div>
            <p className={`text-2xl font-bold font-display ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="r-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F0F0F0] flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone or NIC..."
              className="r-input pl-9 max-w-sm"
            />
          </div>
          {search && (
            <button onClick={() => setSearch("")} className="r-btn-ghost r-btn">
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
          <span className="ml-auto text-[11px] text-[#ABABAB] font-medium">{filtered.length} results</span>
        </div>

        <table className="r-table">
          <thead>
            <tr className="r-thead-row">
              <th className="r-th">Customer</th>
              <th className="r-th">Phone</th>
              <th className="r-th">NIC</th>
              <th className="r-th">Address</th>
              <th className="r-th">Joined</th>
              <th className="r-th w-12"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-[#F5F5F5]">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="r-td">
                      <div className="h-4 bg-[#F0F0F0] rounded animate-pulse" style={{ width: j === 0 ? "160px" : "100px" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#F5F5F5] flex items-center justify-center mx-auto mb-3">
                    <Users className="h-7 w-7 text-[#ABABAB]" />
                  </div>
                  <p className="text-[13px] font-semibold text-[#4A4A4A]">
                    {search ? "No customers match your search" : "No customers yet"}
                  </p>
                  <p className="text-[11px] text-[#ABABAB] mt-1">
                    {search ? "Try a different search term" : "Customers are created automatically when a sale is made"}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="r-tr group">
                  <td className="r-td">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#FF4C00]/8 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-[#FF4C00]">
                          {c.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#0A0A0A]">{c.full_name}</p>
                        {c.email && <p className="text-[11px] text-[#9A9A9A]">{c.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="r-td">
                    <div className="flex items-center gap-1.5 text-[13px] text-[#4A4A4A]">
                      <Phone className="h-3 w-3 text-[#ABABAB]" />
                      {c.phone || "—"}
                    </div>
                  </td>
                  <td className="r-td">
                    <div className="flex items-center gap-1.5 text-[13px] text-[#4A4A4A]">
                      <CreditCard className="h-3 w-3 text-[#ABABAB]" />
                      {c.nic || "—"}
                    </div>
                  </td>
                  <td className="r-td">
                    <div className="flex items-center gap-1.5 text-[13px] text-[#6B6B6B] max-w-[200px]">
                      <MapPin className="h-3 w-3 text-[#ABABAB] flex-shrink-0" />
                      <span className="truncate">{c.address || "—"}</span>
                    </div>
                  </td>
                  <td className="r-td">
                    <span className="text-[12px] text-[#6B6B6B]">
                      {new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </td>
                  <td className="r-td">
                    <button className="opacity-0 group-hover:opacity-100 h-7 w-7 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5] transition-all">
                      <ChevronRight className="h-3.5 w-3.5 text-[#9A9A9A]" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-[#F0F0F0] bg-[#FAFAFA] flex items-center justify-between">
            <span className="text-[11px] text-[#ABABAB]">{filtered.length} of {customers.length} customers</span>
          </div>
        )}
      </div>

      {showAdd && (
        <AddCustomerModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); loadCustomers(); }}
        />
      )}
    </div>
  );
}

function AddCustomerModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ full_name: "", phone: "", nic: "", address: "", email: "" });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("customers").insert(form);
    if (error) toast.error(error.message);
    else { toast.success("Customer added"); onSuccess(); }
    setSaving(false);
  }

  return (
    <div className="r-modal-overlay">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="r-modal relative max-w-md w-full">
        <div className="r-modal-header">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF4C00]/10 flex items-center justify-center">
              <UserPlus className="h-4 w-4 text-[#FF4C00]" />
            </div>
            <h3 className="text-[15px] font-bold text-[#0A0A0A] font-display">Add Customer</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5]">
            <X className="h-4 w-4 text-[#6B6B6B]" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="r-modal-body">
          {[
            { key: "full_name", label: "Full Name", placeholder: "Customer full name", required: true },
            { key: "phone", label: "Phone Number", placeholder: "07X XXX XXXX", required: true },
            { key: "nic", label: "NIC Number", placeholder: "XXXXXXXXXX" },
            { key: "email", label: "Email Address", placeholder: "customer@email.com" },
            { key: "address", label: "Address", placeholder: "Full address" },
          ].map(({ key, label, placeholder, required }) => (
            <div key={key}>
              <label className="r-label">{label} {required && <span className="text-[#FF4C00]">*</span>}</label>
              <input
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required={required}
                placeholder={placeholder}
                className="r-input"
              />
            </div>
          ))}
        </form>
        <div className="r-modal-footer">
          <button type="button" onClick={onClose} className="r-btn-secondary">Cancel</button>
          <button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={saving} className="r-btn-primary disabled:opacity-60">
            {saving ? "Saving..." : "Add Customer"}
          </button>
        </div>
      </div>
    </div>
  );
}
