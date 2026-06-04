import type { SupabaseClient } from "@supabase/supabase-js";

export async function deleteSale(
  supabase: SupabaseClient,
  saleId: string
): Promise<{ invoiceNumber: string; roundNumber: string | null }> {
  const { data: sale, error: fetchErr } = await supabase
    .from("sales")
    .select(`
      id, invoice_number, bike_id,
      inventory_bikes(round_number)
    `)
    .eq("id", saleId)
    .single();

  if (fetchErr || !sale) throw new Error(fetchErr?.message || "Sale not found");

  const ib = sale.inventory_bikes as { round_number: string } | { round_number: string }[] | null;
  const roundNumber = Array.isArray(ib) ? ib[0]?.round_number : ib?.round_number ?? null;

  await supabase.from("cheques").delete().eq("sale_id", saleId);

  const { error: deleteErr } = await supabase.from("sales").delete().eq("id", saleId);
  if (deleteErr) throw new Error(deleteErr.message);

  if (sale.bike_id) {
    await supabase.from("inventory_bikes").update({ status: "in_stock" }).eq("id", sale.bike_id);
  }

  return { invoiceNumber: sale.invoice_number, roundNumber };
}

export const DELETE_SALE_CONFIRM_MESSAGE =
  "Remove this sale? The bike will return to inventory. Linked commissions, CR/plate records, and TVS cheques will also be removed. This cannot be undone.";
