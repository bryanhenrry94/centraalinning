import { ContractService } from "@/modules/contract/services/contract.service";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ParameterService } from "@/modules/settings/services/parameter/parameter.service";
import { PersonType } from "@/shared/constants/person-type";
import { CollectionNotificationService } from "@/modules/collection/services/collection-notification.service";
import { DebtClaimFilter, DebtClaimResponse } from "./collection.type";
import { ParameterInput } from "@/modules/settings/services/parameter/parameter.type";
import {
  DebtClaim,
  DebtClaimCreate,
  DebtClaimCreateSchema,
  DebtClaimSchema,
  DebtClaimView,
} from "./collection.validators";
import { InvoiceService } from "@/modules/payment/services/invoice-service";
import { sendInvoiceEmail } from "@/actions/email";
import { AOP_STEP_CONFIG } from "@/modules/collection/utils/debt-claim-status";

export class CollectionService {
  /**
   * Crea un DebtClaim en estado OPEN (pre-pago) a partir de un Contract (FAR),
   * junto con su obligación de cobranza. No activa el AOP: eso ocurre cuando
   * el webhook confirma el pago de la obligación (ver `processCollectionPayment`).
   */
  static createPendingFromContract = async (
    contract: Awaited<ReturnType<typeof ContractService.getById>>,
    debtorId: string,
  ) => {
    if (!contract) throw new Error("Contract not found");

    const principalAmount = Number(contract.amount);
    if (principalAmount <= 0) throw new Error("Invalid contract amount");

    const claimData: DebtClaimCreate = {
      debtorId,
      externalReference: contract.reference_number || null,
      principalAmount,
      currency: "USD",
      origin: "FAR",
      status: "OPEN",
    };

    return this.createPending(claimData, contract.tenant_id);
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
      (amount + feeAmount + abbAmount + parameter.digital_file_costs).toFixed(
        2,
      ),
    );

    const totalToReceive = Number(
      (amount - feeAmount - abbAmount - parameter.digital_file_costs).toFixed(
        2,
      ),
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

  /**
   * Genereert de interne DebtClaim-referentie (bijv. "AOP-2026-001").
   * Accepteert optioneel een transactieclient zodat de telling consistent
   * blijft binnen dezelfde transactie als de create.
   *
   * De sequence is per prefix/origin: een BLK-claim krijgt bijv. een eigen
   * "BLK-2026-NNN"-reeks, geteld op basis van bestaande claims met origin
   * "BLK", los van de algemene "AOP-"-reeks.
   */
  static generateClaimReference = async (
    client: Prisma.TransactionClient | typeof prisma = prisma,
    options?: { prefix?: string; origin?: Prisma.DebtClaimWhereInput["origin"] },
  ) => {
    const prefix = options?.prefix ?? "AOP";
    const year = new Date().getFullYear();
    const total = await client.debtClaim.count(
      options?.origin ? { where: { origin: options.origin } } : undefined,
    );
    return `${prefix}-${year}-${String(total + 1).padStart(3, "0")}`;
  };

  /**
   * Crea un DebtClaim en estado OPEN (pre-pago).
   * No genera cargos, AOP ni notificaciones — eso ocurre en `activate`.
   */
  static async createPending(
    data: DebtClaimCreate,
    tenantId: string,
  ): Promise<{
    success: boolean;
    error?: string;
    claimId?: string;
    obligationId?: string;
    amount?: number;
  }> {
    const parsedData = DebtClaimCreateSchema.parse(data);

    const [tenant, debtor] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.debtor.findUnique({ where: { id: parsedData.debtorId } }),
    ]);

    if (!tenant) return { success: false, error: "Tenant not found" };
    if (!debtor) return { success: false, error: "Debtor not found" };

    const principalAmount = Number(parsedData.principalAmount);
    if (principalAmount <= 0) {
      return {
        success: false,
        error: "Principal amount must be greater than 0",
      };
    }

    const feeAmount = Number(((principalAmount * 15) / 100).toFixed(2));
    const abbAmount = Number(((feeAmount * 6) / 100).toFixed(2));

