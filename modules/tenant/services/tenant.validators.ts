import { z } from "zod";

export const TenantSchema = z.object({
  id: z.string().uuid(), // Identificador único del tenant
  name: z.string(), // Nombre comercial
  subdomain: z.string(), // Subdominio de acceso
  country_code: z.string(), // Código de país ('BON', 'CUR', 'ARU')
  contact_email: z.string().email(), // Email de contacto
  address: z.string().nullable().optional(), // Dirección
  city: z.string().nullable().optional(), // Ciudad
  phone: z.string().nullable().optional(), // Teléfono
  number_of_employees: z.number().int().nullable().optional(), // Número de empleados
  website: z.string().nullable().optional(), // Sitio web
  logo_url: z.string().nullable().optional(), // URL del logo
  is_active: z.boolean().default(false), // Estado activo
  kvk: z.string().nullable().optional(), // Número de registro comercial (KvK)
  terms_accepted: z.boolean().default(false), // Términos aceptados
  created_at: z.coerce.date(), // Fecha de creación
  updated_at: z.coerce.date(), // Fecha de última actualización
});

export const TenantCreateSchema = TenantSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const TenantUpdateSchema = TenantCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export type Tenant = z.infer<typeof TenantSchema>;
export type TenantUpdate = z.infer<typeof TenantUpdateSchema>;

// Subconjunto editable por el propio tenant desde /settings (Rekening) —
// deliberadamente excluye subdomain, country_code, kvk, is_active y
// terms_accepted: son datos de identidad/jurisdicción/estado de cuenta con
// efectos en cascada (routing, numeración legal, facturación) que quedan
// fuera del alcance de "editar mis datos de empresa".
export const TenantCompanyUpdateSchema = z.object({
  name: z.string().trim().min(1, "Bedrijfsnaam is verplicht"),
  contact_email: z.string().trim().email("Ongeldig e-mailadres"),
  phone: z.string().trim().optional().nullable(),
  website: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  number_of_employees: z
    .number()
    .int()
    .nonnegative("Aantal medewerkers kan niet negatief zijn")
    .optional()
    .nullable(),
});

export type TenantCompanyUpdate = z.infer<typeof TenantCompanyUpdateSchema>;
