"use server";
import { sendEmail } from "@/infrastructure/mail/resend-client";
import { CreateAgreement } from "@/modules/agreement/services/agreement.validators";
import { Tenant } from "@/modules/tenant/services/tenant.validators";
import { TenantService } from "@/modules/tenant/services/tenant.service";

export const getTenantByEmail = async (
  email: string,
): Promise<{ subdomain: string; clientName: string }[]> => {
  return TenantService.getByEmail(email);
};

export const getTenantById = async (
  id: string,
): Promise<{ tenant: Tenant } | null> => {
  if (!id) throw new Error("Tenant ID is required");

  const tenant = await TenantService.getById(id);

  if (!tenant) return null;

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      country_code: tenant.country_code,
      contact_email: tenant.contact_email,
      address: tenant.address,
      city: tenant.city,
      phone: tenant.phone,
      number_of_employees: tenant.number_of_employees,
      website: tenant.website,
      logo_url: tenant.logo_url,
      is_active: tenant.is_active,
      terms_accepted: tenant.terms_accepted,
      created_at: tenant.created_at,
      updated_at: tenant.updated_at,
      kvk: tenant.kvk,
    } as Tenant,
  };
};

export const validateTenantById = async (id: string) => {
  const tenant = await getTenantById(id);
  if (!tenant) throw new Error("Tenant not found");
  return tenant;
};

export const getAllTenants = async (): Promise<Tenant[]> => {
  const tenants = await TenantService.getAll();
  return tenants.map((tenant: any) => ({
    ...tenant,
    country_code: tenant.country_code as "BON" | "CUR" | "ARU",
  }));
};

export const validaSubdomain = async (subdomain: string) => {
  return TenantService.subdomainExists(subdomain);
};

export const notifyTenantNewAgreement = async (
  tenant_id: string,
  agreementData: CreateAgreement,
) => {
  const tenant = await TenantService.getById(tenant_id);
  if (tenant) {
    await sendEmail({
      to: tenant.contact_email,
      subject: "Nuevo Acuerdo de Pago Creado",
      html: `Se ha creado un nuevo acuerdo de pago con los siguientes detalles: ${JSON.stringify(agreementData)}`,
    });
  }
  console.log(`Notificación enviada al tenant ${tenant_id} sobre el nuevo acuerdo de pago:`, agreementData);
};
