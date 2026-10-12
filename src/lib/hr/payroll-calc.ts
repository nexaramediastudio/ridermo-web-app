export const STANDARD_WORKING_DAYS = 26;
export const HOURS_PER_DAY = 8;
export const EPF_RATE = 0.08;
export const ETF_RATE = 0.03;
export const SUNDAY_HOLIDAY_DAY_PAY = 2144;
export const OT_HOUR_PAY = 268;

export type SalaryType = "monthly" | "hourly";

export interface AttendanceSummary {
  present: number;
  absent: number;
  paidLeave: number;
  sundayHolidayDays: number;
  otHours: number;
  lateHours: number;
}

export interface PayrollCalcInput {
  salaryType: SalaryType;
  basicSalary: number;
  hourlyRate: number;
  hasEpf: boolean;
  hasEtf: boolean;
  attendance: AttendanceSummary;
  bikeCommission: number;
  attendanceBonus?: number;
  otPay?: number;
  bonus?: number;
  otherDeductions?: number;
}

export interface PayrollCalcResult {
  workingDays: number;
  presentDays: number;
  workedDays: number;
  leaveDays: number;
  sundayHolidayDays: number;
  sundayHolidayPay: number;
  absentDays: number;
  hoursWorked: number;
  otPay: number;
  lateHours: number;
  lateDeduction: number;
  regularPay: number;
  earnedBasic: number;
  bikeCommission: number;
  gross: number;
  epf: number;
  etf: number;
  totalDeductions: number;
  net: number;
}

function isSunday(date?: string | null): boolean {
  if (!date) return false;
  return new Date(`${date.slice(0, 10)}T00:00:00`).getDay() === 0;
}

export function summarizeAttendance(
  records: { status: string; ot_hours?: number | null; late_hours?: number | null; date?: string | null; is_holiday?: boolean | null }[],
): AttendanceSummary {
  const summary: AttendanceSummary = { present: 0, absent: 0, paidLeave: 0, sundayHolidayDays: 0, otHours: 0, lateHours: 0 };
  for (const rec of records) {
    summary.otHours += Number(rec.ot_hours || 0);
    if (rec.status === "present" || rec.status === "half_day") {
      summary.lateHours += Number(rec.late_hours || 0);
    }
    const holidayMarked = rec.is_holiday === true || rec.status === "holiday";
    const sundayOrHoliday = holidayMarked || isSunday(rec.date);
    if (sundayOrHoliday && rec.status === "present") {
      summary.sundayHolidayDays += 1;
      continue;
    }
    if (rec.status === "holiday") continue;
    if (rec.status === "present") {
      summary.present += 1;
    } else if (rec.status === "half_day") {
      summary.present += 0.5;
    } else if (rec.status === "absent") {
      summary.absent += 1;
    } else if (rec.status === "sick_leave" || rec.status === "casual_leave") {
      summary.paidLeave += 1;
    }
  }
  return summary;
}

export function payableDays(att: AttendanceSummary): number {
  return att.present + att.paidLeave;
}

export function calcHoursWorked(att: AttendanceSummary): number {
  return payableDays(att) * HOURS_PER_DAY + att.otHours;
}

export function salaryHourRate(input: { salaryType: SalaryType; basicSalary: number; hourlyRate: number }): number {
  if (input.salaryType === "hourly") return input.hourlyRate || 0;
  return (input.basicSalary || 0) / STANDARD_WORKING_DAYS / HOURS_PER_DAY;
}

export function calculatePayroll(input: PayrollCalcInput): PayrollCalcResult {
  const workingDays = STANDARD_WORKING_DAYS;
  const workedDays = input.attendance.present;
  const leaveDays = input.attendance.paidLeave;
  const sundayHolidayDays = input.attendance.sundayHolidayDays;
  const sundayHolidayPay = Math.round(sundayHolidayDays * SUNDAY_HOLIDAY_DAY_PAY);
  const presentDays = Math.min(workingDays, payableDays(input.attendance));
  const absentDays = input.attendance.absent;
  const hoursWorked = calcHoursWorked(input.attendance);
  const regularHours = payableDays(input.attendance) * HOURS_PER_DAY;
  const otPay = Math.round((input.attendance.otHours || 0) * OT_HOUR_PAY);
  const lateHours = input.attendance.lateHours || 0;
  const lateDeduction = Math.round(lateHours * salaryHourRate(input));

  const regularPay =
    input.salaryType === "hourly"
      ? Math.round(input.hourlyRate * regularHours)
      : presentDays > 0
        ? Math.round((input.basicSalary / workingDays) * presentDays)
        : 0;
  const earnedBasic = Math.max(0, regularPay + sundayHolidayPay - lateDeduction);

  const bikeCommission = Math.round(input.bikeCommission || 0);
  const attendanceBonus = Math.round(input.attendanceBonus || 0);
  const bonus = Math.round(input.bonus || 0);
  const otherDeductions = Math.round(input.otherDeductions || 0);

  const gross = earnedBasic + attendanceBonus + otPay + bikeCommission + bonus;
  const epf = input.hasEpf ? Math.round(gross * EPF_RATE) : 0;
  const etf = input.hasEtf ? Math.round(gross * ETF_RATE) : 0;
  const totalDeductions = epf + etf + otherDeductions;
  const net = gross - totalDeductions;

  return {
    workingDays,
    presentDays,
    workedDays,
    leaveDays,
    sundayHolidayDays,
    sundayHolidayPay,
    absentDays,
    hoursWorked,
    otPay,
    lateHours,
    lateDeduction,
    regularPay,
    earnedBasic,
    bikeCommission,
    gross,
    epf,
    etf,
    totalDeductions,
    net,
  };
}
