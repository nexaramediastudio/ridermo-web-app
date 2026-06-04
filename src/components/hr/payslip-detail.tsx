"use client";

import type { PayslipData } from "@/lib/hr/payslip-print";
import { Printer } from "lucide-react";
import { printPayslip } from "@/lib/hr/payslip-print";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmt(n: number) {
  return `Rs. ${Math.round(n).toLocaleString("en")}`;
}

function Line({ label, value, accent, deduct }: { label: string; value: string; accent?: boolean; deduct?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[#F5F5F5] last:border-0 text-sm">
      <span className="text-[#6B6B6B]">{label}</span>
      <span className={`font-semibold tabular-nums ${deduct ? "text-red-600" : accent ? "text-[#FF4C00] text-base font-bold" : "text-[#0A0A0A]"}`}>
        {value}
      </span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wide">{label}</p>
      <p className="text-xs font-semibold text-[#0A0A0A] mt-0.5">{value}</p>
    </div>
  );
}

export function PayslipDetail({
  data,
  onPrint,
}: {
  data: PayslipData;
  onPrint?: () => void;
}) {
  const { employee: emp, payroll: p } = data;
  const period = `${MONTHS[data.month - 1]} ${data.year}`;
  const totalEarnings =
    p.basic_salary + p.bike_commission + p.attendance_bonus + p.ot_pay + p.bonus;

  const earnedLabel =
    emp.salary_type === "hourly"
      ? `Basic (${(p.hours_worked ?? 0).toFixed(1)} hrs)`
      : `Earned basic (${p.present_days}/${p.working_days} days)`;

  return (
    <div className="space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold text-[#9A9A9A] uppercase">Salary slip</p>
          <p className="text-lg font-bold text-[#0A0A0A]">{emp.full_name}</p>
          <p className="text-xs text-[#FF4C00] font-semibold">{period}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full capitalize ${
          p.status === "paid" ? "bg-emerald-50 text-emerald-700" : p.status === "approved" ? "bg-amber-50 text-amber-700" : "bg-[#F5F5F5] text-[#6B6B6B]"
        }`}>
          {p.status}
        </span>
      </div>

      <div className="bg-[#F5F7FA] rounded-xl p-3 grid grid-cols-2 gap-3">
        <Field label="Code" value={emp.employee_code || "—"} />
        <Field label="NIC" value={emp.nic || "—"} />
        <Field label="Phone" value={emp.phone || "—"} />
        <Field label="Department" value={emp.department || "—"} />
        <Field label="Designation" value={emp.designation || "—"} />
        <Field label="Type" value={emp.type} />
        <Field
          label="Salary"
          value={
            emp.salary_type === "hourly"
              ? `Rs. ${Number(emp.hourly_rate || 0).toLocaleString()}/hr`
              : `Rs. ${Number(emp.basic_salary || 0).toLocaleString()}/mo`
          }
        />
        <Field label="EPF / ETF" value={[emp.has_epf && "EPF", emp.has_etf && "ETF"].filter(Boolean).join(", ") || "None"} />
      </div>

      <div>
        <p className="text-[10px] font-bold text-[#9A9A9A] uppercase mb-2">Attendance</p>
        <div className="bg-white border border-[#E8E8E8] rounded-xl px-3 py-1">
          <Line label="Working days" value={String(p.working_days)} />
          <Line label="Present" value={String(p.present_days)} />
          <Line label="Absent" value={String(p.absent_days)} />
          {emp.salary_type === "hourly" && (
            <Line label="Hours worked" value={`${(p.hours_worked ?? 0).toFixed(1)} hrs`} />
          )}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold text-[#9A9A9A] uppercase mb-2">Earnings</p>
        <div className="bg-white border border-[#E8E8E8] rounded-xl px-3 py-1">
          <Line label={earnedLabel} value={fmt(p.basic_salary)} />
          <Line label="Bike commission" value={fmt(p.bike_commission)} />
          <Line label="Attendance bonus" value={fmt(p.attendance_bonus)} />
          <Line label="OT pay" value={fmt(p.ot_pay)} />
          <Line label="Bonus" value={fmt(p.bonus)} />
          <Line label="Total earnings" value={fmt(totalEarnings)} accent />
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold text-[#9A9A9A] uppercase mb-2">Deductions</p>
        <div className="bg-white border border-[#E8E8E8] rounded-xl px-3 py-1">
          <Line label="EPF (8%)" value={emp.has_epf ? fmt(p.epf_employee) : "N/A"} deduct={emp.has_epf && p.epf_employee > 0} />
          <Line label="ETF (3%)" value={emp.has_etf ? fmt(p.etf) : "N/A"} deduct={emp.has_etf && p.etf > 0} />
          <Line label="Other" value={fmt(p.other_deductions)} deduct={p.other_deductions > 0} />
          <Line label="Total deductions" value={fmt(p.total_deductions)} deduct />
        </div>
      </div>

      <div className="bg-[#111] rounded-xl p-4 text-white">
        <Line label="Gross salary" value={fmt(p.gross_salary)} />
        <div className="flex justify-between items-center pt-3 mt-2 border-t border-white/20">
          <span className="text-xs font-bold uppercase tracking-wide text-white/60">Net payable</span>
          <span className="text-xl font-bold text-[#FF4C00]">{fmt(p.net_salary)}</span>
        </div>
      </div>

      {p.notes && (
        <div className="text-xs text-[#6B6B6B] bg-amber-50 border border-amber-100 rounded-lg p-3">
          <span className="font-bold text-amber-800">Notes: </span>{p.notes}
        </div>
      )}

      <button
        onClick={onPrint ?? (() => printPayslip(data))}
        className="w-full r-btn-primary justify-center sticky bottom-0"
      >
        <Printer className="h-4 w-4" /> Print full payslip / PDF
      </button>
    </div>
  );
}
