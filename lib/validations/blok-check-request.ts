import { z } from "zod";
import { IdentificationType } from "@/constants/identification-type";
import { PaymentStatus } from "@/constants/payment-status";

const identificationValues = Object.values(IdentificationType) as [
  string,
  ...string[],
];

const paymentStatusValues = Object.values(PaymentStatus) as [
  string,
  ...string[],
];

export const blokCheckRequestSchema = z.object({
  id: z.string().cuid(),

  tenant_id: z.string().min(1),
  debtor_id: z.string().optional(),

  // 🔍 búsqueda
  document_type: z.enum(identificationValues),
  document_number: z.string().min(3, "Documento inválido"),

  // 💳 pago
  payment_id: z.string().optional(),
  payment_status: z.enum(paymentStatusValues).default(PaymentStatus.PENDING),

  amount: z.number().positive(),

  // 📊 resultado
  has_block: z.boolean().optional(),
  block_reason: z.string().optional(),
  checked_at: z.date().optional(),

  created_at: z.date().default(() => new Date()),
  updated_at: z.date().optional(),
});

export const blokCheckRequestCreateSchema = blokCheckRequestSchema.omit({
  id: true,
  tenant_id: true,
  debtor_id: true,
  payment_id: true,
  payment_status: true,
  has_block: true,
  block_reason: true,
  checked_at: true,
  created_at: true,
  updated_at: true,
});

export const blokCheckRequestUpdateSchema = blokCheckRequestSchema
  .partial()
  .omit({
    id: true,
    tenant_id: true,
    debtor_id: true,
    payment_id: true,
    created_at: true,
  });

export const blokCheckRequestResponseSchema = blokCheckRequestSchema.extend({
  tenant_id: z.string(),
  debtor_id: z.string().nullable(),
});

export type BlokCheckRequest = z.infer<typeof blokCheckRequestSchema>;
export type BlokCheckRequestCreate = z.infer<
  typeof blokCheckRequestCreateSchema
>;
export type BlokCheckRequestUpdate = z.infer<
  typeof blokCheckRequestUpdateSchema
>;
export type BlokCheckRequestResponse = z.infer<
  typeof blokCheckRequestResponseSchema
>;
