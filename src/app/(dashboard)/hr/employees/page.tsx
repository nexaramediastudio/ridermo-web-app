"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Plus, Search, User, Phone, CreditCard, Briefcase,
  X, ChevronRight, UserCheck, UserX, Star,
} from "lucide-react";

interface Employee {
  id: string;
  employee_code?: string;
  full_name: string;
  phone?: string;
  nic?: string;
  designation?: string;
  department?: string;
  type: "director" | "worker";
  basic_salary: number;
  join_date?: string;
  is_active: boolean;
  created_at: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "director" | "worker">("all");

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("full_name");
    if (error) toast.error("Failed to load employees");
    else setEmployees(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  const filtered = employees.filter((e) => {
    const matchSearch = !search ||
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.phone?.includes(search) ||
      e.nic?.includes(search) ||
      e.employee_code?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || e.type === typeFilter;
    return matchSearch && matchType;
  });

  const active = employees.filter((e) => e.is_active).length;
  const directors = employees.filter((e) => e.type === "director").length;

  async function toggleStatus(id: string, current: boolean) {
    const supabase = createClient();
    await supabase.from("employees").update({ is_active: !current }).eq("id", id);
    loadEmployees();
    toast.success(current ? "Employee deactivated" : "Employee activated");
  }

  return (
    <div className="space-y-5 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold text-[#0A0A0A]"
            style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
          >
            Employees
          </h2>
          <p className="text-sm text-[#9A9A9A] mt-0.5">
            {active} active · {directors} directors
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 h-9 px-4 bg-[#FF4C00] hover:bg-[#E64400] text-white text-sm font-semibold rounded-xl transition-all"
        >
          <Plus className="h-4 w-4" /> Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, NIC..."
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white"
          />
        </div>
        <div className="flex items-center gap-1 bg-[#F5F5F5] rounded-xl p-1">
          {(["all", "director", "worker"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`h-7 px-3 rounded-lg text-xs font-semibold transition-all capitalize ${typeFilter === t ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#6B6B6B]"}`}
            >
              {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1) + "s"}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#EFEFEF] p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#F0F0F0]" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-[#F0F0F0] rounded w-3/4" />
                  <div className="h-3 bg-[#F0F0F0] rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EFEFEF] p-16 text-center">
          <User className="h-12 w-12 mx-auto mb-3 text-[#E0E0E0]" />
          <p className="text-sm font-semibold text-[#6B6B6B]">No employees found</p>
          <p className="text-xs text-[#ABABAB] mt-1">Add your first employee to get started</p>
          <button onClick={() => setShowAdd(true)} className="mt-4 flex items-center gap-2 h-9 px-4 bg-[#FF4C00] text-white text-sm font-semibold rounded-xl mx-auto">
            <Plus className="h-4 w-4" /> Add Employee
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp) => (
            <div
              key={emp.id}
              className={`bg-white rounded-2xl border p-5 transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)] ${emp.is_active ? "border-[#EFEFEF]" : "border-[#F5F5F5] opacity-60"}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-base font-bold ${emp.type === "director" ? "bg-[#FF4C00]/15 text-[#FF4C00]" : "bg-[#F5F5F5] text-[#6B6B6B]"}`}>
                  {emp.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-[#0A0A0A] truncate">{emp.full_name}</p>
                    {emp.type === "director" && (
                      <Star className="h-3.5 w-3.5 text-[#FF4C00] fill-[#FF4C00] flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-[#9A9A9A] mt-0.5">
                    {emp.designation || emp.type.charAt(0).toUpperCase() + emp.type.slice(1)}
                    {emp.department && ` · ${emp.department}`}
                  </p>
                </div>
                <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${emp.is_active ? "bg-emerald-50 text-emerald-700" : "bg-[#F0F0F0] text-[#9A9A9A]"}`}>
                  {emp.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {emp.phone && (
                  <div className="flex items-center gap-2 text-xs text-[#6B6B6B]">
                    <Phone className="h-3.5 w-3.5 text-[#ABABAB]" />
                    {emp.phone}
                  </div>
                )}
                {emp.nic && (
                  <div className="flex items-center gap-2 text-xs text-[#6B6B6B]">
                    <CreditCard className="h-3.5 w-3.5 text-[#ABABAB]" />
                    {emp.nic}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-[#6B6B6B]">
                  <Briefcase className="h-3.5 w-3.5 text-[#ABABAB]" />
                  Basic: <span className="font-semibold text-[#0A0A0A]">Rs. {emp.basic_salary.toLocaleString()}</span>
                </div>
                {emp.employee_code && (
                  <div className="flex items-center gap-2 text-xs text-[#6B6B6B]">
                    <span className="text-[#ABABAB]">#</span>
                    <span className="font-mono">{emp.employee_code}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#F5F5F5]">
                <button
                  onClick={() => toggleStatus(emp.id, emp.is_active)}
                  className={`flex-1 h-8 rounded-lg text-xs font-semibold transition-all ${emp.is_active ? "bg-[#F5F5F5] text-[#6B6B6B] hover:bg-red-50 hover:text-red-600" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                >
                  {emp.is_active ? (
                    <span className="flex items-center justify-center gap-1"><UserX className="h-3.5 w-3.5" /> Deactivate</span>
                  ) : (
                    <span className="flex items-center justify-center gap-1"><UserCheck className="h-3.5 w-3.5" /> Activate</span>
                  )}
                </button>
                <button className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#F5F5F5] hover:bg-[#FF4C00]/10 hover:text-[#FF4C00] transition-all">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddEmployeeModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); loadEmployees(); }}
        />
      )}
    </div>
  );
}

function AddEmployeeModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    employee_code: "", full_name: "", phone: "", nic: "", email: "",
    address: "", type: "worker", designation: "", department: "",
    basic_salary: "", join_date: new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("employees").insert({
      ...form,
      basic_salary: parseFloat(form.basic_salary) || 0,
      employee_code: form.employee_code || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Employee added"); onSuccess(); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#EFEFEF] z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#F0F0F0] sticky top-0 bg-white z-10">
          <h3 className="text-lg font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Add Employee</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#F5F5F5]"><X className="h-4 w-4 text-[#6B6B6B]" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Employee Type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#1A1A1A]">Employee Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["worker", "director"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={`h-10 rounded-xl border-2 text-sm font-semibold transition-all capitalize ${form.type === t ? "border-[#FF4C00] bg-[#FF4C00]/5 text-[#FF4C00]" : "border-[#E5E5E5] text-[#4A4A4A]"}`}
                >
                  {t === "director" && <Star className="h-3.5 w-3.5 inline mr-1 fill-current" />}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Full Name <span className="text-[#FF4C00]">*</span></label>
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required placeholder="Employee full name" className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Employee Code</label>
              <input value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} placeholder="EMP001" className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] uppercase" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Phone <span className="text-[#FF4C00]">*</span></label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="07X XXX XXXX" className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">NIC</label>
              <input value={form.nic} onChange={(e) => setForm({ ...form, nic: e.target.value })} placeholder="XXXXXXXXXX" className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Designation</label>
              <input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Sales Executive" className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Department</label>
              <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="e.g. Sales" className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Basic Salary (Rs.)</label>
              <input type="number" value={form.basic_salary} onChange={(e) => setForm({ ...form, basic_salary: e.target.value })} placeholder="0" className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Join Date</label>
              <input type="date" value={form.join_date} onChange={(e) => setForm({ ...form, join_date: e.target.value })} className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-[#E5E5E5] text-sm font-semibold text-[#4A4A4A] hover:bg-[#F5F5F5]">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-10 bg-[#FF4C00] hover:bg-[#E64400] text-white text-sm font-semibold rounded-xl disabled:opacity-60">
              {saving ? "Saving..." : "Add Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
