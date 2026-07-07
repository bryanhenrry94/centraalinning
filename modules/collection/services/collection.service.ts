import { ContractService } from "@/modules/contract/services/contract.service";
import { prisma } from "@/lib/prisma";
import { ParameterService } from "@/modules/settings/services/parameter/parameter.service";
import { PersonType } from "@/shared/constants/person-type";
import { CollectionNotificationService } from "@/modules/collection/services/collection-notification.service";
import { DebtClaimFilter, DebtClaimResponse } from "./collection.type";
import { MailService } from "@/infrastructure/mail/mail.service";
import { ParameterInput } from "@/modules/settings/services/parameter/parameter.type";
import { SentooService } from "@/infrastructure/sentoo/sentoo.service";
import { PaymentCreate } from "@/modules/payment/services/payment.validators";
import { PaymentService } from "@/modules/payment/services/payment.service";
import { DebtClaimCreate, DebtClaimCreateSchema } from "./collection.validators";

export class CollectionService {
  static createFromContract = async (
    contract: Awaited<ReturnType<typeof ContractService.getById>>,
    debtorId: string,
  ) => {
    if (!contract) throw new Error("Contract not found");

    const [parameter, debtor] = await Promise.all([
      ParameterService.getParameter(),
      prisma.debtor.findUnique({
        where: { id: debtorId },
        include: { person: true },
      }),
    ]);

    if (!parameter) throw new Error("No se encontró el parámetro");
    if (!debtor) throw new Error("Deudor no encontrado");

    const principalAmount = Number(contract.amount);
    if (principalAmount <= 0) throw new Error("Invalid contract amount");

    const calculations = this.calculateAmounts(principalAmount, parameter);

    const claimData: DebtClaimCreate = {
      debtorId,
      reference: await this.generateClaimReference(),
      description: contract.reference_number || "",
      principalAmount,
      currentAmount: calculations.totalDue,
      currency: "USD",
      origin: "FAR",
      status: "IN_PROGRESS",
    };

    return this.create(claimData, contract.tenant_id);
  };

  private static calculateAmounts(amount: number, parameter: ParameterInput) {
    let feeAmount = Number(
      ((amount * parameter.collection_fee_rate) / 100).toFixed(2),
    );
    if (feeAmount < parameter.collection_fee_minimum_amount) {
      feeAmount = parameter.collection_fee_minimum_amount;
    }

    const abbAmount = Number(
      ((feeAmount * parameter.abb_rate) / 100).toFixed(2),
    );

    const totalDue = Number(
      (amount + feeAmount + abbAmount + parameter.digital_file_costs).toFixed(2),
    );

    const totalToReceive = Number(
      (amount - feeAmount - abbAmount - parameter.digital_file_costs).toFixed(2),
    );

    return {
      feeRate: parameter.collection_fee_rate,
      feeAmount,
      abbRate: parameter.abb_rate,
      abbAmount,
      digitalFileCosts: parameter.digital_file_costs,
      totalDue,
      totalToReceive,
    };
  }

  private static async calculateDeadline(
    personType: PersonType,
    startDate: Date,
  ): Promise<Date> {
    const days = await CollectionNotificationService.getNotificationDays(
      "REMINDER",
      personType,
    );
    const daysToAdd = typeof days === "number" && !isNaN(days) ? days : 0;
    return new Date(startDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  }

  private static buildChatRoomName(
    first_name?: string,
    last_name?: string,
    business_name?: string,
    reference?: string,
  ) {
    const name =
      `${first_name ?? ""} ${last_name ?? ""}`.trim() || business_name || "";
    return `${name} - ${reference}`;
  }

  static async create(data: Partial<DebtClaimCreate>, tenantId: string) {
    const parsedData = DebtClaimCreateSchema.parse(data);

    if (parsedData.principalAmount <= 0) {
      throw new Error("El monto principal debe ser mayor a cero");
    }

    const [tenant, parameter, debtor] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      ParameterService.getParameter(),
      prisma.debtor.findUnique({
        where: { id: parsedData.debtorId },
        include: { person: true },
      }),
    ]);

    if (!tenant) throw new Error("Tenant not found");
    if (!parameter) throw new Error("Parameter not found");
    if (!debtor) throw new Error("Debtor not found");

    const personType =
      (debtor.person?.person_type as PersonType) || PersonType.INDIVIDUAL;

    const calculations = this.calculateAmounts(
      parsedData.principalAmount,
      parameter,
    );

    const startedAt = new Date();
    const deadline = await this.calculateDeadline(personType, startedAt);
    const reference =
      parsedData.reference ?? (await this.generateClaimReference());

