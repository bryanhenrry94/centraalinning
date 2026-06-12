import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignUpSchema } from "./signup.validators";
import { SignUpInput } from "./signup.type";
import { ParameterService } from "../parameter/parameter.service";
import { TenantService } from "../tenant/tenant.service";
import { createSentooPayment } from "@/actions/sentoo.actions";
import { PaymentCreate } from "@/lib/validations/payment";
import { PaymentService } from "../payments/payment.service";
import { MailService } from "../mail/mail.service";

export class SignupService {
  static register = async (
    payload: SignUpInput,
  ): Promise<{
    success: boolean;
    paymentLink?: string;
    error?: string;
  }> => {
    try {
      // 1. VALIDATE INPUT
      const validatedData = SignUpSchema.parse(payload);
      const normalizedEmail = validatedData.email.trim().toLowerCase();

      // 2. VALIDATE TENANT DATA
      const existingTenant = await prisma.tenant.findFirst({
        where: {
          kvk: validatedData.kvk,
        },
      });

      if (existingTenant) {
        return {
          success: false,
          error: "El KVK ya está registrado",
        };
      }

      // 3. GET PARAMETERS
      const parameter = await ParameterService.getParameter();

      if (!parameter) {
        return {
          success: false,
          error: "No se encontró la configuración",
        };
      }

      // 4. GET PLAN
      const plan = await prisma.plan.findUnique({
        where: {
          id: validatedData.plan_id,
        },
      });

      if (!plan) {
        return {
          success: false,
          error: "Plan no encontrado",
        };
      }

      const pricePlan: number =
        validatedData.billing_cycle === "YEARLY"
          ? Number(plan.yearly_price)
          : Number(plan.monthly_price);

      if (!pricePlan) {
        return {
          success: false,
          error: "No se encontró el precio del plan",
        };
      }

      // 5. HASH PASSWORD
      const password_hash = await bcrypt.hash(validatedData.password, 10);

      const subdomain = await TenantService.generateUniqueSubdomain(
        validatedData.company_name,
      );

      const code = await TenantService.generateCode(validatedData.country);

      // 6. CREATE TENANT, USER, MEMBERSHIP AND SUBSCRIPTION IN A TRANSACTION
      const transactionResult = await prisma.$transaction(
        async (tx) => {
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

          // FIND OR CREATE GLOBAL USER
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

          // VALIDATE MEMBERSHIP
          const existingMembership = await tx.membership.findFirst({
            where: {
              tenant_id: tenant.id,
              user_id: user.id,
            },
          });

          if (existingMembership) {
            return {
              status: false,
              result: null,
              error: "El usuario ya pertenece a esta organización",
            };
          }

          const membership = await tx.membership.create({
            data: {
              tenant_id: tenant.id,
              user_id: user.id,
              status: "PENDING",
            },
          });

          await tx.membershipRole.create({
            data: {
              membership_id: membership.id,
              role: "TENANT_ADMIN",
            },
          });

          const subscription = await tx.subscription.create({
            data: {
              tenant_id: tenant.id,
              plan_id: validatedData.plan_id,
              billing_cycle: validatedData.billing_cycle,
              status: "PENDING",
              current_period_end: new Date(
                new Date().setMonth(
                  new Date().getMonth() +
                    (validatedData.billing_cycle === "YEARLY" ? 12 : 1),
                ),
              ),
            },
          });

          return {
            status: true,
            result: {
              tenant,
              user,
              membership,
              subscription,
            },
          };
        },
        {
          timeout: 20000,
        },
      );

      if (!transactionResult.status || !transactionResult.result) {
        return {
          success: false,
          error: transactionResult.error || "Error en la transacción",
        };
      }

      const { tenant, user } = transactionResult.result;

      // 7. Crear el pago en Sentoo.
      const sentooResponse = await createSentooPayment({
        amount: pricePlan, // YA en centavos
        description: "Prueba",
        reference: tenant.kvk || "",
      });

      /**
       * Validar respuesta Sentoo
       */
      if (!sentooResponse?.success || !sentooResponse?.payment?.url) {
        throw new Error(
          sentooResponse?.error || "Kon de betaling niet aanmaken.",
        );
      }

      // 8. Registra el pago en la base de datos
      const paymentData: PaymentCreate = {
        debt_id: null, // No hay una deuda previa, este es un pago directo por activación
        method: "TRANSFER",
        total_amount: pricePlan,
        paid_at: null,
        status: "pending",
        contract_id: null,
        provider: "sentoo",
        provider_ref: sentooResponse?.payment?.id,
        provider_payload: JSON.stringify(sentooResponse.raw),
        reference_number: tenant.kvk || "",
        agreement_id: null,
        payment_type: "SUBSCRIPTION",
      };

      // Registrar el pago en la base de datos
      const paymentRes = await PaymentService.registerPayment(
        tenant.id,
        paymentData,
      );

      if (!paymentRes) {
        throw new Error("Kon de betaling niet registreren.");
      }

      // 6. Devolver la URL de pago al frontend.
      const paymentUrl = sentooResponse.payment.url;

      await MailService.sendPaymentLinkEmail(
        tenant.contact_email,
        tenant.name,
        paymentUrl,
        pricePlan,
        tenant.kvk || "",
      );

      return {
        success: true,
        paymentLink: paymentUrl,
      };
    } catch (error: any) {
      console.error("Error creating account:", error);

      return {
        success: false,
        error: error?.message || "Error creating account",
      };
    }
  };
}
