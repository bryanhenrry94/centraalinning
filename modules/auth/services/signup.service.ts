import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignUpSchema } from "./signup.validators";
import { SignUpInput } from "./signup.type";
import { ParameterService } from "@/modules/settings/services/parameter/parameter.service";
import { TenantService } from "@/modules/tenant/services/tenant.service";
import { SentooService } from "@/infrastructure/sentoo/sentoo.service";
import {
  PaymentCreate,
  PaymentType,
} from "@/modules/payment/services/payment.validators";
import { PaymentService } from "@/modules/payment/services/payment.service";
import { MailService } from "@/infrastructure/mail/mail.service";

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
          error: "Dit KVK-nummer is al geregistreerd",
        };
      }

      // 3. GET PARAMETERS
      const parameter = await ParameterService.getParameter();

      if (!parameter) {
        return {
          success: false,
          error: "Systeemconfiguratie niet gevonden",
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
          error: "Abonnement niet gevonden",
        };
      }

      const pricePlan: number =
        validatedData.billing_cycle === "YEARLY"
          ? Number(plan.yearly_price)
          : Number(plan.monthly_price);

      if (!pricePlan) {
        return {
          success: false,
          error: "Kon de prijs van het abonnement niet vinden",
        };
      }

      // 5. HASH PASSWORD
      const password_hash = await bcrypt.hash(validatedData.password, 10);

      const subdomain = await TenantService.generateUniqueSubdomain(
        validatedData.company_name,
      );

      const code = await TenantService.generateCode(validatedData.country);
      // La isla elegida en el signup (island-step.tsx) ya viene de
      // Jurisdiction — acá se resuelve el FK correspondiente (punto 13 del
      // análisis CFSB).
      const jurisdiction = await prisma.jurisdiction.findUnique({
        where: { islandCode: validatedData.country },
      });

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
              jurisdictionId: jurisdiction?.id,
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
              error: "De gebruiker maakt al deel uit van deze organisatie",
            };
          }

          // Het lidmaatschap wordt pas actief nadat de betaling bij Sentoo
          // is bevestigd (zie processSubscriptionPayment in de webhook).
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
              role: plan.target_role,
            },
          });

          // El plan elegido determina el rol de la cuenta (Deelnemer,
          // Advocaat, Deurwaarder). Si es Advocaat/Deurwaarder, la cuenta
          // también aparece como abogado/alguacil autorregistrado,
          // disponible platform-wide para que cualquier tenant lo elija al
          // transferir un GOP (ver LawyerService.getAllActive /
          // BailiffService.getAllActive). Queda INACTIVE hasta que se
          // confirme el pago (ver processSubscriptionPayment).
          if (plan.target_role === "LAWYER") {
            const [firstName, ...rest] = validatedData.fullname.trim().split(/\s+/);
            await tx.lawyer.create({
              data: {
                tenantId: tenant.id,
                userId: user.id,
                firstName: firstName || validatedData.fullname,
                lastName: rest.join(" ") || "",
                companyName: validatedData.company_name,
                email: normalizedEmail,
                phone: validatedData.phone,
                status: "INACTIVE",
              },
            });
          } else if (plan.target_role === "BAILIFF") {
            const existingBailiffEmail = await tx.bailiff.findUnique({
              where: { email: normalizedEmail },
            });
            if (!existingBailiffEmail) {
              await tx.bailiff.create({
                data: {
                  tenant_id: tenant.id,
                  user_id: user.id,
                  fullname: validatedData.fullname,
                  email: normalizedEmail,
                  phone: validatedData.phone,
                  status: "INACTIVE",
                },
              });
            }
          }

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
          error:
            transactionResult.error ||
            "Er is een fout opgetreden tijdens de registratie",
        };
      }

      const { tenant } = transactionResult.result;

      const billingLabel =
        validatedData.billing_cycle === "YEARLY" ? "Jaarlijks" : "Maandelijks";

      // 7. Crear el pago en Sentoo.
      // Let op: Sentoo staat maximaal 50 tekens toe in sentoo_description,
      // dus de bedrijfsnaam (variabele lengte) mag hier niet in verwerkt worden.
      const sentooResponse = await SentooService.createTransaction({
        amount: pricePlan,
        description: `CFSB Registratie - ${plan.name} (${billingLabel})`,
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

      // 6. Devolver la URL de pago al frontend.
      const paymentUrl = sentooResponse.payment.url;

      // 8. Registra el pago en la base de datos
      const paymentData: PaymentCreate = {
        debtClaim_id: null, // No hay una deuda previa, este es un pago directo por activación
        method: "TRANSFER",
        total_amount: pricePlan,
        paid_at: null,
        status: "pending",
        contract_id: null,
        provider: "sentoo",
        provider_ref: sentooResponse?.payment?.id,
        provider_payload: JSON.stringify(sentooResponse.raw),
        payment_url: paymentUrl,
        reference_number: tenant.kvk || "",
        agreement_id: null,
        payment_type: PaymentType.SUBSCRIPTION,
      };

      // Registrar el pago en la base de datos
      const paymentRes = await PaymentService.registerPayment(
        tenant.id,
        paymentData,
      );

      if (!paymentRes) {
        throw new Error("Kon de betaling niet registreren.");
      }

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
        error: error?.message || "Er is een fout opgetreden bij het aanmaken van uw account",
      };
    }
  };
}
