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
import { computeDebtClaimBalances } from "@/modules/collection/utils/debt-claim-balance";
import { ObligationService } from "@/modules/collection/services/obligation.service";
import { CollectiveCollectionService } from "@/modules/collective-follow-up/services/collective-collection.service";
import { ClaimTimelineService } from "@/modules/collection/services/claim-timeline.service";
import { PaymentService } from "@/modules/payment/services/payment.service";
import { PaymentType } from "@/modules/payment/services/payment.validators";
import { NotificationService } from "@/modules/notification/services/notification.service";
import { NotificationType } from "@/modules/notification/constants/notification-type";
import { formatAmount } from "@/shared/utils/formatters";

// Descripciones exactas de las obligaciones COLLECTION/CFSB creadas por
// applyNoResponseFee — únicas usadas también por collection-mail.service.tsx
// para identificar el recargo por falta de reacción (nunca por posición en
// el array de obligations, que también incluye "AOP-activeringskosten" y
// "AOP-kosten" con el mismo type/beneficiary).
export const NO_RESPONSE_FEE_DESCRIPTION = {
  REMINDER: "Aanvullende kosten na aanmaning",
  FINAL_NOTICE: "Aanvullende kosten na sommatie",
} as const;

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
    if (!contract) throw new Error("Overeenkomst niet gevonden");

    const principalAmount = Number(contract.amount);
    if (principalAmount <= 0) throw new Error("Ongeldig overeenkomstbedrag");

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
    tenantId: string,
  ): Promise<Date> {
    const days = await CollectionNotificationService.getNotificationDays(
      "REMINDER",
      personType,
      tenantId,
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

    // Tarifa configurable por isla/tenant (punto 9 del análisis CFSB) — antes
    // hardcodeada en 15/6, lo que la desconectaba silenciosamente de
    // Setting/Jurisdiction en cuanto el Superadministrador cambiara el valor.
    // Reusa calculateAmounts (la misma cuenta que activate() usa para los
    // ClaimCharge) para que la obligación CFSB no quede desincronizada del
    // monto realmente facturado — antes esta cuenta se repetía acá sin el
    // costo de dossier digital ni el piso mínimo de comisión.
    const parameter = await ParameterService.getParameterForTenant(tenantId);
    if (!parameter) {
      return { success: false, error: "Parameter not found" };
    }
    const { feeAmount, abbAmount, digitalFileCosts } = this.calculateAmounts(
      principalAmount,
      parameter,
    );
    // El participante paga esta comisión a CFSB al registrar el AOP (incluye
    // el ABB, un impuesto de CFSB al participante). El deudor paga el MISMO
    // monto completo a CFSB, por separado — dos obligaciones/pagos
    // independientes, sin reembolso entre ellos (pedido del sponsor).
    const cfsbFeeTotal = Number((feeAmount + abbAmount + digitalFileCosts).toFixed(2));

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

      // Deuda original: el deudor le paga al participante.
      await tx.debtClaimObligation.create({
        data: {
          debtClaimId: claim.id,
          type: "PRINCIPAL_DEBT",
          beneficiary: "PARTICIPANT",
          payer: "DEBTOR",
          description: "Hoofdsom",
          originalAmount: parsedData.principalAmount,
          paidAmount: 0,
          balanceAmount: parsedData.principalAmount,
          status: "PENDING",
        },
      });

      // Comisión CFSB del participante — se paga vía Sentoo al registrar el
      // AOP (ver PaymentService.create más abajo, payment_type: COLLECTION).
      const cfsbObligation = await tx.debtClaimObligation.create({
        data: {
          debtClaimId: claim.id,
          type: "COLLECTION",
          beneficiary: "CFSB",
          payer: "PARTICIPANT",
          description: "AOP-activeringskosten",
          originalAmount: cfsbFeeTotal,
          paidAmount: 0,
          balanceAmount: cfsbFeeTotal,
          status: "PENDING",
        },
      });

      // Comisión CFSB del deudor — mismo monto, pago separado (ver
      // CollectionService.requestDebtorCollectionFeePayment).
      await tx.debtClaimObligation.create({
        data: {
          debtClaimId: claim.id,
          type: "COLLECTION",
          beneficiary: "CFSB",
          payer: "DEBTOR",
          description: "AOP-kosten",
          originalAmount: cfsbFeeTotal,
          paidAmount: 0,
          balanceAmount: cfsbFeeTotal,
          status: "PENDING",
        },
      });

      return { claimId: claim.id, obligationId: cfsbObligation.id };
    });

    return { success: true, claimId, obligationId, amount: cfsbFeeTotal };
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

    // Plazos y tarifas AOP por isla/jurisdicción del tenant (punto 13 del
    // análisis CFSB).
    const parameter = await ParameterService.getParameterForTenant(claim.tenantId);
    if (!parameter) throw new Error("Parameter not found");

    const personType =
      (claim.debtor.person?.person_type as PersonType) || PersonType.INDIVIDUAL;
    const calculations = this.calculateAmounts(
      Number(claim.principalAmount),
      parameter,
    );
    const startedAt = new Date();
    const deadline = await this.calculateDeadline(personType, startedAt, claim.tenantId);
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
      include: {
        debtor: { include: { person: true } },
        charges: { orderBy: { id: "desc" } },
        obligations: { orderBy: { createdAt: "desc" } },
      },
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
      charges: claim.charges.map((c) => ({
        id: c.id,
        service: c.service,
        concept: c.concept,
        amount: Number(c.amount),
        percentage: c.percentage ? Number(c.percentage) : null,
        status: c.status,
      })),
      obligations: claim.obligations.map((o) => ({
        id: o.id,
        type: o.type,
        beneficiary: o.beneficiary,
        payer: o.payer,
        originalAmount: Number(o.originalAmount),
        paidAmount: Number(o.paidAmount),
        balanceAmount: Number(o.balanceAmount),
        status: o.status,
        createdAt: o.createdAt,
      })),
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

          await tx.claimService.create({
            data: {
              debtClaimId,
              service: "BLK",
              status: "IN_PROGRESS",
              startedAt: new Date(),
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
      // Timeout explícito: el paso DEFAULT_NOTICE -> BLK_NOTIFICATION suma
      // pasos extra (Blockade + ClaimService) a esta misma transacción, y
      // contra la DB remota el default de Prisma (5000ms) a veces no alcanza
      // ("Transaction already closed" / "expired transaction") — mismo
      // ajuste que ya usan otras transacciones largas (ver legal-process.service.ts).
    }, { timeout: 20000, maxWait: 10000 });

    return { nextStep };
  };

  // ¿El deudor ya pagó algo de su deuda directamente (transferencia
  // verificada por el tenant), sin necesidad de un Agreement formal? Usado
  // para NO aplicar el recargo administrativo por falta de respuesta
  // (process_aop_workflow.ts) cuando el deudor sí reaccionó pagando, aunque
  // nunca haya registrado un acuerdo de pago — antes solo se chequeaba
  // `hasAgreement`, dejando pasar este caso.
  static hasPrincipalPayment = async (debtClaimId: string): Promise<boolean> => {
    const obligation = await prisma.debtClaimObligation.findFirst({
      where: {
        debtClaimId,
        type: "PRINCIPAL_DEBT",
        beneficiary: "PARTICIPANT",
      },
    });
    return !!obligation && Number(obligation.paidAmount) > 0;
  };

  // Recargo administrativo por falta de respuesta del deudor dentro del
  // plazo de la aanmaning o la sommatie (punto 9 del análisis CFSB). A
  // diferencia de la comisión de cobranza (ClaimCharge, a cargo del
  // deudor pero facturada al participante), este recargo es una
  // obligación del deudor directamente CON CFSB — mismo patrón que la
  // obligación CFSB creada en `createPending` (beneficiary: CFSB).
  // Configurable por isla/tenant vía Setting (aanmaning_no_response_fee /
  // sommatie_no_response_fee), sin valor por defecto hardcodeado en el job.
  static applyNoResponseFee = async (
    debtClaimId: string,
    step: "REMINDER" | "FINAL_NOTICE",
    amount: number,
  ) => {
    if (amount <= 0) return null;

    const stepLabel = step === "REMINDER" ? "de aanmaning" : "de sommatie";
    // Etiqueta que ve el deudor en el diálogo de pago CFSB — debe explicar
    // POR QUÉ surgió el costo, no solo decir "extra kosten N".
    const description = NO_RESPONSE_FEE_DESCRIPTION[step];

    return prisma.$transaction(async (tx) => {
      const obligation = await tx.debtClaimObligation.create({
        data: {
          debtClaimId,
          type: "COLLECTION",
          beneficiary: "CFSB",
          // Obligación del deudor directamente con CFSB (no la paga el
          // participante en ningún momento, a diferencia de la comisión del
          // AOP).
          payer: "DEBTOR",
          description,
          originalAmount: amount,
          paidAmount: 0,
          balanceAmount: amount,
          status: "PENDING",
        },
      });

      await tx.claimTimeline.create({
        data: {
          debtClaimId,
          event: "AOP_STEP_COMPLETED",
          description: `Administratieve boete van ${formatAmount(amount)} toegevoegd (geen reactie van de debiteur op ${stepLabel}).`,
        },
      });

      return obligation;
    });
  };

  static getAll = async (
    params: DebtClaimFilter,
  ): Promise<DebtClaimResponse[]> => {
    const { excludeOrigin, ...filters } = params;

    const claims = await prisma.debtClaim.findMany({
      where: {
        ...filters,
        ...(excludeOrigin?.length ? { origin: { notIn: excludeOrigin } } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        debtor: { include: { person: true } },
        administrativeCollection: {
          include: {
            steps: { orderBy: { id: "desc" }, take: 1 },
          },
        },
        obligations: {
          select: {
            beneficiary: true,
            payer: true,
            originalAmount: true,
            balanceAmount: true,
            status: true,
            payments: {
              where: { status: { in: ["pending", "failed"] } },
              select: { payment_url: true },
              take: 1,
            },
          },
        },
        agreements: {
          orderBy: { created_at: "desc" },
          select: { status: true },
        },
        legalProcess: { select: { id: true } },
        collectiveCollection: { select: { id: true } },
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

      // El link de pago que se muestra en /collections es el del
      // participante (su propia comisión CFSB) — la comisión CFSB del
      // deudor es una obligación aparte (payer: DEBTOR) que el deudor
      // gestiona desde /payments.
      const cfsbPendingObligation = c.obligations.find(
        (o: any) => o.beneficiary === "CFSB" && o.payer === "PARTICIPANT" && o.status === "PENDING",
      );
      const { receivableBalance } = computeDebtClaimBalances(
        c.obligations.map((o: any) => ({
          beneficiary: o.beneficiary,
          payer: o.payer,
          originalAmount: Number(o.originalAmount),
          balanceAmount: Number(o.balanceAmount),
        })),
      );

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
        paymentLink: cfsbPendingObligation?.payments[0]?.payment_url ?? null,
        receivableBalance,
        agreementStatus,
        legalProcessId: c.legalProcess?.id ?? null,
        collectiveCollectionId: c.collectiveCollection?.id ?? null,
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
        payer: "PARTICIPANT",
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

  // ---------------------------------------------------------------------
  // Comisión CFSB del deudor — pago separado del que hace el participante
  // (mismo monto, canal Sentoo independiente, pedido del sponsor).
  // ---------------------------------------------------------------------

  // Un expediente puede tener MÁS DE UNA obligación CFSB a cargo del
  // deudor: la del registro del AOP, y eventuales recargos posteriores por
  // falta de respuesta a la aanmaning/sommatie (ver applyNoResponseFee,
  // que crea una obligación nueva por cada recargo — nunca modifica la
  // original). Por eso esto devuelve todas las pendientes, no solo una.
  static getDebtorCollectionFeeObligations = async (debtClaimId: string) => {
    const obligations = await prisma.debtClaimObligation.findMany({
      where: {
        debtClaimId,
        type: "COLLECTION",
        beneficiary: "CFSB",
        payer: "DEBTOR",
      },
      orderBy: { createdAt: "asc" },
      include: {
        payments: {
          where: { status: { in: ["pending", "failed"] } },
          select: { payment_url: true },
          orderBy: { created_at: "desc" },
          take: 1,
        },
      },
    });

    return obligations.map((obligation) => ({
      obligationId: obligation.id,
      description: obligation.description ?? "CFSB-kosten",
      balanceAmount: Number(obligation.balanceAmount),
      status: obligation.status,
      paymentUrl: obligation.payments[0]?.payment_url ?? null,
    }));
  };

  // Un solo pago que cubre TODAS las obligaciones CFSB pendientes del
  // deudor a la vez (registro del AOP + eventuales recargos) — el deudor ve
  // un único botón "Nu betalen" por el total combinado; administrativamente
  // cada obligación se sigue rastreando por separado vía PaymentAllocation
  // (ver ObligationService.applyAllocatedPayment).
  static requestDebtorCollectionFeePayment = async (
    debtClaimId: string,
    actorUserId: string,
  ) => {
    const debtClaim = await prisma.debtClaim.findUnique({
      where: { id: debtClaimId },
      include: { debtor: true, tenant: true },
    });
    if (!debtClaim) throw new Error("Dossier niet gevonden.");
    if (debtClaim.debtor.user_id !== actorUserId) {
      throw new Error("Alleen de debiteur zelf kan deze actie uitvoeren.");
    }
    await CollectiveCollectionService.assertDebtorPaymentAllowed(debtClaimId);

    const obligations = await prisma.debtClaimObligation.findMany({
      where: {
        debtClaimId,
        type: "COLLECTION",
        beneficiary: "CFSB",
        payer: "DEBTOR",
        balanceAmount: { gt: 0 },
      },
    });
    if (obligations.length === 0) {
      throw new Error("Geen openstaande CFSB-kosten voor dit dossier.");
    }

    const totalAmount = Number(
      obligations.reduce((sum, o) => sum + Number(o.balanceAmount), 0).toFixed(2),
    );

    const paymentResult = await PaymentService.create(debtClaim.tenantId, {
      amount: totalAmount,
      currency: debtClaim.currency,
      description: `CFSB-kosten — dossier ${debtClaim.reference ?? debtClaimId}`,
      reference: `debtor_collection_fee_${debtClaimId}_${Date.now()}`,
      payment_type: PaymentType.DEBTOR_COLLECTION_FEE,
    });
    if (!paymentResult.success || !paymentResult.data) {
      throw new Error(paymentResult.message || "Kon geen Sentoo-betaling aanmaken.");
    }

    await prisma.paymentAllocation.createMany({
      data: obligations.map((o) => ({
        payment_id: paymentResult.data!.paymentId,
        obligation_id: o.id,
        component: "OTHER",
        amount: o.balanceAmount,
      })),
    });

    return {
      paymentId: paymentResult.data.paymentId,
      paymentUrl: paymentResult.data.paymentUrl,
    };
  };
}

// Confirmación del pago (consolidado) de la(s) comisión(es) CFSB del
// DEUDOR — a diferencia de processCollectionPayment (comisión del
// participante), esto NO activa el AOP (ya está activo) ni genera factura
// al tenant (la factura de CFSB es del participante, no del deudor). Aplica
// el pago a cada obligación cubierta vía PaymentAllocation, no a una sola.
export const processDebtorCollectionFeePayment = async (paymentId: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { allocations: { include: { obligation: { include: { debtClaim: true } } } } },
  });
  if (!payment) throw new Error("Payment not found");
  if (payment.allocations.length === 0) {
    throw new Error("Geen toewijzingen gevonden voor deze betaling");
  }
  if (payment.status !== "paid") return;

  await ObligationService.applyAllocatedPayment(paymentId);

  const debtClaim = payment.allocations[0].obligation.debtClaim;
  await ClaimTimelineService.logEvent(
    debtClaim.id,
    "PAYMENT_REGISTERED",
    `Debiteur heeft de CFSB-kosten betaald voor dossier ${debtClaim.reference ?? debtClaim.id}.`,
  );

  try {
    await NotificationService.notifyTenantStaff(debtClaim.tenantId, {
      type: NotificationType.DEBTOR_COLLECTION_FEE_PAID,
      title: "Debiteur betaalde CFSB-kosten",
      message: `De debiteur van dossier ${debtClaim.reference ?? debtClaim.id} heeft de CFSB-kosten rechtstreeks betaald.`,
      link: `/collections/${debtClaim.id}`,
      entity_type: "DebtClaim",
      entity_id: debtClaim.id,
    });
  } catch (error) {
    console.error("Error notifying tenant staff of debtor collection fee payment:", error);
  }
};

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

  if (payment.obligation.type === "COLLECTION" && payment.status === "paid") {
    // Marca la obligación CFSB como pagada (paidAmount/balanceAmount/status)
    // — sin esto la obligación queda PENDING para siempre aunque el pago ya
    // se haya confirmado, y el saldo del deudor/cliente nunca refleja el pago.
    await ObligationService.applyPayment(paymentId);

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
