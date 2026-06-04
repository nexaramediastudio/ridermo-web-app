"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";
import {
  FileText, ChevronLeft, ChevronRight, RefreshCw,
  Printer, Eye, AlertCircle,
} from "lucide-react";
import { printPayslip, type PayslipData } from "@/lib/hr/payslip-print";
import { PayslipDetail } from "@/components/hr/payslip-detail";
import { syncWorkerCommissionsForMonth } from "@/lib/hr/worker-commissions";
import { calculatePayroll, summarizeAttendance } from "@/lib/hr/payroll-calc";

interface PayslipRow {
  id: string;
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
  absent_days: number;
  status: string;
  paid_date?: string | null;
  notes?: string | null;
  employees: {
    full_name: string;
    employee_code?: string;
    type: string;
    designation?: string;
    department?: string;
    nic?: string;
    phone?: string;
    join_date?: string;
    basic_salary?: number;
    hourly_rate?: number;
    salary_type: string;
    has_epf: boolean;
    has_etf: boolean;
  } | null;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function toPayslipData(row: PayslipRow, hoursWorked?: number): PayslipData {
  const emp = row.employees!;
  return {
    month: row.month,
    year: row.year,
    slipRef: `${emp.employee_code || row.employee_id.slice(0, 8)}-${row.year}-${String(row.month).padStart(2, "0")}`,
    employee: {
      full_name: emp.full_name,
      employee_code: emp.employee_code,
      designation: emp.designation,
      department: emp.department,
      nic: emp.nic,
      phone: emp.phone,
      join_date: emp.join_date,
      type: emp.type,
      salary_type: emp.salary_type || "monthly",
      basic_salary: emp.basic_salary,
      hourly_rate: emp.hourly_rate,
      has_epf: emp.has_epf ?? false,
      has_etf: emp.has_etf ?? false,
    },
    payroll: {
      basic_salary: row.basic_salary,
      attendance_bonus: row.attendance_bonus,
      ot_pay: row.ot_pay,
      bike_commission: row.bike_commission,
      bonus: row.bonus,
      gross_salary: row.gross_salary,
      epf_employee: row.epf_employee,
      etf: row.etf,
      other_deductions: row.other_deductions,
      total_deductions: row.total_deductions,
      net_salary: row.net_salary,
      working_days: row.working_days,
      present_days: row.present_days,
      absent_days: row.absent_days,
      hours_worked: hoursWorked,
      status: row.status,
      paid_date: row.paid_date,
      notes: row.notes,
    },
  };
}

export default function PayslipsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [payslips, setPayslips] = useState<PayslipRow[]>([]);
  const [hoursMap, setHoursMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const loadPayslips = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const monthEnd = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;

    const { data } = await supabase
      .from("payroll")
      .select(`
        id, employee_id, month, year, basic_salary, attendance_bonus, ot_pay, bike_commission, bonus,
        gross_salary, epf_employee, etf, other_deductions, total_deductions, net_salary,
        working_days, present_days, absent_days, status, paid_date, notes,
        employees(full_name, employee_code, type, designation, department, nic, phone, join_date, basic_salary, hourly_rate, salary_type, has_epf, has_etf)
      `)
      .eq("month", month)
      .eq("year", year)
      .order("created_at");

    const rows = (data as unknown as PayslipRow[]) || [];
    setPayslips(rows);

    if (rows.length) {
      const { data: att } = await supabase
        .from("attendance")
        .select("employee_id, status, ot_hours")
        .gte("date", monthStart)
        .lt("date", monthEnd);
      const hMap: Record<string, number> = {};
      const byEmp: Record<string, { status: string; ot_hours?: number | null }[]> = {};
      (att || []).forEach((r) => {
        if (!byEmp[r.employee_id]) byEmp[r.employee_id] = [];
        byEmp[r.employee_id].push(r);
      });
      rows.forEach((p) => {
        const s = summarizeAttendance(byEmp[p.employee_id] || []);
        hMap[p.employee_id] = s.present * 8 + s.otHours;
      });
      setHoursMap(hMap);
    } else {
      setHoursMap({});
    }

    setLoading(false);
  }, [month, year]);

  useEffect(() => { loadPayslips(); }, [loadPayslips]);

  async function generateAllPayslips() {
    setGenerating(true);
    const supabase = createClient();
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const monthEnd = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;

    try {
      await syncWorkerCommissionsForMonth(supabase, year, month);

      const [empRes, attRes, commRes] = await Promise.all([
        supabase
          .from("employees")
          .select("id, type, basic_salary, hourly_rate, salary_type, has_epf, has_etf")
          .eq("is_active", true),
        supabase.from("attendance").select("employee_id, status, ot_hours").gte("date", monthStart).lt("date", monthEnd),
        supabase.from("worker_commissions").select("employee_id, amount").gte("sale_date", monthStart).lt("sale_date", monthEnd),
      ]);

      const emps = empRes.data || [];
      const attByEmp: Record<string, { status: string; ot_hours?: number | null }[]> = {};
      (attRes.data || []).forEach((r) => {
        if (!attByEmp[r.employee_id]) attByEmp[r.employee_id] = [];
        attByEmp[r.employee_id].push(r);
      });
      const commTotals: Record<string, number> = {};
      (commRes.data || []).forEach((c) => {
        commTotals[c.employee_id] = (commTotals[c.employee_id] || 0) + Number(c.amount);
      });

      const records = emps.map((emp) => {
        const calc = calculatePayroll({
          salaryType: (emp.salary_type as "monthly" | "hourly") || "monthly",
          basicSalary: Number(emp.basic_salary || 0),
          hourlyRate: Number(emp.hourly_rate || 0),
          hasEpf: emp.has_epf ?? false,
          hasEtf: emp.has_etf ?? false,
          attendance: summarizeAttendance(attByEmp[emp.id] || []),
          bikeCommission: emp.type === "worker" ? commTotals[emp.id] || 0 : 0,
        });
        return {
          employee_id: emp.id,
          month,
          year,
          basic_salary: calc.earnedBasic,
          attendance_bonus: 0,
          ot_pay: 0,
          bike_commission: calc.bikeCommission,
          bonus: 0,
          gross_salary: calc.gross,
          epf_employee: calc.epf,
          etf: calc.etf,
          other_deductions: 0,
          total_deductions: calc.totalDeductions,
          net_salary: calc.net,
          working_days: calc.workingDays,
          present_days: calc.presentDays,
          absent_days: calc.absentDays,
          status: "draft" as const,
        };
      });

      const { error } = await supabase.from("payroll").upsert(records, { onConflict: "employee_id,month,year" });
      if (error) throw error;
      toast.success(`Generated ${records.length} payslips for ${MONTHS[month - 1]} ${year}`);
      loadPayslips();
    } catch (e) {
      toast.error((e as Error).message || "Failed to generate payslips");
    }
    setGenerating(false);
  }

  function changeMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
    setPreviewId(null);
  }

  const preview = payslips.find((p) => p.id === previewId);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="r-page-title">Payslips</h1>
          <p className="r-page-sub">Generate and print salary slips one by one</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/hr/payroll" className="r-btn-secondary text-sm">Open Payroll</Link>
          <button onClick={loadPayslips} className="r-btn-secondary">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={generateAllPayslips} disabled={generating} className="r-btn-primary disabled:opacity-60">
            <FileText className="h-4 w-4" />
            {generating ? "Generating..." : "Generate All Payslips"}
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          Click <strong>Generate All Payslips</strong> to build payroll for this month from attendance and sales, then print each employee&apos;s slip individually.
        </p>
      </div>

      <div className="r-card-p flex items-center gap-3 w-fit">
        <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center rounded-xl border border-[#E8E8E8] hover:bg-[#F5F5F5]">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-bold min-w-[120px] text-center">{MONTHS[month - 1]} {year}</span>
        <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center rounded-xl border border-[#E8E8E8] hover:bg-[#F5F5F5]">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0 r-card overflow-hidden">
          <table className="r-table">
            <thead>
              <tr className="r-thead-row">
                {["Employee", "Gross", "Net", "Status", "Actions"].map((h) => (
                  <th key={h} className="r-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#F5F5F5]">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="r-td"><div className="h-4 bg-[#F0F0F0] rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : payslips.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-[#D0D0D0]" />
                    <p className="text-sm font-semibold text-[#6B6B6B]">No payslips for {MONTHS_SHORT[month - 1]} {year}</p>
                    <button onClick={generateAllPayslips} disabled={generating} className="mt-3 r-btn-primary mx-auto">
                      Generate All Payslips
                    </button>
                  </td>
                </tr>
              ) : (
                payslips.map((p) => (
                  <tr
                    key={p.id}
                    className={`r-tr cursor-pointer ${previewId === p.id ? "bg-[#FF4C00]/5" : ""}`}
                    onClick={() => setPreviewId(p.id)}
                  >
                    <td className="r-td">
                      <p className="text-sm font-semibold text-[#0A0A0A]">{p.employees?.full_name}</p>
                      <p className="text-xs text-[#9A9A9A] capitalize">{p.employees?.type}</p>
                    </td>
                    <td className="r-td">Rs. {p.gross_salary.toLocaleString()}</td>
                    <td className="r-td"><span className="font-bold text-[#FF4C00]">Rs. {p.net_salary.toLocaleString()}</span></td>
                    <td className="r-td">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${p.status === "paid" ? "bg-emerald-50 text-emerald-700" : p.status === "approved" ? "bg-amber-50 text-amber-700" : "bg-[#F5F5F5] text-[#6B6B6B]"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="r-td" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setPreviewId(p.id)}
                          className="flex items-center gap-1 h-7 px-2 rounded-lg bg-[#F5F5F5] text-[11px] font-semibold hover:bg-[#FF4C00]/10 hover:text-[#FF4C00]"
                        >
                          <Eye className="h-3 w-3" /> Preview
                        </button>
                        <button
                          onClick={() => printPayslip(toPayslipData(p, hoursMap[p.employee_id]))}
                          className="flex items-center gap-1 h-7 px-2 rounded-lg bg-[#FF4C00] text-white text-[11px] font-semibold hover:bg-[#E04400]"
                        >
                          <Printer className="h-3 w-3" /> Print
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {preview && preview.employees ? (
          <div className="w-[400px] flex-shrink-0">
            <div className="r-card p-5 sticky top-4">
              <PayslipDetail
                data={toPayslipData(preview, hoursMap[preview.employee_id])}
                onPrint={() => printPayslip(toPayslipData(preview, hoursMap[preview.employee_id]))}
              />
            </div>
          </div>
        ) : (
          <div className="w-[400px] flex-shrink-0 r-card p-12 text-center border-dashed">
            <Eye className="h-8 w-8 mx-auto mb-2 text-[#D0D0D0]" />
            <p className="text-sm text-[#9A9A9A]">Select an employee to see full payslip details</p>
          </div>
        )}
      </div>
    </div>
  );
}
