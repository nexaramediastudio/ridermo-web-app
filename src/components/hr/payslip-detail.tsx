"use client";

import { buildPayslipHtml, printPayslip, type PayslipData } from "@/lib/hr/payslip-print";
import { Printer } from "lucide-react";

export function PayslipDetail({
  data,
  onPrint,
}: {
  data: PayslipData;
  onPrint?: () => void;
}) {
  const html = buildPayslipHtml(data, false);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={onPrint ?? (() => printPayslip(data))}
          className="r-btn-primary"
        >
          <Printer className="h-4 w-4" /> Print salary statement
        </button>
      </div>
      <div className="flex justify-center bg-[#E8E8E8] rounded-xl p-4 overflow-auto">
        <iframe
          title={`Salary statement ${data.employee.full_name}`}
          srcDoc={html}
          className="bg-white shadow-md border-0 shrink-0"
          style={{ width: "210mm", height: "297mm" }}
        />
      </div>
    </div>
  );
}
