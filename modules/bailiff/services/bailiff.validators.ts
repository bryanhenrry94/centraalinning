import { z } from "zod";

export const bailiffBaseSchema = z.object({
  id: z.string().uuid(),
  fullname: z.string().min(1, "Volledige naam is verplicht"),
  email: z.string().email("Ongeldig e-mailadres"),
  phone: z.string().nullable().optional(),
  tenant_id: z.string().uuid(),
  user_id: z.string().uuid().nullable().optional(),
  // String en vez del enum de Prisma a propósito: evita el choque nominal
  // entre el BailiffStatus generado por Prisma y un enum TS propio.
  status: z.string().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const bailiffCreateSchema = bailiffBaseSchema.omit({
  id: true,
  tenant_id: true,
  status: true,
  created_at: true,
  updated_at: true,
});

export const bailiffUpdateSchema = bailiffBaseSchema
  .omit({
    created_at: true,
    updated_at: true,
  })
  .partial()
  .required({ id: true });

export type Bailiff = z.infer<typeof bailiffBaseSchema>;
export type BailiffCreate = z.infer<typeof bailiffCreateSchema>;
export type BailiffUpdate = z.infer<typeof bailiffUpdateSchema>;
