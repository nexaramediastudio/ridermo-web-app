import type { SupabaseClient } from "@supabase/supabase-js";
import type { DealershipIncomeFields } from "./dealership-income";

export type CommissionCategory =
  | "tvs"
  | "finance"
  | "insurance"
  | "transport"
  | "documentation"
  | "other";

export type CommissionStatus = "pending" | "received";

export interface CommissionRecord {
  id: string;
  sale_id: string;
  category: CommissionCategory;
  amount: number;
  status: CommissionStatus;
  received_at: string | null;
  created_at: string;
}

export const COMMISSION_CATEGORY_LABELS: Record<CommissionCategory, string> = {
  tvs: "TVS Commission",
  finance: "Finance Commission",
  insurance: "Insurance Commission",
  transport: "Transport Charges",
  documentation: "Documentation Charges",
  other: "Other Earnings",
};

const SALE_FIELD_MAP: { category: CommissionCategory; field: keyof DealershipIncomeFields }[] = [
  { category: "tvs", field: "tvs_commission" },
  { category: "finance", field: "finance_commission" },
  { category: "insurance", field: "insurance_commission" },
  { category: "transport", field: "transport_charges" },
  { category: "documentation", field: "documentation_charges" },
  { category: "other", field: "other_earnings" },
];

/** Potential earnings on a sale (pending + received) — NOT recognized revenue */
export function calcPotentialIncome(sale: DealershipIncomeFields): number {
  return SALE_FIELD_MAP.reduce((sum, { field }) => sum + Number(sale[field] || 0), 0);
}

export function sumReceivedAmount(records: Pick<CommissionRecord, "amount" | "status">[]): number {
  return records
    .filter((r) => r.status === "received")
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
}

export function sumPendingAmount(records: Pick<CommissionRecord, "amount" | "status">[]): number {
  return records
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
}

export function sumReceivedByCategory(
  records: Pick<CommissionRecord, "amount" | "status" | "category">[],
): Record<CommissionCategory, number> {
  const totals: Record<CommissionCategory, number> = {
    tvs: 0,
    finance: 0,
    insurance: 0,
    transport: 0,
    documentation: 0,
    other: 0,
  };
  for (const r of records) {
    if (r.status === "received") totals[r.category] += Number(r.amount || 0);
  }
  return totals;
}

/** Create pending commission records when a sale is completed */
export async function createPendingCommissionRecords(
  supabase: SupabaseClient,
  saleId: string,
  sale: DealershipIncomeFields,
): Promise<void> {
  const rows = SALE_FIELD_MAP
    .map(({ category, field }) => ({
      sale_id: saleId,
      category,
      amount: Number(sale[field] || 0),
      status: "pending" as const,
    }))
    .filter((r) => r.amount > 0);

  if (rows.length === 0) return;
  const { error } = await supabase.from("commission_records").insert(rows);
  if (error) throw error;
}

/** Mark a commission record as received; release worker payouts when all sale commissions are received */
export async function markCommissionReceived(
  supabase: SupabaseClient,
  recordId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { data: record, error: fetchErr } = await supabase
    .from("commission_records")
    .select("id, sale_id, status")
    .eq("id", recordId)
    .single();
  if (fetchErr || !record) throw fetchErr || new Error("Commission record not found");
  if (record.status === "received") return;

  const { error: updateErr } = await supabase
    .from("commission_records")
    .update({ status: "received", received_at: now })
    .eq("id", recordId);
  if (updateErr) throw updateErr;

  const { data: pending } = await supabase
    .from("commission_records")
    .select("id")
    .eq("sale_id", record.sale_id)
    .eq("status", "pending");

  if (!pending?.length && record.sale_id) {
    await supabase
      .from("worker_commissions")
      .update({ status: "received", received_at: now })
      .eq("sale_id", record.sale_id)
      .eq("status", "pending");
  }
}

/** Revert a commission to pending (removes from revenue; reverts worker payouts for that sale) */
export async function markCommissionPending(
  supabase: SupabaseClient,
  recordId: string,
): Promise<void> {
  const { data: record, error: fetchErr } = await supabase
    .from("commission_records")
    .select("id, sale_id, status")
    .eq("id", recordId)
    .single();
  if (fetchErr || !record) throw fetchErr || new Error("Commission record not found");
  if (record.status === "pending") return;

  const { error: updateErr } = await supabase
    .from("commission_records")
    .update({ status: "pending", received_at: null })
    .eq("id", recordId);
  if (updateErr) throw updateErr;

  if (record.sale_id) {
    await supabase
      .from("worker_commissions")
      .update({ status: "pending", received_at: null })
      .eq("sale_id", record.sale_id);
  }
}

/** Standalone income (no sale) — e.g. misc other earnings */
export async function createStandaloneIncome(
  supabase: SupabaseClient,
  input: {
    category: CommissionCategory;
    amount: number;
    description: string;
    income_date: string;
    markReceived?: boolean;
  },
): Promise<void> {
  const receivedAt = input.markReceived
    ? `${input.income_date}T12:00:00.000Z`
    : null;
  const { error } = await supabase.from("commission_records").insert({
    sale_id: null,
    category: input.category,
    amount: input.amount,
    description: input.description.trim(),
    income_date: input.income_date,
    status: input.markReceived ? "received" : "pending",
    received_at: receivedAt,
  });
  if (error) throw error;
}

export const INCOME_TAB_GROUPS = {
  tvs: { label: "TVS Commission", categories: ["tvs"] as CommissionCategory[] },
  finance: { label: "Finance Commission", categories: ["finance"] as CommissionCategory[] },
  insurance: { label: "Insurance Commission", categories: ["insurance"] as CommissionCategory[] },
  other: {
    label: "Other Income",
    categories: ["transport", "documentation", "other"] as CommissionCategory[],
  },
} as const;

export type IncomeTab = keyof typeof INCOME_TAB_GROUPS;

export const REVENUE_RECOGNITION_NOTE =
  "Revenue is recognized only when a commission is marked Received — not when a bike is sold.";
