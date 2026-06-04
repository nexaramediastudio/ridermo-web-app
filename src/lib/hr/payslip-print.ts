export interface PayslipData {
  month: number;
  year: number;
  slipRef?: string;
  employee: {
    full_name: string;
    employee_code?: string;
    designation?: string;
    department?: string;
    nic?: string;
    phone?: string;
    type: string;
    salary_type: string;
    basic_salary?: number;
    hourly_rate?: number;
    has_epf: boolean;
    has_etf: boolean;
    join_date?: string;
  };
  payroll: {
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
    hours_worked?: number;
    status: string;
    paid_date?: string | null;
    notes?: string | null;
  };
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmt(n: number) {
  return `Rs. ${Math.round(n).toLocaleString("en")}`;
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function periodRange(month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return `${fmtDate(start.toISOString().split("T")[0])} – ${fmtDate(end.toISOString().split("T")[0])}`;
}

function row(label: string, value: string, opts?: { bold?: boolean; deduct?: boolean; hideBorder?: boolean }) {
  const cls = opts?.bold ? " bold" : opts?.deduct ? " deduct" : "";
  return `<div class="row${opts?.hideBorder ? " no-border" : ""}"><span class="row-label">${label}</span><span class="row-value${cls}">${value}</span></div>`;
}

function grid2(items: [string, string][]) {
  return `<div class="grid-2">${items
    .map(
      ([l, v]) =>
        `<div class="grid-item"><span class="grid-label">${l}</span><span class="grid-value">${v}</span></div>`,
    )
    .join("")}</div>`;
}

export function buildPayslipHtml(data: PayslipData): string {
  const { employee: emp, payroll: p } = data;
  const period = `${MONTHS[data.month - 1]} ${data.year}`;
  const payPeriod = periodRange(data.month, data.year);
  const generatedOn = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const slipRef =
    data.slipRef ||
    `${emp.employee_code || "EMP"}-${data.year}-${String(data.month).padStart(2, "0")}`;

  const salaryBasis =
    emp.salary_type === "hourly"
      ? `Hourly · Rs. ${Number(emp.hourly_rate || 0).toLocaleString()} / hr`
      : `Monthly · Rs. ${Number(emp.basic_salary || 0).toLocaleString()} / month`;

  const earnedLabel =
    emp.salary_type === "hourly"
      ? `Basic pay (${(p.hours_worked ?? 0).toFixed(1)} hours)`
      : `Earned basic (${p.present_days} / ${p.working_days} days)`;

  const totalEarnings =
    p.basic_salary +
    p.bike_commission +
    p.attendance_bonus +
    p.ot_pay +
    p.bonus;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Payslip ${emp.full_name} – ${period}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Inter',system-ui,sans-serif;background:#fff;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .page{max-width:720px;margin:0 auto;padding:36px 32px;}
    .header{background:#111;border-radius:16px;padding:24px 28px;margin-bottom:24px;}
    .header-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;}
    .logo{display:flex;align-items:center;gap:10px;}
    .logo-box{width:36px;height:36px;background:#FF4C00;border-radius:10px;display:flex;align-items:center;justify-content:center;}
    .logo-text{color:#fff;font-weight:800;font-size:16px;letter-spacing:-0.3px;}
    .doc-meta{text-align:right;}
    .doc-label{color:rgba(255,255,255,0.45);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;}
    .doc-ref{color:#fff;font-size:12px;font-weight:600;margin-top:4px;}
    .header-bottom{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;}
    .period-block{text-align:right;}
    .period-title{color:rgba(255,255,255,0.45);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;}
    .period-value{color:#FF4C00;font-size:16px;font-weight:800;margin-top:2px;}
    .period-range{color:rgba(255,255,255,0.55);font-size:11px;margin-top:4px;}
    .section{margin-bottom:18px;}
    .section-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#9CA3AF;margin-bottom:8px;}
    .card{background:#F9FAFB;border-radius:12px;padding:14px 16px;border:1px solid #F0F0F0;}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;}
    .grid-item{display:flex;flex-direction:column;gap:2px;}
    .grid-label{font-size:10px;color:#9CA3AF;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;}
    .grid-value{font-size:12px;font-weight:600;color:#111;}
    .row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;font-size:12px;}
    .row+.row{border-top:1px solid #E8E8E8;}
    .row.no-border{border-top:none;}
    .row-label{color:#6B7280;max-width:55%;}
    .row-value{font-weight:600;color:#111;text-align:right;}
    .row-value.bold{font-weight:800;font-size:13px;}
    .row-value.deduct{color:#DC2626;}
    .row-value.net{color:#FF4C00;font-size:20px;font-weight:800;}
    .summary-card{background:#111;border-radius:12px;padding:16px 18px;color:#fff;}
    .summary-row{display:flex;justify-content:space-between;padding:6px 0;font-size:12px;}
    .summary-row .l{color:rgba(255,255,255,0.55);}
    .summary-row .v{font-weight:700;}
    .summary-net{border-top:1px solid rgba(255,255,255,0.2);margin-top:8px;padding-top:12px;display:flex;justify-content:space-between;align-items:center;}
    .summary-net .l{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.6);}
    .summary-net .v{font-size:22px;font-weight:800;color:#FF4C00;}
    .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;}
    .badge-draft{background:#F3F4F6;color:#6B7280;}
    .badge-approved{background:#FEF3C7;color:#B45309;}
    .badge-paid{background:#D1FAE5;color:#047857;}
    .footer{margin-top:28px;padding-top:14px;border-top:1px solid #E5E7EB;font-size:10px;color:#9CA3AF;text-align:center;line-height:1.6;}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
    @media print{body{padding:0;}.page{padding:16px;}}
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-top">
        <div class="logo">
          <div class="logo-box"><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2L3 7v10l9 5 9-5V7L12 2z"/></svg></div>
          <div>
            <div class="logo-text">RIDERMO</div>
            <div style="color:rgba(255,255,255,0.45);font-size:10px;margin-top:2px;">TVS Dealership · Salary Slip</div>
          </div>
        </div>
        <div class="doc-meta">
          <div class="doc-label">Payslip No.</div>
          <div class="doc-ref">${slipRef}</div>
        </div>
      </div>
      <div class="header-bottom">
        <div class="period-block" style="text-align:left;">
          <div class="period-title">Pay period</div>
          <div class="period-value">${period}</div>
          <div class="period-range">${payPeriod}</div>
        </div>
        <div style="text-align:right;">
          <div class="period-title">Payment status</div>
          <span class="badge badge-${p.status}">${p.status}</span>
          ${p.paid_date ? `<div class="period-range" style="margin-top:6px;">Paid: ${fmtDate(p.paid_date)}</div>` : ""}
        </div>
      </div>
    </div>

    <div class="section">
      <p class="section-label">Employee details</p>
      <div class="card">
        ${grid2([
          ["Full name", emp.full_name],
          ["Employee code", emp.employee_code || "—"],
          ["NIC", emp.nic || "—"],
          ["Phone", emp.phone || "—"],
          ["Department", emp.department || "—"],
          ["Designation", emp.designation || "—"],
          ["Employee type", emp.type.charAt(0).toUpperCase() + emp.type.slice(1)],
          ["Salary basis", salaryBasis],
          ["Join date", emp.join_date ? fmtDate(emp.join_date) : "—"],
          ["EPF deduction", emp.has_epf ? "Yes (8%)" : "No"],
          ["ETF deduction", emp.has_etf ? "Yes (3%)" : "No"],
        ])}
      </div>
    </div>

    <div class="section">
      <p class="section-label">Attendance summary</p>
      <div class="card">
        ${grid2(
          [
            ["Standard working days", String(p.working_days)],
            ["Days present", String(p.present_days)],
            ["Days absent", String(p.absent_days)],
            emp.salary_type === "hourly"
              ? ["Total hours worked", `${(p.hours_worked ?? 0).toFixed(1)} hrs`]
              : ["Attendance rate", p.working_days ? `${Math.round((p.present_days / p.working_days) * 100)}%` : "—"],
          ] as [string, string][],
        )}
      </div>
    </div>

    <div class="two-col">
      <div class="section">
        <p class="section-label">Earnings</p>
        <div class="card">
          ${row(earnedLabel, fmt(p.basic_salary))}
          ${row("Bike commission", fmt(p.bike_commission))}
          ${row("Attendance bonus", fmt(p.attendance_bonus))}
          ${row("Overtime (OT) pay", fmt(p.ot_pay))}
          ${row("Other bonus", fmt(p.bonus))}
          ${row("Total earnings", fmt(totalEarnings), { bold: true })}
        </div>
      </div>
      <div class="section">
        <p class="section-label">Deductions</p>
        <div class="card">
          ${emp.has_epf ? row("EPF — Employee (8%)", p.epf_employee > 0 ? fmt(p.epf_employee) : "Rs. 0", { deduct: true }) : row("EPF — Employee (8%)", "Not applicable")}
          ${emp.has_etf ? row("ETF (3%)", p.etf > 0 ? fmt(p.etf) : "Rs. 0", { deduct: true }) : row("ETF (3%)", "Not applicable")}
          ${row("Other deductions", p.other_deductions > 0 ? fmt(p.other_deductions) : "Rs. 0", { deduct: true })}
          ${row("Total deductions", fmt(p.total_deductions), { bold: true, deduct: true })}
        </div>
      </div>
    </div>

    <div class="section">
      <p class="section-label">Pay summary</p>
      <div class="summary-card">
        <div class="summary-row"><span class="l">Gross salary</span><span class="v">${fmt(p.gross_salary)}</span></div>
        <div class="summary-row"><span class="l">Total deductions</span><span class="v" style="color:#FCA5A5;">− ${fmt(p.total_deductions)}</span></div>
        <div class="summary-net">
          <span class="l">Net salary payable</span>
          <span class="v">${fmt(p.net_salary)}</span>
        </div>
      </div>
    </div>

    ${p.notes ? `<div class="section"><p class="section-label">Notes</p><div class="card"><p style="font-size:12px;color:#4B5563;">${p.notes}</p></div></div>` : ""}

    <div class="footer">
      <p>Generated on ${generatedOn} · RIDERMO ERP Payroll System</p>
      <p>This payslip is computer-generated and does not require a signature unless stated by company policy.</p>
      <p style="margin-top:6px;font-weight:600;color:#6B7280;">Confidential — for ${emp.full_name} only</p>
    </div>
  </div>
  <script>window.onload=function(){window.print();}</script>
</body>
</html>`;
}

export function printPayslip(data: PayslipData) {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Please allow pop-ups to print the payslip");
    return;
  }
  w.document.write(buildPayslipHtml(data));
  w.document.close();
}
