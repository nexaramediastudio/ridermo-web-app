-- Dealership earnings (transport, documentation, other) are collected at sale — mark as received
UPDATE public.commission_records cr
SET
  status = 'received',
  received_at = COALESCE(
    cr.received_at,
    (s.sale_date::text || 'T12:00:00Z')::timestamptz,
    s.created_at
  )
FROM public.sales s
WHERE cr.sale_id = s.id
  AND cr.category IN ('transport', 'documentation', 'other')
  AND cr.status = 'pending';
