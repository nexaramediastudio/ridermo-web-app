/**
 * Dealership income fields stored on a sale (potential earnings, not recognized revenue).
 * Use commission_records with status = 'received' for revenue recognition.
 */
export interface DealershipIncomeFields {
  tvs_commission?: number | null;
  finance_commission?: number | null;
  insurance_commission?: number | null;
  transport_charges?: number | null;
  documentation_charges?: number | null;
  other_earnings?: number | null;
}

/** @deprecated Use sumReceivedAmount(commission_records) for revenue */
export function calcDealershipIncome(sale: DealershipIncomeFields): number {
  return (
    Number(sale.tvs_commission || 0) +
    Number(sale.finance_commission || 0) +
    Number(sale.insurance_commission || 0) +
    Number(sale.transport_charges || 0) +
    Number(sale.documentation_charges || 0) +
    Number(sale.other_earnings || 0)
  );
}

export function calcCommissionIncome(sale: DealershipIncomeFields): number {
  return (
    Number(sale.tvs_commission || 0) +
    Number(sale.finance_commission || 0) +
    Number(sale.insurance_commission || 0)
  );
}

export const DEALERSHIP_INCOME_NOTE =
  "Revenue is recognized only when commissions are marked Received — not at sale time.";
