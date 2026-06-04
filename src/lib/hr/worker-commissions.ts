import type { SupabaseClient } from "@supabase/supabase-js";

const PRESENT_STATUSES = ["present", "half_day"] as const;

export interface SyncWorkerCommissionsResult {
  added: number;
  removed: number;
}

/**
 * Align worker_commissions with attendance for a date and all sales on that date.
 * Call after saving attendance (including backdated days) so workers get bike
 * commissions even when attendance was marked after the sale.
 */
export async function syncWorkerCommissionsForDate(
  supabase: SupabaseClient,
  date: string,
): Promise<SyncWorkerCommissionsResult> {
  const { data: workers } = await supabase
    .from("employees")
    .select("id, per_bike_commission")
    .eq("type", "worker")
    .eq("is_active", true)
    .gt("per_bike_commission", 0);

  if (!workers?.length) return { added: 0, removed: 0 };

  const workerIds = workers.map((w) => w.id);

  const { data: attendance } = await supabase
    .from("attendance")
    .select("employee_id, status")
    .eq("date", date)
    .in("employee_id", workerIds);

  const presentIds = new Set(
    (attendance || [])
      .filter((a) => PRESENT_STATUSES.includes(a.status as (typeof PRESENT_STATUSES)[number]))
      .map((a) => a.employee_id),
  );

  const { data: sales } = await supabase
    .from("sales")
    .select("id")
    .eq("sale_date", date)
    .eq("status", "completed");

  if (!sales?.length) return { added: 0, removed: 0 };

  let added = 0;
  let removed = 0;
  const now = new Date().toISOString();

  for (const sale of sales) {
    const { data: existing } = await supabase
      .from("worker_commissions")
      .select("id, employee_id")
      .eq("sale_id", sale.id);

    const existingByEmp = new Set((existing || []).map((e) => e.employee_id));

    const toRemove = (existing || []).filter((e) => !presentIds.has(e.employee_id));
    if (toRemove.length) {
      const { error: delErr } = await supabase
        .from("worker_commissions")
        .delete()
        .in(
          "id",
          toRemove.map((e) => e.id),
        );
      if (delErr) throw delErr;
      removed += toRemove.length;
    }

    const missing = workers.filter((w) => presentIds.has(w.id) && !existingByEmp.has(w.id));
    if (!missing.length) continue;

    const { data: pendingComm } = await supabase
      .from("commission_records")
      .select("id")
      .eq("sale_id", sale.id)
      .eq("status", "pending")
      .limit(1);

    const allSaleCommissionsReceived = !pendingComm?.length;

    const rows = missing.map((w) => ({
      sale_id: sale.id,
      employee_id: w.id,
      sale_date: date,
      amount: w.per_bike_commission,
      status: allSaleCommissionsReceived ? "received" : "pending",
      received_at: allSaleCommissionsReceived ? now : null,
    }));

    const { error: insErr } = await supabase.from("worker_commissions").insert(rows);
    if (insErr) throw insErr;
    added += rows.length;
  }

  return { added, removed };
}

/** Backfill worker commissions for every day in a month that has sales */
export async function syncWorkerCommissionsForMonth(
  supabase: SupabaseClient,
  year: number,
  month: number,
): Promise<SyncWorkerCommissionsResult> {
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd =
    month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const { data: sales } = await supabase
    .from("sales")
    .select("sale_date")
    .eq("status", "completed")
    .gte("sale_date", monthStart)
    .lt("sale_date", monthEnd);

  const dates = [...new Set((sales || []).map((s) => s.sale_date as string))];
  let added = 0;
  let removed = 0;
  for (const date of dates) {
    const result = await syncWorkerCommissionsForDate(supabase, date);
    added += result.added;
    removed += result.removed;
  }
  return { added, removed };
}
