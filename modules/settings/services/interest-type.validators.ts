import { z } from "zod";

export const CalculationTypeEnumSchema = z.enum(["FIXED", "VARIABLE"]);

export const InterestDetailSchema = z.object({
  id: z.string().uuid(), // Identificador único del detalle de interés
  date: z.string(), // Fecha del detalle de interés
  rate: z.number(), // Tasa de interés
  interest_type_id: z.string().uuid(), // Clave foránea a InterestType
  // interest_type is omitted to avoid circular reference
});

export const InterestTypeSchema = z.object({
  id: z.string().uuid(), // Identificador único del tipo de interés
  name: z.string(), // Nombre del tipo de interés
  calculation_type: CalculationTypeEnumSchema, // Tipo de cálculo (fijo o variable)
  details: z.array(InterestDetailSchema), // Relación uno a muchos con InterestDetail
});

export const InterestTypeCreateSchema = InterestTypeSchema.omit({
  id: true,
});

// Export TypeScript types inferred from the schemas
export type InterestDetail = z.infer<typeof InterestDetailSchema>;
export type InterestType = z.infer<typeof InterestTypeSchema>;
export type InterestTypeCreate = z.infer<typeof InterestTypeCreateSchema>;
