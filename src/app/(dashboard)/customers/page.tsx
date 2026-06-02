"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, Search, User, Phone, CreditCard, MapPin, X, ChevronRight } from "lucide-react";

interface CustomerRow {
  id: string;
  full_name: string;
  phone?: string;
  nic?: string;
  address?: string;
  email?: string;
  created_at: string;
  sale_count?: number;
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

  return (
    <div className="space-y-5 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold text-[#0A0A0A]"
            style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
          >
            Customers
          </h2>
          <p className="text-sm text-[#9A9A9A] mt-0.5">{customers.length} total customers</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 h-9 px-4 bg-[#FF4C00] hover:bg-[#E64400] text-white text-sm font-semibold rounded-xl transition-all"
        >
          <Plus className="h-4 w-4" /> Add Customer
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone or NIC..."
          className="w-full h-9 pl-9 pr-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white"
        />
      </div>

      <div className="bg-white rounded-2xl border border-[#EFEFEF] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#F0F0F0]">
              {["Customer", "Phone", "NIC", "Address", "Joined", ""].map((h) => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[#F8F8F8]">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 bg-[#F0F0F0] rounded animate-pulse" style={{ width: j === 0 ? "160px" : "100px" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center">
                  <User className="h-10 w-10 mx-auto mb-3 text-[#E0E0E0]" />
                  <p className="text-sm font-semibold text-[#6B6B6B]">No customers yet</p>
                  <p className="text-xs text-[#ABABAB] mt-1">Customers are created automatically when a sale is made</p>
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="border-b border-[#F8F8F8] hover:bg-[#FAFAFA] transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#FF4C00]/8 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-[#FF4C00]">
                          {c.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0A0A0A]">{c.full_name}</p>
                        {c.email && <p className="text-xs text-[#9A9A9A]">{c.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-[#4A4A4A]">
                      <Phone className="h-3.5 w-3.5 text-[#ABABAB]" />
                      {c.phone || "—"}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-[#4A4A4A]">
                      <CreditCard className="h-3.5 w-3.5 text-[#ABABAB]" />
                      {c.nic || "—"}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-[#6B6B6B] max-w-[200px]">
                      <MapPin className="h-3.5 w-3.5 text-[#ABABAB] flex-shrink-0" />
                      <span className="truncate">{c.address || "—"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-[#6B6B6B]">
                      {new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-[#FF4C00] font-semibold hover:underline transition-all">
                      View <ChevronRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#EFEFEF] z-10">
        <div className="flex items-center justify-between p-6 border-b border-[#F0F0F0]">
          <h3 className="text-lg font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Add Customer</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#F5F5F5]"><X className="h-4 w-4 text-[#6B6B6B]" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {[
            { key: "full_name", label: "Full Name", required: true },
            { key: "phone", label: "Phone", required: true },
            { key: "nic", label: "NIC Number" },
            { key: "email", label: "Email" },
            { key: "address", label: "Address" },
          ].map(({ key, label, required }) => (
            <div key={key} className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">{label} {required && <span className="text-[#FF4C00]">*</span>}</label>
              <input
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required={required}
                className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]"
              />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-[#E5E5E5] text-sm font-semibold text-[#4A4A4A] hover:bg-[#F5F5F5]">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-10 bg-[#FF4C00] hover:bg-[#E64400] text-white text-sm font-semibold rounded-xl disabled:opacity-60">
              {saving ? "Saving..." : "Add Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
