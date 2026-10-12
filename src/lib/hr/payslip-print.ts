import {
  calculatePayroll,
  OT_HOUR_PAY,
  SUNDAY_HOLIDAY_DAY_PAY,
  type AttendanceSummary,
  type SalaryType,
} from "@/lib/hr/payroll-calc";

export interface PayslipData {
  month: number;
  year: number;
  slipRef?: string;
  company?: {
    name: string;
    logoUrl?: string | null;
  };
  employee: {
    full_name: string;
    employee_code?: string;
    designation?: string;
    department?: string;
    nic?: string;
    phone?: string;
    email?: string;
    type: string;
    salary_type: string;
    basic_salary?: number;
    hourly_rate?: number;
    per_bike_commission?: number;
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
  statement?: SalaryStatement;
}

export interface SalaryStatement {
  basicBasis: string;
  basicRate: number;
  basicAmount: number;
  bikeCount: number;
  bikeRate: number;
  bikeAmount: number;
  sundayDays: number;
  sundayAmount: number;
  otHours: number;
  otAmount: number;
  lateHours: number;
  lateRate: number;
  lateAmount: number;
  extras: { label: string; basis: string; rate: number; amount: number }[];
  gross: number;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function num(n: number) {
  return Math.round(n).toLocaleString("en-US");
}

function lkr(n: number) {
  const rounded = Math.round(n);
  const sign = rounded < 0 ? "−" : "";
  return `${sign}LKR ${Math.abs(rounded).toLocaleString("en-US")}`;
}

function hoursLabel(hours: number) {
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function buildSalaryStatement(input: {
  salaryType: SalaryType;
  basicSalary: number;
  hourlyRate: number;
  attendance: AttendanceSummary;
  bikeCount: number;
  perBikeCommission: number;
  bikeAmount: number;
  attendanceBonus?: number;
  bonus?: number;
}): SalaryStatement {
  const calc = calculatePayroll({
    salaryType: input.salaryType,
    basicSalary: input.basicSalary,
    hourlyRate: input.hourlyRate,
    hasEpf: false,
    hasEtf: false,
    attendance: input.attendance,
    bikeCommission: input.bikeAmount,
    attendanceBonus: input.attendanceBonus,
    bonus: input.bonus,
  });

  const monthly = input.salaryType !== "hourly";
  const fullMonth = monthly && calc.presentDays >= calc.workingDays;
  const basicBasis = monthly
    ? fullMonth
      ? "Monthly basic salary"
      : `${hoursLabel(calc.presentDays)} paid days of ${calc.workingDays}`
    : `${hoursLabel(calc.presentDays * 8)} hours`;
  const basicRate = monthly ? input.basicSalary : input.hourlyRate;

  const bikeRate =
    input.perBikeCommission > 0
      ? input.perBikeCommission
      : input.bikeCount > 0
        ? input.bikeAmount / input.bikeCount
        : 0;

  const extras: SalaryStatement["extras"] = [];
  if ((input.attendanceBonus || 0) > 0) {
    extras.push({
      label: "Attendance bonus",
      basis: "Added on payroll",
      rate: input.attendanceBonus || 0,
      amount: input.attendanceBonus || 0,
    });
  }
  if ((input.bonus || 0) > 0) {
    extras.push({
      label: "Other bonus",
      basis: "Added on payroll",
      rate: input.bonus || 0,
      amount: input.bonus || 0,
    });
  }

  const lateAmount = Math.min(calc.lateDeduction, calc.regularPay + calc.sundayHolidayPay);
  const gross =
    calc.regularPay +
    calc.bikeCommission +
    calc.sundayHolidayPay +
    calc.otPay +
    extras.reduce((sum, row) => sum + row.amount, 0) -
    lateAmount;

  return {
    basicBasis,
    basicRate,
    basicAmount: calc.regularPay,
    bikeCount: input.bikeCount,
    bikeRate,
    bikeAmount: calc.bikeCommission,
    sundayDays: calc.sundayHolidayDays,
    sundayAmount: calc.sundayHolidayPay,
    otHours: input.attendance.otHours || 0,
    otAmount: calc.otPay,
    lateHours: calc.lateHours,
    lateRate: calc.lateHours > 0 ? calc.lateDeduction / calc.lateHours : 0,
    lateAmount,
    extras,
    gross,
  };
}

function earningRow(component: string, basis: string, rate: string, amount: string, alt: boolean) {
  return `<tr class="${alt ? "alt" : ""}">
    <td>${esc(component)}</td>
    <td>${esc(basis)}</td>
    <td class="num">${rate}</td>
    <td class="num">${amount}</td>
  </tr>`;
}

export function buildPayslipHtml(data: PayslipData, autoPrint = true): string {
  const emp = data.employee;
  const statement = data.statement;
  const storedName = data.company?.name?.trim() || "";
  const companyName = !storedName || /^ridermo$/i.test(storedName) ? "Ridermo PVT LTD" : storedName;
  const logoUrl = data.company?.logoUrl || "";
  const monthShort = MONTHS[data.month - 1].slice(0, 3).toUpperCase();
  const period = `${monthShort} ${data.year}`;
  const docNo = data.slipRef || `PAY/${monthShort}/${data.year}`;

  const rows: { component: string; basis: string; rate: string; amount: string }[] = [];
  if (statement) {
    rows.push({
      component: "Basic Salary",
      basis: statement.basicBasis,
      rate: num(statement.basicRate),
      amount: num(statement.basicAmount),
    });
    rows.push({
      component: "Bike Commission",
      basis: statement.bikeCount > 0
        ? `${statement.bikeCount} bike${statement.bikeCount === 1 ? "" : "s"} × LKR ${num(statement.bikeRate)}`
        : "No bikes this month",
      rate: num(statement.bikeRate),
      amount: num(statement.bikeAmount),
    });
    rows.push({
      component: "Sunday Work",
      basis: `${hoursLabel(statement.sundayDays)} Sunday${statement.sundayDays === 1 ? "" : "s"} × LKR ${num(SUNDAY_HOLIDAY_DAY_PAY)}`,
      rate: num(SUNDAY_HOLIDAY_DAY_PAY),
      amount: num(statement.sundayAmount),
    });
    rows.push({
      component: "Overtime",
      basis: `${hoursLabel(statement.otHours)} approved hours × LKR ${num(OT_HOUR_PAY)}`,
      rate: num(OT_HOUR_PAY),
      amount: num(statement.otAmount),
    });
    if (statement.lateHours > 0) {
      rows.push({
        component: "Late",
        basis: `${hoursLabel(statement.lateHours)} hour${statement.lateHours === 1 ? "" : "s"} deducted`,
        rate: num(statement.lateRate),
        amount: `−${num(statement.lateAmount)}`,
      });
    }
    for (const extra of statement.extras) {
      rows.push({
        component: extra.label,
        basis: extra.basis,
        rate: num(extra.rate),
        amount: num(extra.amount),
      });
    }
  }

  const gross = statement?.gross ?? data.payroll.gross_salary;
  const noteBits = statement
    ? [
        `Commission: ${statement.bikeCount} bike${statement.bikeCount === 1 ? "" : "s"}`,
        `Sunday work: ${hoursLabel(statement.sundayDays)} day${statement.sundayDays === 1 ? "" : "s"}`,
        `Overtime: ${hoursLabel(statement.otHours)} hour${statement.otHours === 1 ? "" : "s"}`,
        statement.lateHours > 0 ? `Late: ${hoursLabel(statement.lateHours)} hour${statement.lateHours === 1 ? "" : "s"}` : "",
      ].filter(Boolean).join(" | ")
    : "";

  const logo = logoUrl
    ? `<img class="logo" src="${esc(logoUrl)}" alt="${esc(companyName)} logo" />`
    : `<div class="logo-fallback">${esc(companyName)}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Salary Statement ${esc(emp.full_name)} – ${period}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 210mm;
      height: 297mm;
      margin: 0;
      background: #fff;
      color: #111;
      font-family: Inter, system-ui, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 210mm;
      height: 297mm;
      padding: 12mm 14mm 10mm;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .body { flex: 1; }
    .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
    .logo { height: 72px; width: auto; max-width: 220px; object-fit: contain; object-position: left center; }
    .logo-fallback { font-size: 22px; font-weight: 800; letter-spacing: -0.03em; color: #FF4C00; }
    .brand { text-align: right; }
    .brand h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
    .brand p { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; color: #444; margin-top: 3px; text-transform: uppercase; }
    .brand .doc-type { color: #FF4C00; font-weight: 800; margin-top: 6px; }
    .rule { height: 1px; background: #111; margin: 18px 0 16px; }
    .title-row { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
    .title-row h2 { font-size: 26px; font-weight: 800; letter-spacing: -0.03em; }
    .sub { margin-top: 4px; font-size: 12px; color: #555; }
    .doc-no { text-align: right; font-size: 11px; letter-spacing: 0.08em; color: #333; }
    .doc-no strong { display: block; margin-top: 2px; font-size: 13px; letter-spacing: 0.04em; }
    .section { margin-top: 26px; }
    .section h3 { font-size: 12px; font-weight: 800; letter-spacing: 0.08em; padding-bottom: 8px; border-bottom: 1px solid #111; text-transform: uppercase; }
    .info { margin-top: 10px; background: #F3F3F3; display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 14px 18px; padding: 14px 16px; }
    .info .label { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; color: #666; }
    .info .value { margin-top: 3px; font-size: 13px; font-weight: 800; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th {
      background: #111; color: #fff; text-align: left; font-size: 10px; font-weight: 700;
      letter-spacing: 0.06em; padding: 9px 12px; text-transform: uppercase;
    }
    th.num, td.num { text-align: right; }
    td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #ECECEC; }
    tr.alt td { background: #F6F6F6; }
    .total td { background: #111; color: #fff; font-weight: 800; letter-spacing: 0.04em; font-size: 13px; border: 0; padding: 12px; text-transform: uppercase; }
    .total .gross { color: #FF4C00; font-size: 18px; letter-spacing: 0; }
    .boxes { margin-top: 10px; display: grid; grid-template-columns: repeat(4, 1fr); background: #F3F3F3; }
    .box { padding: 14px 16px; }
    .box + .box { border-left: 1px solid #E4E4E4; }
    .box .k { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: #555; text-transform: uppercase; }
    .box .v { margin-top: 6px; font-size: 16px; font-weight: 800; }
    .note { margin-top: 12px; font-size: 12px; color: #333; line-height: 1.55; }
    .signs { margin-top: 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
    .signs h3 { border-bottom: 1px solid #111; }
    .sign-line { margin-top: 42px; border-top: 1px solid #CCC; padding-top: 6px; font-size: 11px; color: #666; }
    .footer {
      margin-top: auto; padding-top: 8mm; display: flex; justify-content: space-between;
      font-size: 10px; letter-spacing: 0.06em; color: #666;
    }
    @page { size: A4 portrait; margin: 0; }
    @media print {
      html, body, .page {
        width: 210mm;
        height: 297mm;
        margin: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="body">
    <div class="top">
      ${logo}
      <div class="brand">
        <h1>${esc(companyName)}</h1>
        <p>Payroll &amp; Human Resources</p>
        <p>Confidential | ${period}</p>
        <p class="doc-type">Salary Statement</p>
      </div>
    </div>
    <div class="rule"></div>
    <div class="title-row">
      <div>
        <h2>Employee Salary Statement</h2>
        <p class="sub">${period} | Gross earnings record</p>
      </div>
      <div class="doc-no">DOCUMENT<strong>${esc(docNo)}</strong></div>
    </div>

    <div class="section">
      <h3>Employee Information</h3>
      <div class="info">
        <div><div class="label">Employee Name</div><div class="value">${esc(emp.full_name)}</div></div>
        <div><div class="label">Employee No.</div><div class="value">${esc(emp.employee_code || "—")}</div></div>
        <div><div class="label">NIC</div><div class="value">${esc(emp.nic || "—")}</div></div>
        <div><div class="label">Contact</div><div class="value">${esc(emp.phone || "—")}</div></div>
        <div><div class="label">Email</div><div class="value">${esc(emp.email || "—")}</div></div>
      </div>
    </div>

    <div class="section">
      <h3>Earnings Detail</h3>
      <table>
        <thead>
          <tr>
            <th>Earning Component</th>
            <th>Calculation Basis</th>
            <th class="num">Rate</th>
            <th class="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, i) => earningRow(row.component, row.basis, row.rate, row.amount, i % 2 === 1)).join("")}
          <tr class="total">
            <td colspan="3">Total Gross Pay</td>
            <td class="num gross">${lkr(gross)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h3>Payroll Summary</h3>
      <div class="boxes">
        <div class="box"><div class="k">Basic</div><div class="v">${lkr(statement?.basicAmount ?? data.payroll.basic_salary)}</div></div>
        <div class="box"><div class="k">Commission</div><div class="v">${lkr(statement?.bikeAmount ?? data.payroll.bike_commission)}</div></div>
        <div class="box"><div class="k">Sunday</div><div class="v">${lkr(statement?.sundayAmount ?? 0)}</div></div>
        <div class="box"><div class="k">OT</div><div class="v">${lkr(statement?.otAmount ?? data.payroll.ot_pay)}</div></div>
      </div>
    </div>

    <div class="section">
      <h3>Payroll Note</h3>
      <p class="note">Gross pay is based on the earnings components recorded in this statement.</p>
      ${noteBits ? `<p class="note">${esc(noteBits)}</p>` : ""}
    </div>

    <div class="signs">
      <div>
        <h3>Authorized By</h3>
        <div class="sign-line">Name / Signature / Date</div>
      </div>
      <div>
        <h3>Employee Acknowledgement</h3>
        <div class="sign-line">Signature / Date</div>
      </div>
    </div>
    </div>

    <div class="footer">
      <span>${esc(companyName)} | CONFIDENTIAL PAYROLL DOCUMENT</span>
      <span>${period}</span>
    </div>
  </div>
  ${autoPrint ? "<script>window.onload=function(){window.print();}</script>" : ""}
</body>
</html>`;
}

export function printPayslip(data: PayslipData) {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Please allow pop-ups to print the payslip");
    return;
  }
  w.document.write(buildPayslipHtml(data, true));
  w.document.close();
}
