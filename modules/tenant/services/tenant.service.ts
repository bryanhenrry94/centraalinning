import { prisma } from "@/lib/prisma";
import {
  TenantCompanyUpdate,
  TenantCompanyUpdateSchema,
} from "@/modules/tenant/services/tenant.validators";

export class TenantService {
  static getById = async (tenantId: string) => {
    return await prisma.tenant.findUnique({
      where: { id: tenantId },
    });
  };

  static updateCompanyInfo = async (
    id: string,
    data: TenantCompanyUpdate,
  ): Promise<{ success: boolean; error?: string; data?: any }> => {
    try {
      const validated = TenantCompanyUpdateSchema.parse(data);
      const tenant = await prisma.tenant.update({
        where: { id },
        data: validated,
      });
      return { success: true, data: tenant };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Onbekende fout",
      };
    }
  };

  static generateUniqueSubdomain = async (
    company_name: string,
  ): Promise<string> => {
    // sanitize: lowercase, remove accents/diacritics, remove symbols except spaces and hyphens,
    // trim, replace spaces with single hyphen and collapse multiple hyphens
    const sanitizedBase = company_name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    // fallback base if sanitization removed everything
    const base = sanitizedBase || "tenant";
    let subdomain = base;

    let exists = await prisma.tenant.findUnique({
      where: { subdomain },
    });

    let suffix = 1;
    while (exists) {
      subdomain = `${base}-${suffix}`;
      exists = await prisma.tenant.findUnique({
        where: { subdomain },
      });
      suffix++;
    }

    return subdomain;
  };

  static getByEmail = async (
    email: string,
  ): Promise<{ subdomain: string; clientName: string }[]> => {
    if (!email) throw new Error("Email is required");
    const tenants = await prisma.tenant.findMany({
      where: {
        memberships: { some: { user: { email } } },
        is_active: true,
      },
    });
    return tenants.map((t) => ({ subdomain: t.subdomain, clientName: t.name }));
  };

  // Solo deelnemers reales — nunca el tenant propio de la plataforma
  // (is_platform_tenant, ver comentario en schema.prisma). Este es el
  // listado que alimenta CFSB Admin > Deelnemers y cualquier selector de
  // "elegir un cliente" (p.ej. facturación).
  static getAll = async () => {
    return prisma.tenant.findMany({ where: { is_platform_tenant: false } });
  };

  // Tenants activos de la red — usado por el broadcast de red de COP
  // ("presión de red": preguntar a todos los participantes activos) y por
  // el cc de "nuevo cliente registrado" del signup. Mismo motivo que
  // getAll: el tenant de la plataforma no es un participante real.
  static getActiveParticipants = async () => {
    return prisma.tenant.findMany({ where: { is_active: true, is_platform_tenant: false } });
  };

  // Toggle mínimo para CFSB Admin (Deelnemers) — desactivar un tenant no
  // borra nada, es reversible (mismo patrón que JurisdictionService.setActive).
  static setActive = async (id: string, isActive: boolean) => {
    return prisma.tenant.update({ where: { id }, data: { is_active: isActive } });
  };

  static subdomainExists = async (subdomain: string): Promise<boolean> => {
    const tenant = await prisma.tenant.findFirst({ where: { subdomain } });
    return !!tenant;
  };

  // Numeración general de empresas (CFSB-B-001, etc.) — ya no por isla.
  // Reemplaza el esquema anterior CFSB-<islandCode>-001.
  static generateCode = async (): Promise<string> => {
    const last_sequence = await prisma.tenant.count();
    const new_sequence = last_sequence + 1;
    return `CFSB-B-${new_sequence.toString().padStart(3, "0")}`;
  };
}
