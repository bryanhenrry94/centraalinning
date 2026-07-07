import { z } from "zod";
import {
  BillingInvoiceDetailBaseSchema,
  BillingInvoiceDetailCreateSchema,
} from "@/modules/payment/services/billing-invoice-detail.validators";
import { TenantSchema } from "@/modules/tenant/services/tenant.validators";

export const BillingInvoiceBaseSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  invoice_number: z.string(),
  amount: z.number(),
  currency: z.string().default("USD"),
  issue_date: z.preprocess(
    (val) =>
      typeof val === "string" || val instanceof Date ? new Date(val) : val,
    z.date()
  ),
  due_date: z.preprocess(
    (val) =>
      typeof val === "string" || val instanceof Date ? new Date(val) : val,
    z.date().refine((date) => !isNaN(date.getTime()))
  ),
  description: z.string().nullable().optional(),
  status: z.enum(["unpaid", "paid", "overdue"]).default("unpaid"),
  invoice_details: z.array(BillingInvoiceDetailCreateSchema).optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const BillingInvoiceCreateSchema = BillingInvoiceBaseSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const BillingInvoiceUpdateSchema = BillingInvoiceBaseSchema.pick({
  amount: true,
  currency: true,
  due_date: true,
  status: true,
});

export const BillingInvoiceResponseSchema = BillingInvoiceBaseSchema.extend({
  invoice_details: z.array(BillingInvoiceDetailBaseSchema),
  payments: z.array(z.any()).optional(), // Replace z.any() with PaymentSchema if available
});

export const BillingInvoiceWithTenantSchema =
  BillingInvoiceResponseSchema.extend({
    tenant: TenantSchema,
  });

export type BillingInvoiceBase = z.infer<typeof BillingInvoiceBaseSchema>;
export type BillingInvoiceCreate = z.infer<typeof BillingInvoiceCreateSchema>;
export type BillingInvoiceUpdate = z.infer<typeof BillingInvoiceUpdateSchema>;
export type BillingInvoiceResponse = z.infer<
  typeof BillingInvoiceResponseSchema
>;
export type BillingInvoiceWithTenant = z.infer<
  typeof BillingInvoiceWithTenantSchema
>;
