"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  IdTokenInput,
  LoginFormData,
  loginSchema,
} from "@/lib/validations/auth";
import { createActivationInvoice } from "./billing-invoice";
import { generateUniqueSubdomain } from "./tenant";
import {
  AuthSignUpSchema,
  iSignup,
  ITenantSignUp,
  signUpSchema,
} from "@/lib/validations/signup";
import { getParameter } from "./parameter";
import { CountryList } from "@/constants/country";
import { sendNewClitentEmail, sendWelcomeEmail } from "./email";
import { MembershipStatus } from "@prisma/client";

export const signInWithPassword = async (
  params: LoginFormData,
): Promise<{
  success: boolean;
  error?: string;
  data?: IdTokenInput;
}> => {
  const { email, password } = loginSchema.parse(params);

  const user = await prisma.user.findFirst({
    where: {
      email,
      is_active: true,
    },
    include: {
      memberships: {
        where: {
          status: MembershipStatus.ACTIVE,
        },
        include: {
          tenant: true,
          roles: true,
        },
      },
    },
  });

  if (!user || !user.password_hash) {
    return {
      success: false,
      error: "Credenciales incorrectas",
    };
  }

  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    return {
      success: false,
      error: "Credenciales incorrectas",
    };
  }

  if (user.memberships.length === 0) {
    return {
      success: false,
      error: "No tienes acceso a ningún espacio de trabajo",
    };
  }

  const activeMembership =
    user.memberships.find((m) => m.tenant_id === user.last_active_tenant_id) ??
    user.memberships[0];

  return {
    success: true,
    data: {
      id: user.id,
      fullname: user.fullname || "",
      email: user.email,
      phone: user.phone || "",
      tenant_id: activeMembership.tenant.id,
      subdomain: activeMembership.tenant.subdomain,
      company: activeMembership.tenant.name,
      roles: activeMembership.roles.map((r) => r.role),
      email_verified: user.is_active,
      memberships: user.memberships.map((membership) => ({
        id: membership.id,
        tenantId: membership.tenant.id,
        tenantName: membership.tenant.name,
        subdomain: membership.tenant.subdomain,
        status: membership.status,
        roles: membership.roles.map((r) => r.role),
      })),
    },
  };
};

export const emailExists = async (email: string): Promise<boolean> => {
  if (!email) {
    throw new Error("Email is required");
  }

  const user = await prisma.user.findFirst({
    where: { email: email, is_active: true },
  });

  return !!user;
};

export async function createAccount(
  payload: ITenantSignUp,
): Promise<{ status: boolean; subdomain: string; error?: string }> {
  try {
    // ✅ 1. Validar datos de entrada
    const validatedData = AuthSignUpSchema.parse(payload);

    // valida si existe el email
    const existingUser = await prisma.user.findFirst({
      where: { email: validatedData.user.email, is_active: true },
    });

    if (existingUser) {
      throw new Error("El correo electrónico ya está en uso");
    }

    // valida si existe el kvk
    const existingTenant = await prisma.tenant.findFirst({
      where: { kvk: validatedData.company.kvk },
    });

    if (existingTenant) {
      throw new Error("El KVK ya está registrado");
    }

    // Obtener parámetro necesario
    const parameter = await getParameter();
    if (!parameter) {
      throw new Error("No se encontró el parámetro");
    }

    // ✅ 2. Crear Tenant, User y Subscription en transacción
    const result = await prisma.$transaction(async (tx: any) => {
      const subdomain = await generateUniqueSubdomain(
        validatedData.company.name,
      );

      const code = await generateCode(validatedData.company.country);

      const tenant = await tx.tenant.create({
        data: {
          name: validatedData.company.name,
          code: code,
          subdomain,
          kvk: validatedData.company.kvk,
          legal_name: validatedData.company.name,
          country_code: validatedData.company.country,
          contact_email: validatedData.company.contact_email,
          is_active: true,
          address: validatedData.company.address,
          number_of_employees: validatedData.company.number_of_employees,
          terms_accepted: validatedData.company.terms_accepted,
        },
      });

      const password_hash = await bcrypt.hash(validatedData.user.password, 10);

      const user = await tx.user.create({
        data: {
          email: validatedData.user.email,
          fullname: validatedData.user.fullname,
          password_hash,
          phone: validatedData.user.phone,
          is_active: true, // este campo se podra usar luego si queremos implementar email verification
        },
      });

      const membership = await tx.membership.create({
        data: {
          tenant_id: tenant.id,
          user_id: user.id,
          status: MembershipStatus.PENDING, // El membership estará pendiente hasta que se confirme el pago
        },
      });

      const membershipRole = await tx.membershipRole.create({
        data: {
          membership_id: membership.id,
          role: "TENANT_ADMIN",
        },
      });

      return { tenant, user, membership };
    });

    let pricePlan: number = payload.total_price || 150;

    // if (
    //   payload.company.number_of_employees &&
    //   payload.company.number_of_employees > 50
    // ) {
    //   pricePlan = parameter.large_company_price;
    // } else {
    //   pricePlan = parameter.small_company_price;
    // }

    const abb_amount = pricePlan * parameter.abb_rate;

    // ✅ 3. Crear factura de activación (fuera de la transacción)
    await createActivationInvoice({
      tenant_id: result.tenant.id,
      island: validatedData.company.country,
      address: validatedData.company.address,
      fee_amount: pricePlan,
      abb_amount: abb_amount, // Suponiendo que abb_rate es el valor correcto
      digital_file_costs: parameter.digital_file_costs, // Suponiendo que digital_file_costs es el valor correcto
    });

    await sendWelcomeEmail(result.user.email, result.user.fullname || "");

    // const tenants = await prisma.tenant.findMany();
    // console.log("Current tenants:", tenants);
    // tenants.forEach(async (t) => {
    //   console.log(`Tenant: ${t.name}, Subdomain: ${t.subdomain}`);

    //   await sendNewClitentEmail(
    //     t.contact_email || "",
    //     result.tenant.name,
    //     new Date().toLocaleDateString(),
    //     await prisma.tenant.count(),
    //   );
    // });

    // espera 4 segundos antes de enviar el otro correo
    setTimeout(async () => {
      await sendNewClitentEmail(
        result.user.email || "",
        result.tenant.name,
        new Date().toLocaleDateString(),
        await prisma.tenant.count(),
      );
    }, 4000);

    // ✅ 5. Revalidar caché si es necesario
    revalidatePath("/auth/signup");

    return { status: true, subdomain: result.tenant.subdomain };
  } catch (error: any) {
    console.error("Error creating account:", error);
    return { status: false, subdomain: "", error: error.message };
  }
}

