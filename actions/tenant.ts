"use server";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { CreateAgreement } from "@/lib/validations/agreement";
import { Tenant } from "@/lib/validations/tenant";

export const getTenantByEmail = async (
  email: string,
): Promise<{ subdomain: string; clientName: string }[]> => {
  if (!email) {
    throw new Error("Email is required");
  }

  const tenants = await prisma.tenant.findMany({
    where: {
      memberships: {
        some: {
          user: {
            email: email,
          },
        },
      },
      is_active: true,
    },
  });

  return tenants.map((tenant: Tenant) => ({
    subdomain: tenant.subdomain,
    clientName: tenant.name,
  }));
};

export const getTenantById = async (
  id: string,
): Promise<{ tenant: Tenant } | null> => {
  if (!id) {
    throw new Error("Tenant ID is required");
  }

  const tenant = await prisma.tenant.findUnique({
    where: {
      id: id,
    },
  });

  if (!tenant) {
    return null;
  }

  const tenantData: Tenant = {
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
  };

  return {
    tenant: tenantData,
  };
};

export const validateTenantById = async (id: string) => {
  const tenant = await getTenantById(id);
  if (!tenant) {
    throw new Error("Tenant not found");
  }
  return tenant;
};

export const getAllTenants = async (): Promise<Tenant[]> => {
  const tenants = await prisma.tenant.findMany();

  return tenants.map((tenant: Tenant) => ({
    ...tenant,
    country_code: tenant.country_code as "BON" | "CUR" | "ARU",
  }));
};

export const validaSubdomain = async (subdomain: string) => {
  const tenant = await prisma.tenant.findFirst({
    where: { subdomain },
  });

  return tenant ? true : false;
};

export const notifyTenantNewAgreement = async (
  tenant_id: string,
  agreementData: CreateAgreement,
) => {
  // Aquí podrías implementar la lógica para enviar una notificación al tenant.
  // Esto podría ser a través de un correo electrónico, una notificación push, o cualquier otro método que prefieras.
  // Por ejemplo, podrías usar un servicio de correo electrónico como SendGrid o Amazon SES para enviar un email al tenant.

  // Ejemplo de pseudo-código para enviar un email:
  const tenant = await prisma.tenant.findUnique({ where: { id: tenant_id } });
  if (tenant) {
    await sendEmail({
      to: tenant.contact_email,
      subject: "Nuevo Acuerdo de Pago Creado",
      html: `Se ha creado un nuevo acuerdo de pago con los siguientes detalles: ${JSON.stringify(agreementData)}`,
    });
  }

  console.log(
    `Notificación enviada al tenant ${tenant_id} sobre el nuevo acuerdo de pago:`,
    agreementData,
  );
};
