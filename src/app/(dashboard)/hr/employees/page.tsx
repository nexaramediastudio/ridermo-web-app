"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Plus, Search, User, Phone, CreditCard, Briefcase,
  Star, Trash2, Pencil,
} from "lucide-react";
import { EmployeeFormModal, type EmployeeRecord } from "@/components/hr/employee-form-modal";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "director" | "worker">("all");
  const [modalEmployee, setModalEmployee] = useState<EmployeeRecord | null | undefined>(undefined);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("employees").select("*").order("full_name");
    if (error) toast.error("Failed to load employees");
    else setEmployees((data as EmployeeRecord[]) || []);
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

  async function deleteEmployee(id: string, name: string) {
    if (!window.confirm(`Delete employee "${name}"? This cannot be undone.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Employee deleted"); loadEmployees(); }
  }

  async function toggleStatus(id: string, current: boolean) {
    const supabase = createClient();
    await supabase.from("employees").update({ is_active: !current }).eq("id", id);
    loadEmployees();
    toast.success(current ? "Employee deactivated" : "Employee activated");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF4C00]/10 flex items-center justify-center">
            <User className="h-5 w-5 text-[#FF4C00]" />
          </div>
          <div>
            <h1 className="r-page-title">Employees</h1>
            <p className="r-page-sub">{active} active · {directors} director{directors !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button onClick={() => setModalEmployee(null)} className="r-btn-primary">
          <Plus className="h-4 w-4" /> Add Employee
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Employees", value: employees.length, color: "text-[#0A0A0A]" },
          { label: "Active", value: active, color: "text-emerald-600" },
          { label: "Directors", value: directors, color: "text-[#FF4C00]" },
        ].map((k) => (
          <div key={k.label} className="r-kpi">
            <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-wide">{k.label}</p>
            <p className={`text-xl font-bold tabular-nums ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, NIC..." className="r-input pl-9 max-w-sm" />
        </div>
        <div className="r-tabs">
          {(["all", "director", "worker"] as const).map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)} className={typeFilter === t ? "r-tab-on" : "r-tab-off"}>
              {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1) + "s"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="r-card p-5 animate-pulse"><div className="h-20 bg-[#F0F0F0] rounded" /></div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="r-card p-16 text-center">
          <User className="h-8 w-8 mx-auto mb-2 text-[#ABABAB]" />
          <p className="text-[13px] font-semibold text-[#4A4A4A]">No employees found</p>
          <button onClick={() => setModalEmployee(null)} className="mt-4 r-btn-primary mx-auto">
            <Plus className="h-4 w-4" /> Add Employee
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp) => (
            <div key={emp.id} className={`r-card p-5 transition-colors hover:border-[#D0D0D0] ${!emp.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-base font-bold ${emp.type === "director" ? "bg-[#FF4C00]/15 text-[#FF4C00]" : "bg-[#F5F5F5] text-[#6B6B6B]"}`}>
                  {emp.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#0A0A0A] truncate">{emp.full_name}</p>
                  <p className="text-xs text-[#9A9A9A] mt-0.5 capitalize">{emp.designation || emp.type}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${emp.is_active ? "bg-emerald-50 text-emerald-700" : "bg-[#F0F0F0] text-[#9A9A9A]"}`}>
                  {emp.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-xs text-[#6B6B6B]">
                {emp.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-[#ABABAB]" />{emp.phone}</div>}
                {emp.nic && <div className="flex items-center gap-2"><CreditCard className="h-3.5 w-3.5 text-[#ABABAB]" />{emp.nic}</div>}
                <div className="flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5 text-[#ABABAB]" />
                  {emp.salary_type === "hourly" ? (
                    <span>Rs. {Number(emp.hourly_rate || 0).toLocaleString()} / hr</span>
                  ) : (
                    <span>Rs. {Number(emp.basic_salary || 0).toLocaleString()} / month</span>
                  )}
                </div>
                {(emp.has_epf || emp.has_etf) && (
                  <p className="text-[10px] text-[#9A9A9A]">
                    {[emp.has_epf && "EPF", emp.has_etf && "ETF"].filter(Boolean).join(" + ")} deductions
                  </p>
                )}
                {emp.type === "worker" && emp.per_bike_commission > 0 && (
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    Rs. {emp.per_bike_commission.toLocaleString()} / bike
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#F5F5F5]">
                <button
                  onClick={() => setModalEmployee(emp)}
                  className="flex-1 h-8 rounded-lg text-xs font-semibold bg-[#F5F5F5] text-[#6B6B6B] hover:bg-[#FF4C00]/10 hover:text-[#FF4C00] flex items-center justify-center gap-1"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={() => toggleStatus(emp.id, emp.is_active)}
                  className={`flex-1 h-8 rounded-lg text-xs font-semibold ${emp.is_active ? "bg-[#F5F5F5] text-[#6B6B6B] hover:bg-red-50 hover:text-red-600" : "bg-emerald-50 text-emerald-700"}`}
                >
                  {emp.is_active ? "Deactivate" : "Activate"}
                </button>
                <button onClick={() => deleteEmployee(emp.id, emp.full_name)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-500 text-[#ABABAB]">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalEmployee !== undefined && (
        <EmployeeFormModal
          employee={modalEmployee}
          onClose={() => setModalEmployee(undefined)}
          onSuccess={() => { setModalEmployee(undefined); loadEmployees(); }}
        />
      )}
    </div>
  );
}
