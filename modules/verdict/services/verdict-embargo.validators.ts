import { z } from "zod";

export const VerdictEmbargoBaseSchema = z.object({
  id: z.string().uuid({ message: "El ID debe ser un UUID válido" }).optional(),
  verdict_id: z
    .string()
    .uuid({ message: "El ID de Verdict debe ser un UUID válido" })
    .optional(),
  company_name: z
    .string()
    .min(1, { message: "El nombre de la empresa es obligatorio" }),
  company_phone: z
    .string()
    .min(7, {
      message: "El teléfono de la empresa debe tener al menos 7 dígitos",
    })
    .max(20, {
      message: "El teléfono de la empresa debe tener como máximo 20 dígitos",
    }),
  company_email: z
    .string()
    .email({ message: "Correo electrónico de la empresa no válido" }),
  company_address: z
    .string()
    .min(1, { message: "La dirección de la empresa es obligatoria" }),
  embargo_type: z
    .string()
    .min(1, { message: "El tipo de embargo es obligatorio" }),
  embargo_date: z.coerce.date({
    message: "La fecha de embargo debe ser una fecha válida",
  }),
  embargo_amount: z
    .number()
    .nonnegative({ message: "El monto del embargo debe ser no negativo" }),
  total_amount: z
    .number()
    .nonnegative({ message: "El monto total debe ser no negativo" }),
  created_at: z.coerce.date({
    message: "La fecha de creación debe ser una fecha válida",
  }),
  updated_at: z.coerce.date({
    message: "La fecha de actualización debe ser una fecha válida",
  }),
});

export const VerdictEmbargoCreateSchema = VerdictEmbargoBaseSchema.omit({
  id: true,
  verdict_id: true,
  created_at: true,
  updated_at: true,
});

export type VerdictEmbargo = z.infer<typeof VerdictEmbargoBaseSchema>;
export type VerdictEmbargoCreate = z.infer<typeof VerdictEmbargoCreateSchema>;
