export const STANDARD_WORKING_DAYS = 26;
export const HOURS_PER_DAY = 8;
export const EPF_RATE = 0.08;
export const ETF_RATE = 0.03;

export type SalaryType = "monthly" | "hourly";

export interface AttendanceSummary {
  present: number;
  absent: number;
  otHours: number;
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
  absentDays: number;
  hoursWorked: number;
  earnedBasic: number;
  bikeCommission: number;
  gross: number;
  epf: number;
  etf: number;
  totalDeductions: number;
  net: number;
}

export function summarizeAttendance(
  records: { status: string; ot_hours?: number | null }[],
): AttendanceSummary {
  const summary: AttendanceSummary = { present: 0, absent: 0, otHours: 0 };
  for (const rec of records) {
    if (rec.status === "present") {
      summary.present += 1;
      summary.otHours += Number(rec.ot_hours || 0);
    } else if (rec.status === "half_day") {
      summary.present += 0.5;
      summary.otHours += Number(rec.ot_hours || 0) * 0.5;
    } else if (rec.status === "absent") {
      summary.absent += 1;
    }
  }
  return summary;
}

export function calcHoursWorked(att: AttendanceSummary): number {
  return att.present * HOURS_PER_DAY + att.otHours;
}

export function calculatePayroll(input: PayrollCalcInput): PayrollCalcResult {
  const workingDays = STANDARD_WORKING_DAYS;
  const presentDays = input.attendance.present;
  const absentDays = Math.max(0, workingDays - presentDays);
  const hoursWorked = calcHoursWorked(input.attendance);

  const earnedBasic =
    input.salaryType === "hourly"
      ? Math.round(input.hourlyRate * hoursWorked)
      : presentDays > 0
        ? Math.round((input.basicSalary / workingDays) * presentDays)
        : 0;

  const bikeCommission = Math.round(input.bikeCommission || 0);
  const attendanceBonus = Math.round(input.attendanceBonus || 0);
  const otPay = Math.round(input.otPay || 0);
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
    absentDays,
    hoursWorked,
    earnedBasic,
    bikeCommission,
    gross,
    epf,
    etf,
    totalDeductions,
    net,
  };
}
