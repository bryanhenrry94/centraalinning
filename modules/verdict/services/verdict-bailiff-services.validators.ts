import { z } from "zod";

export const VerdictBailiffServicesSchema = z.object({
  id: z.string().uuid(),
  verdict_id: z.string().uuid(),
  service_invoice_number: z.string(),
  service_type: z.string(),
  service_cost: z.preprocess(
    (val) => (typeof val === "string" ? Number(val) : val),
    z.number()
  ),
  service_date: z.coerce.date().nullable().optional(),
  description: z.string().nullable().optional(),
  document_storage_key: z.string().nullable().optional(),
  document_original_name: z.string().nullable().optional(),
  document_mime_type: z.string().nullable().optional(),
  document_size: z.number().nullable().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const VerdictBailiffServicesCreateSchema =
  VerdictBailiffServicesSchema.omit({
    id: true,
    verdict_id: true,
    created_at: true,
    updated_at: true,
  });

export type VerdictBailiffServicesCreate = z.infer<
  typeof VerdictBailiffServicesCreateSchema
>;

export type VerdictBailiffServices = z.infer<
  typeof VerdictBailiffServicesSchema
>;
