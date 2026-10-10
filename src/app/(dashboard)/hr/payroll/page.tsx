"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, DollarSign, Users,
  CheckCircle2, AlertCircle, RefreshCw, Clock,
} from "lucide-react";
import { syncWorkerCommissionsForMonth } from "@/lib/hr/worker-commissions";
import { calculatePayroll, summarizeAttendance, SUNDAY_HOLIDAY_DAY_PAY } from "@/lib/hr/payroll-calc";

interface Employee {
  id: string;
  full_name: string;
  type: "director" | "worker";
  employee_code?: string;
  basic_salary: number;
  hourly_rate: number;
  salary_type: "monthly" | "hourly";
  has_epf: boolean;
  has_etf: boolean;
  is_active: boolean;
  per_bike_commission?: number;
}

interface PayrollEntry {
  id?: string;
  employee_id: string;
  month: number;
  year: number;
  basic_salary: number;
  attendance_bonus: number;
  ot_pay: number;
  bike_commission: number;
  bonus: number;
  gross_salary: number;
  epf_employee: number;
  etf: number;
  other_deductions: number;
  total_deductions: number;
  net_salary: number;
  working_days: number;
  present_days: number;
  worked_days?: number;
  leave_days?: number;
  sunday_holiday_days?: number;
  absent_days: number;
  hours_worked?: number;
  ot_hours?: number;
  late_hours?: number;
  late_deduction?: number;
  status: "draft" | "approved" | "paid";
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const STATUS_STYLES = {
  draft: "bg-[#F5F5F5] text-[#6B6B6B]",
  approved: "bg-amber-50 text-amber-700",
  paid: "bg-emerald-50 text-emerald-700",
};

export default function PayrollPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payroll, setPayroll] = useState<Record<string, PayrollEntry>>({});
  const [bikeCounts, setBikeCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadPayroll = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const monthEnd   = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;

    await syncWorkerCommissionsForMonth(supabase, year, month);

    const [empRes, payRes, attRes, commRes] = await Promise.all([
      supabase.from("employees").select("id, full_name, type, employee_code, basic_salary, hourly_rate, salary_type, has_epf, has_etf, is_active, per_bike_commission").eq("is_active", true).order("full_name"),
      supabase.from("payroll").select("*").eq("month", month).eq("year", year),
      supabase.from("attendance").select("employee_id, status, ot_hours, late_hours, date, is_holiday").gte("date", monthStart).lt("date", monthEnd),
      // All bike commissions for sales in this month — salary, not tied to dealership commission received
      supabase
        .from("worker_commissions")
        .select("employee_id, amount")
        .gte("sale_date", monthStart)
        .lt("sale_date", monthEnd),
    ]);

    const emps = empRes.data || [];
    const existingPayroll = payRes.data || [];
    const attRecords = attRes.data || [];
    const commRecords = commRes.data || [];

    const attByEmp: Record<string, { status: string; ot_hours?: number | null; late_hours?: number | null; date?: string | null; is_holiday?: boolean | null }[]> = {};
    attRecords.forEach((rec) => {
      if (!attByEmp[rec.employee_id]) attByEmp[rec.employee_id] = [];
      attByEmp[rec.employee_id].push(rec);
    });

    const commTotals: Record<string, number> = {};
    const counts: Record<string, number> = {};
    commRecords.forEach((c) => {
      commTotals[c.employee_id] = (commTotals[c.employee_id] || 0) + Number(c.amount);
      counts[c.employee_id] = (counts[c.employee_id] || 0) + 1;
    });
    setBikeCounts(counts);

    setEmployees(emps);

    // Build payroll map
    const payMap: Record<string, PayrollEntry> = {};
    emps.forEach((emp) => {
      const existing = existingPayroll.find((p) => p.employee_id === emp.id);
      const attSummary = summarizeAttendance(attByEmp[emp.id] || []);
      const calc = calculatePayroll({
        salaryType: emp.salary_type || "monthly",
        basicSalary: Number(emp.basic_salary || 0),
        hourlyRate: Number(emp.hourly_rate || 0),
        hasEpf: emp.has_epf ?? false,
        hasEtf: emp.has_etf ?? false,
        attendance: attSummary,
        bikeCommission: emp.type === "worker" ? commTotals[emp.id] || 0 : 0,
        attendanceBonus: existing?.attendance_bonus ?? 0,
        bonus: existing?.bonus ?? 0,
        otherDeductions: existing?.other_deductions ?? 0,
      });

      payMap[emp.id] = {
        id: existing?.id,
        employee_id: emp.id,
        month,
        year,
        basic_salary: calc.earnedBasic,
        attendance_bonus: existing?.attendance_bonus ?? 0,
        ot_pay: calc.otPay,
        bike_commission: calc.bikeCommission,
        bonus: existing?.bonus ?? 0,
        gross_salary: calc.gross,
        epf_employee: calc.epf,
        etf: calc.etf,
        other_deductions: existing?.other_deductions ?? 0,
        total_deductions: calc.totalDeductions,
        net_salary: calc.net,
        working_days: calc.workingDays,
        present_days: calc.presentDays,
        worked_days: calc.workedDays,
        leave_days: calc.leaveDays,
        sunday_holiday_days: calc.sundayHolidayDays,
        absent_days: calc.absentDays,
        hours_worked: calc.hoursWorked,
        ot_hours: attSummary.otHours,
        late_hours: calc.lateHours,
        late_deduction: calc.lateDeduction,
        status: existing?.status ?? "draft",
      };
    });
    setPayroll(payMap);
    setLoading(false);
  }, [month, year]);

  useEffect(() => { loadPayroll(); }, [loadPayroll]);

  function recalculate(empId: string, entry: Partial<PayrollEntry>) {
    const current = { ...payroll[empId], ...entry };
    const gross = current.basic_salary + current.attendance_bonus + current.ot_pay + current.bike_commission + current.bonus;
    const emp = employees.find((e) => e.id === empId);
    const epf = emp?.has_epf ? Math.round(gross * 0.08) : 0;
    const etf = emp?.has_etf ? Math.round(gross * 0.03) : 0;
    const totalDed = epf + etf + (current.other_deductions || 0);
    const net = gross - totalDed;
    setPayroll((prev) => ({
      ...prev,
      [empId]: { ...current, gross_salary: gross, epf_employee: epf, etf, total_deductions: totalDed, net_salary: net },
    }));
  }

  async function handleSaveAll() {
    setSaving(true);
    const supabase = createClient();
    const records = Object.values(payroll).map(({ hours_worked: _h, ot_hours: _ot, late_hours: _lh, late_deduction: _ld, worked_days: _w, leave_days: _l, sunday_holiday_days: _s, ...p }) => p);
    const { error } = await supabase.from("payroll").upsert(records, { onConflict: "employee_id,month,year" });
    if (error) toast.error(error.message);
    else { toast.success("Payroll saved"); loadPayroll(); }
    setSaving(false);
  }

  async function updateStatus(empId: string, status: "approved" | "paid") {
    const supabase = createClient();
    await supabase.from("payroll").update({ status }).eq("employee_id", empId).eq("month", month).eq("year", year);
    setPayroll((prev) => ({ ...prev, [empId]: { ...prev[empId], status } }));
    toast.success(`Status updated to ${status}`);
  }

  function changeMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
  }

  const totalNet = Object.values(payroll).reduce((sum, p) => sum + p.net_salary, 0);
  const totalGross = Object.values(payroll).reduce((sum, p) => sum + p.gross_salary, 0);
  const totalOtHours = Object.values(payroll).reduce((sum, p) => sum + (p.ot_hours || 0), 0);
  const totalOtPay = Object.values(payroll).reduce((sum, p) => sum + (p.ot_pay || 0), 0);
  const paidCount = Object.values(payroll).filter((p) => p.status === "paid").length;

  function formatOt(hours: number) {
    const rounded = Math.round(hours * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
            Payroll
          </h2>
          <p className="text-sm text-[#9A9A9A] mt-0.5">{employees.length} employees</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadPayroll} className="flex items-center gap-2 h-9 px-3 border border-[#E5E5E5] text-sm font-medium text-[#4A4A4A] rounded-xl hover:bg-[#F5F5F5]">
            <RefreshCw className="h-3.5 w-3.5" /> Recalculate
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="flex items-center gap-2 h-9 px-4 bg-[#FF4C00] hover:bg-[#E64400] text-white text-sm font-semibold rounded-xl disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>

      {/* Month selector + summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-[#EFEFEF] p-4 flex items-center gap-3">
          <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center rounded-xl border border-[#E5E5E5] hover:bg-[#F5F5F5]">
            <ChevronLeft className="h-4 w-4 text-[#6B6B6B]" />
          </button>
          <div className="flex-1 text-center">
            <p className="text-base font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
              {MONTHS[month - 1]}
            </p>
            <p className="text-xs text-[#9A9A9A]">{year}</p>
          </div>
          <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center rounded-xl border border-[#E5E5E5] hover:bg-[#F5F5F5]">
            <ChevronRight className="h-4 w-4 text-[#6B6B6B]" />
          </button>
        </div>
        {[
          { label: "Total Gross", value: `Rs. ${totalGross.toLocaleString("en", { maximumFractionDigits: 0 })}`, icon: DollarSign, accent: false },
          { label: "Total Net Payable", value: `Rs. ${totalNet.toLocaleString("en", { maximumFractionDigits: 0 })}`, icon: DollarSign, accent: true },
          { label: "Total OT", value: `Rs. ${totalOtPay.toLocaleString("en", { maximumFractionDigits: 0 })}`, hint: `${formatOt(totalOtHours)} hrs`, icon: Clock, accent: false },
          { label: "Paid", value: `${paidCount} / ${employees.length}`, icon: CheckCircle2, accent: false },
        ].map(({ label, value, hint, icon: Icon, accent }) => (
          <div key={label} className={`bg-white rounded-2xl border p-4 ${accent ? "border-[#FF4C00]/20" : "border-[#EFEFEF]"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">{label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? "bg-[#FF4C00]/10" : "bg-[#F5F5F5]"}`}>
                <Icon className={`h-4 w-4 ${accent ? "text-[#FF4C00]" : "text-[#9A9A9A]"}`} />
              </div>
            </div>
            <p className={`text-lg font-bold ${accent ? "text-[#FF4C00]" : "text-[#0A0A0A]"}`} style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
              {value}
            </p>
            {hint && <p className="text-[11px] text-[#9A9A9A] mt-0.5">{hint}</p>}
          </div>
        ))}
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-2xl border border-[#EFEFEF] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F0F0F0]">
                {["Employee", "Attendance", "Earned Basic", "Commission", "Bonus/OT", "Gross", "EPF/ETF", "Net Salary", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#F8F8F8]">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-[#F0F0F0] rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-[#ABABAB]">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No active employees</p>
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const entry = payroll[emp.id];
                  if (!entry) return null;
                  const isEditing = editingId === emp.id;

                  return (
                    <tr key={emp.id} className={`border-b border-[#F8F8F8] transition-colors ${isEditing ? "bg-[#FFFAF8]" : "hover:bg-[#FAFAFA]"}`}>
                      {/* Employee */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${emp.type === "director" ? "bg-[#FF4C00]/15 text-[#FF4C00]" : "bg-[#F5F5F5] text-[#6B6B6B]"}`}>
                            {emp.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#0A0A0A] whitespace-nowrap">{emp.full_name}</p>
                            <p className="text-xs text-[#9A9A9A] capitalize">{emp.type}</p>
                          </div>
                        </div>
                      </td>
                      {/* Attendance */}
                      <td className="px-4 py-3">
                        <div className="text-xs">
                          <span className="text-emerald-600 font-semibold">{entry.worked_days ?? entry.present_days}P</span>
                          {(entry.leave_days || 0) > 0 && (
                            <>
                              <span className="text-[#9A9A9A] mx-1">/</span>
                              <span className="text-blue-600 font-semibold">{entry.leave_days}L</span>
                            </>
                          )}
                          <span className="text-[#9A9A9A] mx-1">/</span>
                          <span className="text-red-500 font-semibold">{entry.absent_days}A</span>
                          <p className="text-[#9A9A9A] mt-0.5">{entry.present_days}/{entry.working_days} paid days</p>
                          {(entry.sunday_holiday_days || 0) > 0 && (
                            <p className="text-orange-700 font-semibold mt-0.5">
                              {entry.sunday_holiday_days} Sun/holiday × Rs. {SUNDAY_HOLIDAY_DAY_PAY.toLocaleString()}
                            </p>
                          )}
                          <p className="text-amber-700 font-semibold mt-0.5">
                            {formatOt(entry.ot_hours || 0)} OT hrs
                            {(entry.ot_pay || 0) > 0 ? ` · Rs. ${entry.ot_pay.toLocaleString("en", { maximumFractionDigits: 0 })}` : ""}
                          </p>
                          {(entry.late_hours || 0) > 0 && (
                            <p className="text-red-600 font-semibold mt-0.5">
                              Late {formatOt(entry.late_hours || 0)} hr · − Rs. {(entry.late_deduction || 0).toLocaleString("en", { maximumFractionDigits: 0 })}
                            </p>
                          )}
                        </div>
                      </td>
                      {/* Basic (Earned) */}
                      <td className="px-4 py-3">
                        <span className="text-[13px] font-semibold text-[#0A0A0A]">
                          Rs. {entry.basic_salary.toLocaleString("en", { maximumFractionDigits: 0 })}
                        </span>
                        {entry.present_days < entry.working_days && (
                          <p className="text-[10px] text-[#9A9A9A] mt-0.5">
                            {entry.present_days}/{entry.working_days} paid days
                          </p>
                        )}
                        {(entry.sunday_holiday_days || 0) > 0 && (
                          <p className="text-[10px] text-orange-700 mt-0.5">
                            + {entry.sunday_holiday_days} × Rs. {SUNDAY_HOLIDAY_DAY_PAY.toLocaleString()}
                          </p>
                        )}
                        {(entry.late_hours || 0) > 0 && (
                          <p className="text-[10px] text-red-600 mt-0.5">
                            − {formatOt(entry.late_hours || 0)} hr late
                          </p>
                        )}
                      </td>
                      {/* Commission */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            value={entry.bike_commission || ""}
                            onChange={(e) => recalculate(emp.id, { bike_commission: parseFloat(e.target.value) || 0 })}
                            placeholder="0"
                            className="w-24 h-8 px-2 rounded-xl border border-[#E5E5E5] text-xs focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]"
                          />
                        ) : entry.bike_commission > 0 ? (
                          <div>
                            <span className="text-sm font-semibold text-amber-700">
                              Rs. {entry.bike_commission.toLocaleString("en", { maximumFractionDigits: 0 })}
                            </span>
                            {emp.type === "worker" && (
                              <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wide mt-0.5">
                                {bikeCounts[emp.id] || 0} bike{(bikeCounts[emp.id] || 0) === 1 ? "" : "s"}
                                {emp.per_bike_commission ? ` × Rs. ${Number(emp.per_bike_commission).toLocaleString()}` : ""}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-[#ABABAB]">—</span>
                        )}
                      </td>
                      {/* Bonus/OT */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              type="number"
                              value={entry.bonus || ""}
                              onChange={(e) => recalculate(emp.id, { bonus: parseFloat(e.target.value) || 0 })}
                              placeholder="Bonus"
                              className="w-24 h-8 px-2 rounded-xl border border-[#E5E5E5] text-xs focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]"
                            />
                            <p className="text-[11px] font-semibold text-amber-700">
                              OT Rs. {(entry.ot_pay || 0).toLocaleString("en", { maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">
                              {formatOt(entry.ot_hours || 0)} hrs
                            </p>
                          </div>
                        ) : (
                          <div>
                            <span className="text-sm font-semibold text-amber-700">
                              {(entry.ot_pay || 0) > 0 ? `Rs. ${entry.ot_pay.toLocaleString("en", { maximumFractionDigits: 0 })}` : "—"}
                            </span>
                            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mt-0.5">
                              {formatOt(entry.ot_hours || 0)} OT hrs
                            </p>
                            {(entry.bonus || 0) > 0 && (
                              <p className="text-[10px] text-[#6B6B6B] mt-0.5">
                                Bonus Rs. {entry.bonus.toLocaleString("en", { maximumFractionDigits: 0 })}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      {/* Gross */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-[#0A0A0A]">
                          Rs. {entry.gross_salary.toLocaleString("en", { maximumFractionDigits: 0 })}
                        </span>
                      </td>
                      {/* EPF/ETF */}
                      <td className="px-4 py-3">
                        <div className="text-xs text-[#6B6B6B]">
                          {emp.type === "worker" ? (
                            <>
                              <p>EPF: Rs. {entry.epf_employee.toLocaleString("en", { maximumFractionDigits: 0 })}</p>
                              <p>ETF: Rs. {entry.etf.toLocaleString("en", { maximumFractionDigits: 0 })}</p>
                            </>
                          ) : (
                            <span className="text-[#ABABAB] italic">Director</span>
                          )}
                        </div>
                      </td>
                      {/* Net */}
                      <td className="px-4 py-3">
                        <span className="text-base font-bold text-[#FF4C00]">
                          Rs. {entry.net_salary.toLocaleString("en", { maximumFractionDigits: 0 })}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <select
                          value={entry.status}
                          onChange={(e) => updateStatus(emp.id, e.target.value as "approved" | "paid")}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${STATUS_STYLES[entry.status]}`}
                        >
                          <option value="draft">Draft</option>
                          <option value="approved">Approved</option>
                          <option value="paid">Paid</option>
                        </select>
                      </td>
                      {/* Edit */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setEditingId(isEditing ? null : emp.id)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${isEditing ? "bg-[#FF4C00] text-white" : "bg-[#F5F5F5] text-[#6B6B6B] hover:bg-[#FF4C00]/10 hover:text-[#FF4C00]"}`}
                        >
                          {isEditing ? "Done" : "Edit"}
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

      {/* Note about rules */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
        <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-700 space-y-1">
          <p className="font-semibold">Payroll Rules Applied:</p>
          <p>• <strong>Earned Basic</strong> = basic ÷ 26 × paid days. Paid days = days worked (half day = 0.5) + sick leave + casual leave</p>
          <p>• A <strong>Sunday</strong>, or a day marked <strong>Holiday</strong>, is paid at Rs. {SUNDAY_HOLIDAY_DAY_PAY.toLocaleString()} only when <strong>Present</strong> is also selected. Holiday alone is not added to salary</p>
          <p>• Salary is reduced only for days marked <strong>Absent</strong>. Sick leave and casual leave are paid</p>
          <p>• Workers: EPF 8% + ETF 3% deducted from gross salary</p>
          <p>• Directors: No EPF/ETF deductions</p>
          <p>• <strong>Hourly</strong> = rate × hours (8h for each paid day, 4h for a half day). OT is paid separately</p>
          <p>• <strong>OT pay</strong> = OT hours × hourly rate. Monthly staff use basic ÷ 26 ÷ 8 per OT hour. The amount is shown on each row and in Total OT</p>
          <p>• <strong>Late</strong> removes one hour of salary for each hour marked late on attendance. Monthly staff lose basic ÷ 26 ÷ 8 per late hour</p>
          <p>• EPF/ETF only if ticked on the employee profile</p>
          <p>• Bike commission: each completed sale that month, if the worker was present or half-day that day. Open <strong>Worker Commissions</strong> or click Recalculate.</p>
          <p>• Generate slips per employee under <strong>Payslips</strong> after saving payroll</p>
        </div>
      </div>
    </div>
  );
}
