import { z } from "zod";

export const TenantSchema = z.object({
  id: z.string().uuid(), // Identificador único del tenant
  name: z.string(), // Nombre comercial
  subdomain: z.string(), // Subdominio de acceso
  country_code: z.string(), // Código de país ('BQ', 'CW', 'AW')
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
