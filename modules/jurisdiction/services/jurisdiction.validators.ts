import { z } from "zod";

// Isla/jurisdicción operativa de CFSB (punto 13/14 del análisis CFSB) —
// hoy Bonaire/Curaçao/Aruba, mañana potencialmente Holanda u otro país.
// Ningún nombre de isla vive hardcodeado acá: este schema valida la FORMA
// de los datos, no una lista fija de países.
export const jurisdictionSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Code moet minstens 2 tekens zijn")
    .max(10, "Code mag maximaal 10 tekens zijn")
    .transform((v) => v.toUpperCase()),
  name: z.string().trim().min(1, "Naam is verplicht"),
  isActive: z.boolean(),
  rolloutOrder: z.number().int().min(0),
});

export const jurisdictionCreateSchema = jurisdictionSchema;
export const jurisdictionUpdateSchema = jurisdictionSchema.partial();

export type JurisdictionInput = z.infer<typeof jurisdictionCreateSchema>;
export type JurisdictionUpdateInput = z.infer<typeof jurisdictionUpdateSchema>;
