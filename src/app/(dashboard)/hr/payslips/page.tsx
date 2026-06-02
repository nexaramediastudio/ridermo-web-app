"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileText, Download, ChevronLeft, ChevronRight } from "lucide-react";

interface PayslipRow {
  id: string;
  month: number;
  year: number;
  basic_salary: number;
  gross_salary: number;
  net_salary: number;
  status: string;
  employees: { full_name: string; employee_code?: string; type: string } | null;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function PayslipsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [payslips, setPayslips] = useState<PayslipRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPayslips = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("payroll")
      .select("id, month, year, basic_salary, gross_salary, net_salary, status, employees(full_name, employee_code, type)")
      .eq("month", month)
      .eq("year", year)
      .order("created_at");
    setPayslips((data as unknown as PayslipRow[]) || []);
    setLoading(false);
  }, [month, year]);

  useEffect(() => { loadPayslips(); }, [loadPayslips]);

  function changeMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Payslips</h2>
          <p className="text-sm text-[#9A9A9A] mt-0.5">Monthly payslips for all employees</p>
        </div>
      </div>

      {/* Month selector */}
      <div className="bg-white rounded-2xl border border-[#EFEFEF] p-4 flex items-center gap-3 w-fit">
        <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center rounded-xl border border-[#E5E5E5] hover:bg-[#F5F5F5]">
          <ChevronLeft className="h-4 w-4 text-[#6B6B6B]" />
        </button>
        <span className="text-sm font-bold text-[#0A0A0A] w-28 text-center">{MONTHS[month - 1]} {year}</span>
        <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center rounded-xl border border-[#E5E5E5] hover:bg-[#F5F5F5]">
          <ChevronRight className="h-4 w-4 text-[#6B6B6B]" />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#EFEFEF] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#F0F0F0]">
              {["Employee", "Basic", "Gross", "Net Salary", "Status", ""].map((h) => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-[#F8F8F8]">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-4 bg-[#F0F0F0] rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : payslips.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-[#ABABAB]">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No payslips for {MONTHS[month - 1]} {year}</p>
                <p className="text-xs mt-1">Generate payroll first from the Payroll section</p>
              </td></tr>
            ) : (
              payslips.map((p) => (
                <tr key={p.id} className="border-b border-[#F8F8F8] hover:bg-[#FAFAFA] transition-colors group">
                  <td className="px-5 py-4">
                    <div>
                      <p className="text-sm font-semibold text-[#0A0A0A]">{p.employees?.full_name}</p>
                      <p className="text-xs text-[#9A9A9A] capitalize">{p.employees?.type}{p.employees?.employee_code ? ` · ${p.employees.employee_code}` : ""}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4"><span className="text-sm text-[#4A4A4A]">Rs. {p.basic_salary.toLocaleString("en", { maximumFractionDigits: 0 })}</span></td>
                  <td className="px-5 py-4"><span className="text-sm text-[#4A4A4A]">Rs. {p.gross_salary.toLocaleString("en", { maximumFractionDigits: 0 })}</span></td>
                  <td className="px-5 py-4"><span className="text-base font-bold text-[#FF4C00]">Rs. {p.net_salary.toLocaleString("en", { maximumFractionDigits: 0 })}</span></td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${p.status === "paid" ? "bg-emerald-50 text-emerald-700" : p.status === "approved" ? "bg-amber-50 text-amber-700" : "bg-[#F5F5F5] text-[#6B6B6B]"}`}>
                      {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-xs font-semibold text-[#FF4C00] hover:underline transition-all">
                      <Download className="h-3 w-3" /> PDF
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
