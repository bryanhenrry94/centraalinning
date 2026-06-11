import { prisma } from "@/lib/prisma";
import { CountryList } from "@/constants/country";

export class TenantService {
  static getById = async (tenantId: string) => {
    return await prisma.tenant.findUnique({
      where: { id: tenantId },
    });
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

  static generateCode = async (country_code: string): Promise<string> => {
    const island = CountryList.find((c) => c.value === country_code);
    const prefix = island?.label.toUpperCase().slice(0, 3) || "XXX";
    const last_sequence = await prisma.tenant.count({
      where: {
        country_code,
      },
    });

    const new_sequence = last_sequence + 1;
    return `CI${prefix}${new_sequence.toString().padStart(3, "0")}`;
  };
}
