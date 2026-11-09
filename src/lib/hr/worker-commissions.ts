import type { SupabaseClient } from "@supabase/supabase-js";

const PRESENT_STATUSES = ["present", "half_day"] as const;

export interface SyncWorkerCommissionsResult {
  added: number;
  removed: number;
}

export function toDateOnly(value: string | null | undefined): string {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export function monthBounds(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end =
    month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return { start, end };
}

interface CommissionEmployee {
  id: string;
  per_bike_commission: number;
}

async function loadCommissionEmployees(supabase: SupabaseClient): Promise<CommissionEmployee[]> {
  const { data, error } = await supabase
    .from("employees")
    .select("id, per_bike_commission");
  if (error) throw error;
  return (data || []) as CommissionEmployee[];
}

/**
 * Align worker_commissions with completed sales on the given dates.
 * Commission for a sale goes only to the employee selected as sold_by.
 * Older sales with no sold_by still use present/half-day attendance as a fallback.
 */
export async function syncWorkerCommissionsForDates(
  supabase: SupabaseClient,
  dates: string[],
): Promise<SyncWorkerCommissionsResult> {
  const uniqueDates = [...new Set(dates.map(toDateOnly).filter(Boolean))];
  if (!uniqueDates.length) return { added: 0, removed: 0 };

  const employees = await loadCommissionEmployees(supabase);
  const employeeById = new Map(employees.map((e) => [e.id, e]));
  const workerIds = employees
    .filter((e) => Number(e.per_bike_commission) > 0)
    .map((e) => e.id);

  const { data: sales, error: salesErr } = await supabase
    .from("sales")
    .select("id, sale_date, sold_by")
    .eq("status", "completed")
    .in("sale_date", uniqueDates);
  if (salesErr) throw salesErr;

  const saleList = (sales || []).map((s) => ({
    id: s.id as string,
    sale_date: toDateOnly(s.sale_date as string),
    sold_by: (s.sold_by as string | null) || null,
  }));

  if (!saleList.length) {
    const { data: stale, error: staleErr } = await supabase
      .from("worker_commissions")
      .select("id")
      .in("sale_date", uniqueDates);
    if (staleErr) throw staleErr;
    if (!stale?.length) return { added: 0, removed: 0 };
    const { error: delErr } = await supabase
      .from("worker_commissions")
      .delete()
      .in("id", stale.map((r) => r.id));
    if (delErr) throw delErr;
    return { added: 0, removed: stale.length };
  }

  const saleIds = saleList.map((s) => s.id);
  const needsAttendanceFallback = saleList.some((s) => !s.sold_by);

  const [{ data: existing, error: existingErr }, { data: attendance, error: attErr }, { data: pendingComm, error: pendingErr }] =
    await Promise.all([
      supabase.from("worker_commissions").select("id, sale_id, employee_id").in("sale_id", saleIds),
      needsAttendanceFallback && workerIds.length
        ? supabase
            .from("attendance")
            .select("employee_id, status, date")
            .in("date", uniqueDates)
            .in("employee_id", workerIds)
        : Promise.resolve({ data: [] as { employee_id: string; status: string; date: string }[], error: null }),
      supabase.from("commission_records").select("sale_id").in("sale_id", saleIds).eq("status", "pending"),
    ]);

  if (existingErr) throw existingErr;
  if (attErr) throw attErr;
  if (pendingErr) throw pendingErr;

  const presentByDate = new Map<string, Set<string>>();
  for (const a of attendance || []) {
    if (!PRESENT_STATUSES.includes(a.status as (typeof PRESENT_STATUSES)[number])) continue;
    const d = toDateOnly(a.date as string);
    if (!presentByDate.has(d)) presentByDate.set(d, new Set());
    presentByDate.get(d)!.add(a.employee_id as string);
  }

  const pendingSaleIds = new Set((pendingComm || []).map((r) => r.sale_id as string));
  const now = new Date().toISOString();

  const desired = new Set<string>();
  const desiredRows: {
    sale_id: string;
    employee_id: string;
    sale_date: string;
    amount: number;
    status: "received" | "pending";
    received_at: string | null;
  }[] = [];

  function addRow(saleId: string, employeeId: string, saleDate: string, received: boolean) {
    const emp = employeeById.get(employeeId);
    const amount = Number(emp?.per_bike_commission) || 0;
    if (!(amount > 0)) return;
    const key = `${saleId}:${employeeId}`;
    if (desired.has(key)) return;
    desired.add(key);
    desiredRows.push({
      sale_id: saleId,
      employee_id: employeeId,
      sale_date: saleDate,
      amount,
      status: received ? "received" : "pending",
      received_at: received ? now : null,
    });
  }

  for (const sale of saleList) {
    const received = !pendingSaleIds.has(sale.id);
    if (sale.sold_by) {
      addRow(sale.id, sale.sold_by, sale.sale_date, received);
      continue;
    }
    const present = presentByDate.get(sale.sale_date);
    if (!present?.size) continue;
    for (const empId of present) {
      addRow(sale.id, empId, sale.sale_date, received);
    }
  }

  const seen = new Set<string>();
  const toRemoveIds: string[] = [];
  const existingKeys = new Set<string>();

  for (const row of existing || []) {
    const key = `${row.sale_id}:${row.employee_id}`;
    if (seen.has(key) || !desired.has(key)) {
      toRemoveIds.push(row.id as string);
      continue;
    }
    seen.add(key);
    existingKeys.add(key);
  }

  const toAdd = desiredRows.filter((r) => !existingKeys.has(`${r.sale_id}:${r.employee_id}`));

  if (toRemoveIds.length) {
    const { error: delErr } = await supabase.from("worker_commissions").delete().in("id", toRemoveIds);
    if (delErr) throw delErr;
  }
  if (toAdd.length) {
    const { error: insErr } = await supabase.from("worker_commissions").insert(toAdd);
    if (insErr) throw insErr;
  }

  return { added: toAdd.length, removed: toRemoveIds.length };
}

/**
 * Align worker_commissions for a date and all sales on that date.
 */
export async function syncWorkerCommissionsForDate(
  supabase: SupabaseClient,
  date: string,
): Promise<SyncWorkerCommissionsResult> {
  return syncWorkerCommissionsForDates(supabase, [date]);
}

/** Backfill worker commissions for every day in a month that has sales */
export async function syncWorkerCommissionsForMonth(
  supabase: SupabaseClient,
  year: number,
  month: number,
): Promise<SyncWorkerCommissionsResult> {
  const { start, end } = monthBounds(year, month);

  const { data: sales, error } = await supabase
    .from("sales")
    .select("sale_date")
    .eq("status", "completed")
    .gte("sale_date", start)
    .lt("sale_date", end);
  if (error) throw error;

  const dates = [...new Set((sales || []).map((s) => toDateOnly(s.sale_date as string)).filter(Boolean))];
  if (!dates.length) {
    const { data: stale, error: staleErr } = await supabase
      .from("worker_commissions")
      .select("id")
      .gte("sale_date", start)
      .lt("sale_date", end);
    if (staleErr) throw staleErr;
    if (!stale?.length) return { added: 0, removed: 0 };
    const { error: delErr } = await supabase
      .from("worker_commissions")
      .delete()
      .in("id", stale.map((r) => r.id));
    if (delErr) throw delErr;
    return { added: 0, removed: stale.length };
  }

  return syncWorkerCommissionsForDates(supabase, dates);
}
