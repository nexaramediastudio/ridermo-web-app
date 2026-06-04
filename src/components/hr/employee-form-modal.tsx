"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { User, X, Star, Check } from "lucide-react";

export interface EmployeeRecord {
  id: string;
  employee_code?: string;
  full_name: string;
  phone?: string;
  nic?: string;
  email?: string;
  address?: string;
  type: "director" | "worker";
  designation?: string;
  department?: string;
  basic_salary: number;
  per_bike_commission: number;
  salary_type: "monthly" | "hourly";
  hourly_rate: number;
  has_epf: boolean;
  has_etf: boolean;
  join_date?: string;
  is_active: boolean;
}

type FormState = {
  employee_code: string;
  full_name: string;
  phone: string;
  nic: string;
  email: string;
  address: string;
  type: "director" | "worker";
  designation: string;
  department: string;
  basic_salary: string;
  hourly_rate: string;
  salary_type: "monthly" | "hourly";
  per_bike_commission: string;
  has_epf: boolean;
  has_etf: boolean;
  join_date: string;
};

const emptyForm = (): FormState => ({
  employee_code: "",
  full_name: "",
  phone: "",
  nic: "",
  email: "",
  address: "",
  type: "worker",
  designation: "",
  department: "",
  basic_salary: "",
  hourly_rate: "",
  salary_type: "monthly" as const,
  per_bike_commission: "",
  has_epf: true,
  has_etf: true,
  join_date: new Date().toISOString().split("T")[0],
});