    const result = await prisma.$transaction(async (tx) => {
      const claim = await tx.debtClaim.create({
        data: {
          tenantId,
          debtorId: parsedData.debtorId,
          reference,
          description: parsedData.description,
          principalAmount: parsedData.principalAmount,
          currentAmount: calculations.totalDue,
          currency: parsedData.currency ?? "USD",
          origin: parsedData.origin ?? "MANUAL",
          status: "IN_PROGRESS",
        },
      });

      // Cargos por servicio AOP
      await tx.claimCharge.createMany({
        data: [
          {
            debtClaimId: claim.id,
            service: "AOP",
            concept: "Honorarios de cobranza",
            amount: calculations.feeAmount,
            percentage: calculations.feeRate,
            status: "PENDING",
          },
          {
            debtClaimId: claim.id,
            service: "AOP",
            concept: "ABB (belasting)",
            amount: calculations.abbAmount,
            percentage: calculations.abbRate,
            status: "PENDING",
          },
          ...(calculations.digitalFileCosts > 0
            ? [
                {
                  debtClaimId: claim.id,
                  service: "AOP" as const,
                  concept: "Digitaal dossier",
                  amount: calculations.digitalFileCosts,
                  status: "PENDING" as const,
                },
              ]
            : []),
        ],
      });

      const aop = await tx.administrativeCollection.create({
        data: {
          debtClaimId: claim.id,
          status: "ACTIVE",
          startedAt,
        },
      });

      await tx.administrativeCollectionStep.create({
        data: {
          collectionId: aop.id,
          step: "REMINDER",
          status: "IN_PROGRESS",
          sentAt: startedAt,
          deadline,
        },
      });

      await tx.chatRoom.create({
        data: {
          tenant_id: tenantId,
          debtClaimId: claim.id,
          name: this.buildChatRoomName(
            debtor.person?.first_name || "",
            debtor.person?.last_name || "",
            debtor.person?.business_name || "",
            reference,
          ),
        },
      });

      await tx.claimTimeline.create({
        data: {
          debtClaimId: claim.id,
          event: "CLAIM_CREATED",
          description: `Claim aangemaakt — AOP gestart (${reference})`,
        },
      });

      return claim;
    });

    const totalWithTax = Number(
      (
        parsedData.principalAmount +
        calculations.feeAmount +
        calculations.abbAmount
      ).toFixed(2),
    );

    const sentooResponse = await SentooService.createTransaction({
      amount: totalWithTax,
      description: `Betaling voor aanmaning ${reference}`,
      reference,
    });

    if (!sentooResponse?.success || !sentooResponse?.payment?.url) {
      throw new Error(sentooResponse?.error || "Kon de betaling niet aanmaken.");
    }

    const paymentData: PaymentCreate = {
      debtClaim_id: result.id,
      method: "TRANSFER",
      total_amount: totalWithTax,
      paid_at: null,
      status: "pending",
      contract_id: null,
      provider: "sentoo",
      provider_ref: sentooResponse.payment.id,
      provider_payload: JSON.stringify(sentooResponse.raw),
      reference_number: reference,
      agreement_id: null,
      payment_type: "COLLECTION",
    };

    const paymentRes = await PaymentService.registerPayment(tenantId, paymentData);
    if (!paymentRes) throw new Error("Kon de betaling niet registreren.");

    try {
      await Promise.all([
        MailService.sendPaymentLinkEmail(
          tenant.contact_email,
          tenant.name,
          sentooResponse.payment.url,
          calculations.feeAmount,
          reference,
        ),
        CollectionNotificationService.sendAanmaning(result.id),
      ]);
    } catch (error) {
      console.error("Post-create notification error", error);
    }

    return result;
  }

  static generateClaimReference = async () => {
    const year = new Date().getFullYear();
    const total = await prisma.debtClaim.count();
    return `AOP-${year}-${String(total + 1).padStart(3, "0")}`;
  };

  static getAll = async (
    params: DebtClaimFilter,
  ): Promise<DebtClaimResponse[]> => {
    const claims = await prisma.debtClaim.findMany({
      where: { ...params },
      orderBy: { createdAt: "desc" },
      include: {
        debtor: { include: { person: true } },
      },
    });

    return claims.map((c: any) => ({
      id: c.id,
      tenantId: c.tenantId,
      debtorId: c.debtorId,
      reference: c.reference,
      description: c.description,
      principalAmount: Number(c.principalAmount),
      currentAmount: Number(c.currentAmount),
      currency: c.currency,
      origin: c.origin,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      closedAt: c.closedAt,
      debtor: {
        id: c.debtor.id,
        fullname:
          `${c.debtor.person?.first_name ?? ""} ${c.debtor.person?.last_name ?? ""}`.trim() ||
          c.debtor.person?.business_name ||
          "",
        email: c.debtor.email ?? "",
        total_income: c.debtor.total_income ?? 0,
      },
    }));
  };
}