    const { claimId, obligationId } = await prisma.$transaction(async (tx) => {
      // De AOP-referentie wordt altijd door het systeem gegenereerd, nooit
      // overgenomen van gebruikersinvoer. Het factuur-/contractnummer dat de
      // gebruiker registreert komt terecht in `externalReference`.
      const reference = await this.generateClaimReference(tx);

      const claim = await tx.debtClaim.create({
        data: {
          tenantId,
          debtorId: parsedData.debtorId,
          reference,
          externalReference: parsedData.externalReference ?? null,
          description: parsedData.description,
          principalAmount: parsedData.principalAmount,
          currency: parsedData.currency ?? "USD",
          origin: parsedData.origin ?? "MANUAL",
          status: "OPEN",
        },
      });

      await tx.debtClaimObligation.create({
        data: {
          debtClaimId: claim.id,
          type: "PRINCIPAL_DEBT",
          beneficiary: "PARTICIPANT",
          originalAmount: parsedData.principalAmount,
          paidAmount: 0,
          balanceAmount: parsedData.principalAmount,
          status: "PENDING",
        },
      });

      const cfsbObligation = await tx.debtClaimObligation.create({
        data: {
          debtClaimId: claim.id,
          type: "COLLECTION",
          beneficiary: "CFSB",
          originalAmount: feeAmount + abbAmount,
          paidAmount: 0,
          balanceAmount: feeAmount + abbAmount,
          status: "PENDING",
        },
      });

      return { claimId: claim.id, obligationId: cfsbObligation.id };
    });