export function EmployeeFormModal({
  employee,
  onClose,
  onSuccess,
}: {
  employee?: EmployeeRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!employee;
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (employee) {
      setForm({
        employee_code: employee.employee_code || "",
        full_name: employee.full_name,
        phone: employee.phone || "",
        nic: employee.nic || "",
        email: employee.email || "",
        address: employee.address || "",
        type: employee.type,
        designation: employee.designation || "",
        department: employee.department || "",
        basic_salary: String(employee.basic_salary || ""),
        hourly_rate: String(employee.hourly_rate || ""),
        salary_type: employee.salary_type || "monthly",
        per_bike_commission: String(employee.per_bike_commission || ""),
        has_epf: employee.has_epf ?? employee.type === "worker",
        has_etf: employee.has_etf ?? employee.type === "worker",
        join_date: employee.join_date || new Date().toISOString().split("T")[0],
      });
    }
  }, [employee]);

  function setType(t: "director" | "worker") {
    setForm((f) => ({
      ...f,
      type: t,
      has_epf: t === "worker" ? f.has_epf : false,
      has_etf: t === "worker" ? f.has_etf : false,
      per_bike_commission: t === "director" ? "0" : f.per_bike_commission,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const payload = {
      employee_code: form.employee_code.trim() || null,
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      nic: form.nic.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      type: form.type,
      designation: form.designation.trim() || null,
      department: form.department.trim() || null,
      salary_type: form.salary_type,
      basic_salary: form.salary_type === "monthly" ? parseFloat(form.basic_salary) || 0 : 0,
      hourly_rate: form.salary_type === "hourly" ? parseFloat(form.hourly_rate) || 0 : 0,
      per_bike_commission: form.type === "worker" ? parseFloat(form.per_bike_commission) || 0 : 0,
      has_epf: form.has_epf,
      has_etf: form.has_etf,
      join_date: form.join_date || null,
    };

    const { error } = isEdit
      ? await supabase.from("employees").update(payload).eq("id", employee!.id)
      : await supabase.from("employees").insert(payload);

    if (error) toast.error(error.message);
    else {
      toast.success(isEdit ? "Employee updated" : "Employee added");
      onSuccess();
    }
    setSaving(false);
  }

  return (
    <div className="r-modal-overlay">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="r-modal relative max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="r-modal-header flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF4C00]/10 flex items-center justify-center">
              <User className="h-4 w-4 text-[#FF4C00]" />
            </div>
            <h3 className="text-[15px] font-bold text-[#0A0A0A] font-display">
              {isEdit ? "Edit Employee" : "Add Employee"}
            </h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5]">
            <X className="h-4 w-4 text-[#6B6B6B]" />
          </button>
        </div>
        <form id="emp-form" onSubmit={handleSubmit} className="r-modal-body overflow-y-auto space-y-4">
          <div>
            <label className="r-label">Employee Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["worker", "director"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`h-9 rounded-xl border-2 text-[13px] font-semibold transition-all capitalize ${form.type === t ? "border-[#FF4C00] bg-[#FF4C00]/5 text-[#FF4C00]" : "border-[#E8E8E8] text-[#4A4A4A]"}`}
                >
                  {t === "director" && <Star className="h-3 w-3 inline mr-1 fill-current" />}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="r-label">Full Name <span className="text-[#FF4C00]">*</span></label>
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required className="r-input" />
            </div>
            <div>
              <label className="r-label">Employee Code</label>
              <input value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} className="r-input uppercase" />
            </div>
            <div>
              <label className="r-label">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="r-input" />
            </div>
            <div>
              <label className="r-label">NIC</label>
              <input value={form.nic} onChange={(e) => setForm({ ...form, nic: e.target.value })} className="r-input" />
            </div>
            <div>
              <label className="r-label">Designation</label>
              <input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} className="r-input" />
            </div>
            <div>
              <label className="r-label">Department</label>
              <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="r-input" />
            </div>
            <div className="col-span-2">
              <label className="r-label">Salary Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(["monthly", "hourly"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, salary_type: s })}
                    className={`h-9 rounded-xl border-2 text-[13px] font-semibold transition-all ${form.salary_type === s ? "border-[#FF4C00] bg-[#FF4C00]/5 text-[#FF4C00]" : "border-[#E8E8E8] text-[#4A4A4A]"}`}
                  >
                    {s === "monthly" ? "Monthly Basic" : "Per Hour"}
                  </button>
                ))}
              </div>
            </div>
            {form.salary_type === "monthly" ? (
              <div className="col-span-2">
                <label className="r-label">Monthly Basic Salary (Rs.)</label>
                <input type="number" min="0" value={form.basic_salary} onChange={(e) => setForm({ ...form, basic_salary: e.target.value })} className="r-input" />
              </div>
            ) : (
              <div className="col-span-2">
                <label className="r-label">Hourly Rate (Rs.)</label>
                <input type="number" min="0" step="0.01" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} className="r-input" />
                <p className="text-[10px] text-[#9A9A9A] mt-1">Pay = hourly rate × hours worked (from attendance)</p>
              </div>
            )}
            {form.type === "worker" && (
              <div className="col-span-2">
                <label className="r-label">Per Bike Commission (Rs.)</label>
                <input type="number" min="0" value={form.per_bike_commission} onChange={(e) => setForm({ ...form, per_bike_commission: e.target.value })} className="r-input" />
              </div>
            )}
            <div>
              <label className="r-label">Join Date</label>
              <input type="date" value={form.join_date} onChange={(e) => setForm({ ...form, join_date: e.target.value })} className="r-input" />
            </div>
            <div className="col-span-2">
              <label className="r-label">Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="r-input" />
            </div>
          </div>

          <div className="bg-[#F5F7FA] rounded-xl p-4 space-y-3">
            <p className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wide">Statutory deductions</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.has_epf}
                onChange={(e) => setForm({ ...form, has_epf: e.target.checked })}
                className="w-4 h-4 rounded border-[#D0D0D0] text-[#FF4C00] focus:ring-[#FF4C00]"
              />
              <span className="text-sm font-medium text-[#0A0A0A]">Deduct EPF (8%)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.has_etf}
                onChange={(e) => setForm({ ...form, has_etf: e.target.checked })}
                className="w-4 h-4 rounded border-[#D0D0D0] text-[#FF4C00] focus:ring-[#FF4C00]"
              />
              <span className="text-sm font-medium text-[#0A0A0A]">Deduct ETF (3%)</span>
            </label>
          </div>
        </form>
        <div className="r-modal-footer flex-shrink-0">
          <button type="button" onClick={onClose} className="r-btn-secondary">Cancel</button>
          <button type="submit" form="emp-form" disabled={saving} className="r-btn-primary disabled:opacity-60">
            <Check className="h-4 w-4" />
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Employee"}
          </button>
        </div>
      </div>
    </div>
  );
}
