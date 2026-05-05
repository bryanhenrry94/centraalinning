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
import { AuthSignUpSchema, ITenantSignUp } from "@/lib/validations/signup";
import { getParameter } from "./parameter";
import { CountryList } from "@/constants/country";
import { sendNewClitentEmail, sendWelcomeEmail } from "./email";
import { MembershipStatus } from "@prisma/client";

export const signInWithPassword = async (
  params: LoginFormData,
): Promise<{ success: boolean; error?: string; data?: IdTokenInput }> => {
  // Validar inputs
  const validated = loginSchema.parse(params);
  const { email, password, subdomain } = validated;

  if (!email || !password || !subdomain) {
    return {
      success: false,
      error: "Email, password, and subdomain are required",
    };
  }

  // Buscar el Tenant
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain },
  });

  if (!tenant) {
    return {
      success: false,
      error: "Tenant not found",
    };
  }

  // Buscar el usuario POR EMAIL (sin tenant)
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.is_active) {
    return {
      success: false,
      error: "Invalid email or inactive user",
    };
  }

  if (!user.password_hash) {
    return {
      success: false,
      error: "User has no password set",
    };
  }

  // 3️⃣ Buscar Membership (UserTenant) para este tenant
  const membershipPending = await prisma.membership.findFirst({
    where: {
      user_id: user.id,
      tenant_id: tenant.id,
      status: MembershipStatus.PENDING,
    },
  });

  if (membershipPending) {
    return {
      success: false,
      error: "Betaling in behandeling. Voltooi alstublieft het betalingsproces om toegang te krijgen.",
    };
  }

  const membership = await prisma.membership.findFirst({
    where: {
      user_id: user.id,
      tenant_id: tenant.id,
      status: {
        not: MembershipStatus.PENDING,
      },
    },
  });

  if (!membership) {
    return {
      success: false,
      error: "No tienes acceso a este tenant. Contacta al administrador.",
    };
  }

  // 4️⃣ Validar contraseña
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    return {
      success: false,
      error: "Credenciales inválidas",
    };
  }

  // 5️⃣ Crear el token con el rol del membership
  const idToken: IdTokenInput = {
    id: user.id,
    fullname: user.fullname || "",
    email: user.email,
    phone: user.phone || "",
    tenant_id: tenant.id,
    subdomain: tenant.subdomain,
    company: tenant.name,
    role: membership.role, // 👈 rol correcto tomado de membership
    email_verified: user.is_active,
  };

  revalidatePath("/auth/login");
  return { success: true, data: idToken };
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
          role: "TENANT_ADMIN" as any,
          status: MembershipStatus.PENDING, // El membership estará pendiente hasta que se confirme el pago
        },
      });

      return { tenant, user, membership };
    });

    let pricePlan = payload.total_price || 150;

    // if (
    //   payload.company.number_of_employees &&
    //   payload.company.number_of_employees > 50
    // ) {
    //   pricePlan = parameter.large_company_price;
    // } else {
    //   pricePlan = parameter.small_company_price;
    // }

    // ✅ 3. Crear factura de activación (fuera de la transacción)
    await createActivationInvoice({
      tenant_id: result.tenant.id,
      island: validatedData.company.country,
      address: validatedData.company.address,
      amount: pricePlan,
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