export async function createAccountV2(
  payload: iSignup,
  planId: string,
  cycle: "monthly" | "yearly",
): Promise<{
  status: boolean;
  subdomain: string;
  error?: string;
}> {
  try {
    // =========================
    // 1. VALIDATE INPUT
    // =========================

    const validatedData = signUpSchema.parse(payload);

    const normalizedEmail = validatedData.email.trim().toLowerCase();

    // =========================
    // 2. VALIDATE TENANT DATA
    // =========================

    const existingTenant = await prisma.tenant.findFirst({
      where: {
        kvk: validatedData.kvk,
      },
    });

    if (existingTenant) {
      throw new Error("El KVK ya está registrado");
    }

    // =========================
    // 3. GET PARAMETERS
    // =========================

    const parameter = await getParameter();

    if (!parameter) {
      throw new Error("No se encontró la configuración");
    }

    // =========================
    // 4. GET PLAN
    // =========================

    const plan = await prisma.plan.findUnique({
      where: {
        id: planId,
      },
    });

    if (!plan) {
      throw new Error("Plan no encontrado");
    }

    const pricePlan: number =
      cycle === "yearly"
        ? Number(plan.yearly_price)
        : Number(plan.monthly_price);

    if (!pricePlan) {
      throw new Error("No se encontró el precio del plan");
    }

    // =========================
    // 5. HASH PASSWORD
    // =========================

    const password_hash = await bcrypt.hash(validatedData.password, 10);

    // =========================
    // 6. TRANSACTION
    // =========================

    const result = await prisma.$transaction(
      async (tx) => {
        // -----------------------------------
        // CREATE TENANT
        // -----------------------------------

        const subdomain = await generateUniqueSubdomain(
          validatedData.company_name,
        );

        const code = await generateCode(validatedData.country);

        const tenant = await tx.tenant.create({
          data: {
            name: validatedData.company_name,
            legal_name: validatedData.company_name,

            subdomain,
            kvk: validatedData.kvk,

            code,

            country_code: validatedData.country,

            contact_email: normalizedEmail,

            address: "",

            number_of_employees: 0,

            terms_accepted: validatedData.accept_terms,

            is_active: true,
          },
        });

        // -----------------------------------
        // FIND OR CREATE GLOBAL USER
        // -----------------------------------

        let user = await tx.user.findFirst({
          where: {
            email: normalizedEmail,
          },
        });

        if (!user) {
          user = await tx.user.create({
            data: {
              email: normalizedEmail,

              fullname: validatedData.fullname,

              password_hash,

              phone: validatedData.phone,

              is_active: true,
            },
          });
        }

        // -----------------------------------
        // VALIDATE MEMBERSHIP
        // -----------------------------------

        const existingMembership = await tx.membership.findFirst({
          where: {
            tenant_id: tenant.id,
            user_id: user.id,
          },
        });

        if (existingMembership) {
          throw new Error("El usuario ya pertenece a esta organización");
        }

        // -----------------------------------
        // CREATE MEMBERSHIP
        // -----------------------------------

        const membership = await tx.membership.create({
          data: {
            tenant_id: tenant.id,
            user_id: user.id,
            status: MembershipStatus.PENDING,
          },
        });

        const membershipRole = await tx.membershipRole.create({
          data: {
            membership_id: membership.id,
            role: "TENANT_ADMIN",
          },
        });

        return {
          tenant,
          user,
          membership,
        };
      },
      {
        timeout: 20000,
      },
    );

    // =========================
    // 7. CREATE ACTIVATION INVOICE
    // =========================

    const abb_amount = pricePlan * (parameter.abb_rate || 0);

    await createActivationInvoice({
      tenant_id: result.tenant.id,

      island: validatedData.country,

      address: "",

      fee_amount: pricePlan,

      abb_amount,

      digital_file_costs: parameter.digital_file_costs,
    });

    // =========================
    // 8. SEND EMAILS
    // =========================

    await Promise.all([
      sendWelcomeEmail(result.user.email, result.user.fullname || ""),

      sendNewClitentEmail(
        result.user.email || "",
        result.tenant.name,
        new Date().toLocaleDateString(),
        await prisma.tenant.count(),
      ),
    ]);

    // =========================
    // 9. REVALIDATE
    // =========================

    revalidatePath("/auth/signup");

    return {
      status: true,
      subdomain: result.tenant.subdomain,
    };
  } catch (error: any) {
    console.error("Error creating account:", error);

    return {
      status: false,
      subdomain: "",
      error: error?.message || "Error creating account",
    };
  }
}

const generateCode = async (country_code: string): Promise<string> => {
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
