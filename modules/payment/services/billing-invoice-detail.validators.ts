import { z } from "zod";

export const BillingInvoiceDetailBaseSchema = z.object({
  id: z.string().uuid(),
  invoice_id: z.string(),
  item_description: z.string(),
  item_quantity: z.preprocess(
    (val) =>
      typeof val === "string" || typeof val === "number" ? Number(val) : val,
    z.number().int()
  ),
  item_unit_price: z.preprocess(
    (val) =>
      typeof val === "string" || typeof val === "number" ? Number(val) : val,
    z.number().min(0)
  ),
  item_total_price: z.number(),
  item_tax_rate: z.number(),
  item_tax_amount: z.number(),
  item_total_with_tax: z.number(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const BillingInvoiceDetailCreateSchema =
  BillingInvoiceDetailBaseSchema.omit({
    id: true,
    invoice_id: true,
    created_at: true,
    updated_at: true,
  });

export type BillingInvoiceDetailBase = z.infer<
  typeof BillingInvoiceDetailBaseSchema
>;
export type BillingInvoiceDetailCreate = z.infer<
  typeof BillingInvoiceDetailCreateSchema
>;