    return { success: true, claimId, obligationId, amount: feeAmount + abbAmount };
  }

  /**
   * Activa un DebtClaim luego de confirmar el pago.
   * Crea cargos, AOP, chat room, timeline, servicios y envía la aanmaning.
   * Es idempotente: si ya está activo, no hace nada.
   */
  static async activate(claimId: string): Promise<void> {
    const claim = await prisma.debtClaim.findUnique({
      where: { id: claimId },
      include: { debtor: { include: { person: true } }, tenant: true },
    });

    if (!claim) throw new Error(`DebtClaim ${claimId} not found`);

    if (claim.status !== "OPEN") {
      console.warn(
        `DebtClaim ${claimId} ya activado (status: ${claim.status})`,
      );
      return;
    }

    const parameter = await ParameterService.getParameter();
    if (!parameter) throw new Error("Parameter not found");

    const personType =
      (claim.debtor.person?.person_type as PersonType) || PersonType.INDIVIDUAL;
    const calculations = this.calculateAmounts(
      Number(claim.principalAmount),
      parameter,
    );
    const startedAt = new Date();
    const deadline = await this.calculateDeadline(personType, startedAt);
    const reference = claim.reference ?? claimId;

    await prisma.$transaction(async (tx) => {
      await tx.debtClaim.update({
        where: { id: claimId },
        data: { status: "IN_PROGRESS" },
      });

      await tx.claimCharge.createMany({
        data: [
          {
            debtClaimId: claimId,
            service: "AOP",
            concept: "Honorarios de cobranza",
            amount: calculations.feeAmount,
            percentage: calculations.feeRate,
            status: "PENDING",
          },
          {
            debtClaimId: claimId,
            service: "AOP",
            concept: "ABB (belasting)",
            amount: calculations.abbAmount,
            percentage: calculations.abbRate,
            status: "PENDING",
          },
          ...(calculations.digitalFileCosts > 0
            ? [
                {
                  debtClaimId: claimId,
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
        data: { debtClaimId: claimId, status: "ACTIVE", startedAt },
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
          tenant_id: claim.tenantId,
          debtClaimId: claimId,
          name: this.buildChatRoomName(
            claim.debtor.person?.first_name || "",
            claim.debtor.person?.last_name || "",
            claim.debtor.person?.business_name || "",
            reference,
          ),
        },
      });

      await tx.claimTimeline.create({
        data: {
          debtClaimId: claimId,
          event: "CLAIM_CREATED",
          description: `Claim aangemaakt — AOP gestart (${reference})`,
        },
      });

      await tx.claimService.createMany({
        data: [
          ...(claim.origin === "FAR"
            ? [
                {
                  debtClaimId: claimId,
                  service: "FAR" as const,
                  status: "COMPLETED" as const,
                  startedAt,
                  finishedAt: startedAt,
                },
              ]
            : []),
          {
            debtClaimId: claimId,
            service: "AOP" as const,
            status: "IN_PROGRESS" as const,
            startedAt,
          },
        ],
      });
    });

    await CollectionNotificationService.sendAanmaning(claimId);
  }

  static async create(
    data: DebtClaimCreate,
    tenantId: string,
  ): Promise<{ success: boolean; error?: string; collection?: DebtClaim }> {
    const pendingResult = await this.createPending(data, tenantId);
    if (!pendingResult.success || !pendingResult.claimId) {
      return { success: false, error: pendingResult.error };
    }

    try {
      await this.activate(pendingResult.claimId);
    } catch (error) {
      console.error("Error activating claim", error);
      return {
        success: false,
        error: "Kon de collection case niet activeren.",
      };
    }

    const claim = await prisma.debtClaim.findUnique({
      where: { id: pendingResult.claimId },
    });

    if (!claim) {
      return { success: false, error: "Kon de collection case niet ophalen." };
    }

    return {
      success: true,
      collection: {
        id: claim.id,
        tenantId: claim.tenantId,
        debtorId: claim.debtorId,
        reference: claim.reference,
        externalReference: claim.externalReference,
        description: claim.description,
        principalAmount: Number(claim.principalAmount),
        currency: claim.currency,
        origin: claim.origin,
        status: claim.status,
        createdAt: claim.createdAt,
        updatedAt: claim.updatedAt,
        closedAt: claim.closedAt,
      },
    };
  }

  static getById = async (id: string): Promise<DebtClaim> => {
    const claim = await prisma.debtClaim.findUnique({ where: { id } });
    if (!claim) throw new Error("DebtClaim not found");
    return {
      id: claim.id,
      tenantId: claim.tenantId,
      debtorId: claim.debtorId,
      reference: claim.reference,
      externalReference: claim.externalReference,
      description: claim.description,
      principalAmount: Number(claim.principalAmount),
      currency: claim.currency,
      origin: claim.origin,
      status: claim.status,
      createdAt: claim.createdAt,
      updatedAt: claim.updatedAt,
      closedAt: claim.closedAt,
    };
  };

  static getViewById = async (id: string): Promise<DebtClaimView> => {
    const claim = await prisma.debtClaim.findUnique({
      where: { id },
      include: { debtor: { include: { person: true } } },
    });
    if (!claim) throw new Error("DebtClaim not found");
    return {
      id: claim.id,
      tenantId: claim.tenantId,
      debtorId: claim.debtorId,
      reference: claim.reference,
      externalReference: claim.externalReference,
      description: claim.description,
      principalAmount: Number(claim.principalAmount),
      currency: claim.currency,
      origin: claim.origin,
      status: claim.status,
      createdAt: claim.createdAt,
      updatedAt: claim.updatedAt,
      closedAt: claim.closedAt,
      debtor: {
        id: claim.debtor.id,
        fullname:
          `${claim.debtor.person?.first_name ?? ""} ${claim.debtor.person?.last_name ?? ""}`.trim() ||
          claim.debtor.person?.business_name ||
          "",
        email: claim.debtor.email ?? "",
      },
    };
  };

  static update = async (id: string, data: Partial<DebtClaim>) => {
    const parsedData = DebtClaimSchema.partial().parse(data);
    const { id: _id, ...rest } = parsedData as any;
    const filtered = Object.fromEntries(
      Object.entries(rest).filter(([_, v]) => v !== undefined),
    );
    return prisma.debtClaim.update({ where: { id }, data: filtered });
  };

  static advanceAOPStep = async (debtClaimId: string) => {
    const aop = await prisma.administrativeCollection.findUnique({
      where: { debtClaimId },
      include: {
        steps: { orderBy: { id: "desc" }, take: 1 },
        debtClaim: { include: { debtor: { include: { person: true } } } },
      },
    });

    if (!aop) throw new Error("AdministrativeCollection not found");

    const currentStep = aop.steps[0];

    const nextStepMap: Record<
      string,
      "REMINDER" | "FINAL_NOTICE" | "DEFAULT_NOTICE" | "BLK_NOTIFICATION" | null
    > = {
      REMINDER: "FINAL_NOTICE",
      FINAL_NOTICE: "DEFAULT_NOTICE",
      DEFAULT_NOTICE: "BLK_NOTIFICATION",
      BLK_NOTIFICATION: null,
    };

    const nextStep = currentStep ? nextStepMap[currentStep.step] : "REMINDER";

    await prisma.$transaction(async (tx) => {
      if (currentStep) {
        await tx.administrativeCollectionStep.update({
          where: { id: currentStep.id },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
      }

      if (nextStep) {
        await tx.administrativeCollectionStep.create({
          data: {
            collectionId: aop.id,
            step: nextStep,
            sentAt: new Date(),
            status: "IN_PROGRESS",
          },
        });
      } else {
        await tx.administrativeCollection.update({
          where: { id: aop.id },
          data: { status: "CLOSED", finishedAt: new Date() },
        });
      }

      if (
        nextStep === "BLK_NOTIFICATION" ||
        (!nextStep && currentStep?.step === "DEFAULT_NOTICE")
      ) {
        // Genereert het formele Blockade-record voor deze vordering. Geen
        // betaling nodig: dit is een automatisch gevolg van het AOP-proces,
        // direct ACTIVE. La tabla Blockade (vía releasedAt) es la única
        // fuente de verdad para "está bloqueado", ya no existe person.has_blockade.
        const existingBlockade = await tx.blockade.findUnique({
          where: { originDebtClaimId: debtClaimId },
        });

        if (!existingBlockade) {
          await tx.blockade.create({
            data: {
              tenantId: aop.debtClaim.tenantId,
              debtorId: aop.debtClaim.debtorId,
              reason: "UNPAID_PAYMENT",
              registeredAt: new Date(),
              status: "ACTIVE",
              originDebtClaimId: debtClaimId,
            },
          });
        }
      }

      const currentStepLabel = currentStep
        ? AOP_STEP_CONFIG[currentStep.step].label
        : "start";
      const nextStepLabel = nextStep ? AOP_STEP_CONFIG[nextStep].label : null;

      await tx.claimTimeline.create({
        data: {
          debtClaimId,
          event: nextStep ? "AOP_STEP_COMPLETED" : "AOP_COMPLETED",
          description: nextStepLabel
            ? `Stap ${currentStepLabel} voltooid, volgende: ${nextStepLabel}`
            : "AOP-proces afgerond",
        },
      });
    });
  };

  static getAll = async (
    params: DebtClaimFilter,
  ): Promise<DebtClaimResponse[]> => {
    const claims = await prisma.debtClaim.findMany({
      where: { ...params },
      orderBy: { createdAt: "desc" },
      include: {
        debtor: { include: { person: true } },
        administrativeCollection: {
          include: {
            steps: { orderBy: { id: "desc" }, take: 1 },
          },
        },
        obligations: {
          where: { beneficiary: "CFSB", status: "PENDING" },
          include: {
            payments: {
              where: { status: { in: ["pending", "failed"] } },
              select: { payment_url: true },
              take: 1,
            },
          },
          take: 1,
        },
        agreements: {
          orderBy: { created_at: "desc" },
          select: { status: true },
        },
        legalProcess: { select: { id: true } },
      },
    });

    return claims.map((c: any) => {
      // El estado que se muestra en el listado es el ACCEPTED vigente si
      // existe; si no, el de la solicitud más reciente (para señalar que
      // hay algo pendiente de revisión).
      const agreementStatus =
        c.agreements?.find((a: any) => a.status === "ACCEPTED")?.status ??
        c.agreements?.[0]?.status ??
        null;

      return {
        id: c.id,
        tenantId: c.tenantId,
        debtorId: c.debtorId,
        reference: c.reference,
        externalReference: c.externalReference,
        description: c.description,
        principalAmount: Number(c.principalAmount),
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
        aopStep: c.administrativeCollection?.steps[0]?.step ?? null,
        paymentLink: c.obligations[0]?.payments[0]?.payment_url ?? null,
        agreementStatus,
        legalProcessId: c.legalProcess?.id ?? null,
      };
    });
  };

  static getPaymentLinkFromDebtClaimId = async (
    debtClaimId: string,
  ): Promise<string | null> => {
    const obligation = await prisma.debtClaimObligation.findFirst({
      where: {
        debtClaimId,
        beneficiary: "CFSB",
        status: "PENDING",
      },
      include: {
        payments: {
          where: { status: "pending" },
          select: { payment_url: true },
          take: 1,
        },
      },
    });

    return obligation?.payments[0]?.payment_url ?? null;
  };
}

export const processCollectionPayment = async (paymentId: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      obligation: {
        include: {
          debtClaim: {
            include: {
              tenant: true,
            },
          },
        },
      },
    },
  });

  if (!payment) throw new Error("Payment not found");

  if (!payment.obligation || !payment.obligation.debtClaim) {
    throw new Error("Obligation or DebtClaim not found for the payment");
  }

  // await ObligationService.applyPayment(paymentId);

  if (payment.obligation.type === "COLLECTION" && payment.status === "paid") {
    // Activa el claim: IN_PROGRESS + cargos + AOP + chat + aanmaning
    await CollectionService.activate(payment.obligation.debtClaim.id);

    // Generar factura y enviar email al tenant
    const invoiceData = await InvoiceService.generateInvoiceData(payment.id);
    const invoice = await InvoiceService.createInvoice(invoiceData);

    if (payment.obligation.debtClaim.tenant.contact_email) {
      await sendInvoiceEmail(
        payment.obligation.debtClaim.tenant.contact_email,
        invoice.id,
        true,
      );
    } else {
      console.warn(
        `Tenant ${payment.obligation.debtClaim.tenantId} has no contact email`,
      );
    }
  }
};
