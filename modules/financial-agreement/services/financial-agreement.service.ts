import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  CreateFinancialAgreementInput,
  CreateFinancialAgreementWithDebtorInput,
} from "@/modules/financial-agreement/services/financial-agreement.validators";
import { FAR_REGISTRATION_FEE } from "@/modules/financial-agreement/constants/financial-agreement";
import { NotificationService } from "@/modules/notification/services/notification.service";
import { NotificationType } from "@/modules/notification/constants/notification-type";
import { PaymentService } from "@/modules/payment/services/payment.service";
import { PaymentType } from "@/modules/payment/services/payment.validators";
import { DebtorService } from "@/modules/collection/services/debtor.service";
import { StorageService } from "@/infrastructure/storage/storage.service";
import { ParameterService } from "@/modules/settings/services/parameter/parameter.service";
import { CollectionService } from "@/modules/collection/services/collection.service";

const financialAgreementInclude = {
  debtor: { include: { person: true } },
  contract: true,
  documents: true,
  // Necesario para que la UI (lista y detalle) pueda decidir si "Vervolgen"
  // sigue disponible: si ya escaló, solo debe reactivarse mientras el
  // DebtClaim resultante siga OPEN (mismo criterio que Contract usa con su
  // propio debtClaim.status).
  escalatedToDebtClaim: { select: { id: true, status: true } },
} satisfies Prisma.FinancialAgreementInclude;

type UploadFinancialAgreementDocumentParams = {
  financialAgreementId: string;
  tenantId: string;
  uploadedById?: string;
  fileName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
};

type FinancialAgreementWithInclude = Prisma.FinancialAgreementGetPayload<{
  include: typeof financialAgreementInclude;
}>;

// Decimal no cruza de un Server Action a un Client Component (mismo motivo
// que serializeCaseTransfer/serializeLegalProcess).
function serializeFinancialAgreement<T extends FinancialAgreementWithInclude>(financialAgreement: T) {
  return {
    ...financialAgreement,
    amount: Number(financialAgreement.amount),
  };
}

// FAR (Financiële Afspraken Registreren): servicio independiente y
// preventivo, sin seguimiento ni recordatorios propios. A propósito NO
// escala solo/automáticamente a AOP — eso solo ocurre cuando el
// participante decide manualmente iniciarlo (ver initiateFollowUp más
// abajo, mismo patrón que ContractService.initiateFollowUp), y siempre
// como un DebtClaim nuevo e independiente con su propia tarifa, nunca por
// conversión de tipo del registro FAR.
export class FinancialAgreementService {
  static getById = async (id: string) => {
    const financialAgreement = await prisma.financialAgreement.findUnique({
      where: { id },
      include: financialAgreementInclude,
    });
    return financialAgreement ? serializeFinancialAgreement(financialAgreement) : null;
  };

  static getAllForTenant = async (tenantId: string) => {
    const items = await prisma.financialAgreement.findMany({
      where: { tenantId },
      include: financialAgreementInclude,
      orderBy: { createdAt: "desc" },
    });
    return items.map(serializeFinancialAgreement);
  };

  // Mismo patrón que ContractService.generateContractReference — ahora que
  // Contract usa el prefijo "OVK-", el FAR real recupera el prefijo "FAR-".
  static generateFarReference = async (
    client: Prisma.TransactionClient | typeof prisma = prisma,
  ) => {
    const year = new Date().getFullYear();
    const total = await client.financialAgreement.count();
    return `FAR-${year}-${String(total + 1).padStart(3, "0")}`;
  };

  // ---------------------------------------------------------------------
  // Registro + cobro de la tarifa fija de registro
  // ---------------------------------------------------------------------

  static create = async (
    tenantId: string,
    input: CreateFinancialAgreementInput,
    actorUserId?: string,
  ) => {
    const debtor = await prisma.debtor.findUnique({ where: { id: input.debtorId } });
    if (!debtor) throw new Error("Debiteur niet gevonden.");
    if (debtor.tenant_id !== tenantId) {
      throw new Error("Deze debiteur behoort niet tot uw organisatie.");
    }

    if (input.contractId) {
      const contract = await prisma.contract.findUnique({ where: { id: input.contractId } });
      if (!contract) throw new Error("Overeenkomst niet gevonden.");
    }

    // Mismo patrón que block-check.actions.ts: FAR_REGISTRATION_FEE es el
    // precio neto excl. ABB — el wizard muestra "Totaal te betalen" con el
    // ABB de la isla/tenant encima, así que lo que se cobra vía Sentoo acá
    // tiene que ser exactamente ese mismo total, no el neto.
    const parameter = await ParameterService.getParameterForTenant(tenantId);
    const abbRate = parameter?.abb_rate ?? 0;
    const feeAmount = Number((FAR_REGISTRATION_FEE * (1 + abbRate / 100)).toFixed(2));

    const paymentResult = await PaymentService.create(tenantId, {
      amount: feeAmount,
      currency: input.currency,
      description: `FAR-registratiekosten${input.reference ? ` — ${input.reference}` : ""}`,
      reference: `far_registration_${debtor.id}_${Date.now()}`,
      payment_type: PaymentType.FAR_REGISTRATION,
    });
    if (!paymentResult.success || !paymentResult.data) {
      throw new Error(paymentResult.message || "Kon geen Sentoo-betaling aanmaken.");
    }

    // Reintento por si dos registros simultáneos calculan el mismo número
    // (mismo patrón que ContractService.create) — el pago ya se creó una
    // sola vez arriba, así que el reintento solo cubre el insert del FAR.
    const MAX_ATTEMPTS = 3;
    let financialAgreement;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const farNumber = await this.generateFarReference();
        financialAgreement = await prisma.financialAgreement.create({
          data: {
            tenantId,
            debtorId: input.debtorId,
            contractId: input.contractId ?? null,
            farNumber,
            reference: input.reference,
            description: input.description,
            invoiceDate: input.invoiceDate ?? null,
            dueDate: input.dueDate ?? null,
            amount: input.amount,
            currency: input.currency,
            status: "PENDING_PAYMENT",
            registrationFeePaymentId: paymentResult.data.paymentId,
          },
        });
        break;
      } catch (error) {
        const target =
          error instanceof Prisma.PrismaClientKnownRequestError ? error.meta?.target : undefined;
        const isDuplicateFarNumber =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          (Array.isArray(target) ? target.includes("farNumber") : target === "farNumber");

        if (!isDuplicateFarNumber || attempt === MAX_ATTEMPTS) throw error;
      }
    }
    if (!financialAgreement) throw new Error("Kon FAR niet registreren.");

    return {
      financialAgreementId: financialAgreement.id,
      farNumber: financialAgreement.farNumber,
      paymentId: paymentResult.data.paymentId,
      paymentUrl: paymentResult.data.paymentUrl,
    };
  };

  // ---------------------------------------------------------------------
  // Wizard de alta (4 pasos): crea/reusa el Debtor (Wederpartij) y registra
  // el FAR + documentos adjuntos en un solo submit ("Registreren en
  // betalen"). Reutiliza DebtorService.findOrCreate tal cual — no duplica
  // la lógica de búsqueda/creación de Person+Debtor.
  // ---------------------------------------------------------------------

  static createWithDebtor = async (
    tenantId: string,
    input: CreateFinancialAgreementWithDebtorInput,
    files: Array<{ fileName: string; mimeType: string; size: number; buffer: Buffer }>,
    actorUserId?: string,
  ) => {
    const { debtor } = await DebtorService.findOrCreate(
      {
        person_type: input.debtor.person_type,
        identification_type: input.debtor.identification_type,
        identification: input.debtor.identification,
        fullname: input.debtor.fullname,
        email: input.debtor.email,
        phone: input.debtor.phone,
        address: input.debtor.address,
      },
      tenantId,
    );

    const result = await this.create(
      tenantId,
      { ...input.agreement, debtorId: debtor.id },
      actorUserId,
    );

    for (const file of files) {
      await this.uploadDocument({
        financialAgreementId: result.financialAgreementId,
        tenantId,
        uploadedById: actorUserId,
        ...file,
      });
    }

    return { ...result, debtorId: debtor.id };
  };

  // ---------------------------------------------------------------------
  // Documentos adjuntos (paso "Documenten")
  // ---------------------------------------------------------------------

  static uploadDocument = async (params: UploadFinancialAgreementDocumentParams) => {
    const sanitizedName = `${crypto.randomUUID()}-${params.fileName}`.replace(/\s+/g, "-");
    const folder = `${params.tenantId}/financial-agreements/${params.financialAgreementId}`;
    const storageKey = await StorageService.uploadFile(
      folder,
      sanitizedName,
      params.mimeType,
      params.buffer,
    );

    return prisma.financialAgreementDocument.create({
      data: {
        financialAgreementId: params.financialAgreementId,
        fileName: sanitizedName,
        originalName: params.fileName,
        mimeType: params.mimeType,
        size: params.size,
        storageKey,
        uploadedById: params.uploadedById,
      },
    });
  };

  static getDocuments = async (financialAgreementId: string) => {
    return prisma.financialAgreementDocument.findMany({
      where: { financialAgreementId },
      orderBy: { createdAt: "desc" },
    });
  };

  static getDocumentById = async (documentId: string) => {
    return prisma.financialAgreementDocument.findUnique({ where: { id: documentId } });
  };

  static deleteDocument = async (documentId: string) => {
    const document = await prisma.financialAgreementDocument.findUnique({ where: { id: documentId } });
    if (!document) throw new Error("Document niet gevonden.");

    await StorageService.removeDocument(document.storageKey);
    await prisma.financialAgreementDocument.delete({ where: { id: documentId } });
  };

  // Se llama desde el webhook de Sentoo cuando el Payment FAR_REGISTRATION
  // se confirma como pagado. Único cambio de estado automático que tiene
  // FAR — de ahí en adelante queda REGISTERED sin más movimiento.
  static processRegistrationPaymentConfirmed = async (paymentId: string) => {
    const financialAgreement = await prisma.financialAgreement.findUnique({
      where: { registrationFeePaymentId: paymentId },
      include: { debtor: { include: { person: true } } },
    });
    if (!financialAgreement || financialAgreement.status !== "PENDING_PAYMENT") return;

    const updated = await prisma.financialAgreement.update({
      where: { id: financialAgreement.id },
      data: { status: "REGISTERED", registeredAt: new Date() },
    });

    await NotificationService.notifyTenantStaff(financialAgreement.tenantId, {
      type: NotificationType.FAR_REGISTERED,
      title: "FAR registrado",
      message: `El acuerdo financiero ${
        financialAgreement.reference ?? financialAgreement.id
      } quedó registrado. No requiere seguimiento ni recordatorios.`,
      link: `/financial-agreements/${updated.id}`,
      entity_type: "FinancialAgreement",
      entity_id: updated.id,
    });

    return updated;
  };

  // ---------------------------------------------------------------------
  // Vervolgen (escalar manualmente a AOP) — mismo patrón que
  // ContractService.initiateFollowUp: crea un DebtClaim + verplichting
  // nuevos e independientes (nunca convierte el registro FAR en sí), y deja
  // la referencia en escalatedToDebtClaimId/escalatedAt. Idempotente: si ya
  // hay un DebtClaim vinculado y sigue OPEN sin pagar, reusa la misma
  // obligación en vez de duplicarla.
  // ---------------------------------------------------------------------
  static initiateFollowUp = async (
    financialAgreementId: string,
  ): Promise<{ claimId: string; obligationId: string; amount: number }> => {
    const financialAgreement = await prisma.financialAgreement.findUnique({
      where: { id: financialAgreementId },
    });
    if (!financialAgreement) throw new Error("FAR niet gevonden.");

    if (financialAgreement.status !== "REGISTERED") {
      throw new Error(
        "Alleen geregistreerde FAR-afspraken kunnen het administratieve vervolgingsproces starten.",
      );
    }

    if (financialAgreement.escalatedToDebtClaimId) {
      const existingClaim = await prisma.debtClaim.findUnique({
        where: { id: financialAgreement.escalatedToDebtClaimId },
        include: {
          obligations: {
            where: { beneficiary: "CFSB", type: "COLLECTION", status: "PENDING" },
            take: 1,
          },
        },
      });

      const pendingObligation = existingClaim?.obligations[0];

      if (existingClaim?.status === "OPEN" && pendingObligation) {
        return {
          claimId: existingClaim.id,
          obligationId: pendingObligation.id,
          amount: Number(pendingObligation.balanceAmount),
        };
      }

      throw new Error("Voor deze FAR is het vervolgingsproces al gestart.");
    }

    const pending = await CollectionService.createPendingFromFinancialAgreement(
      {
        amount: financialAgreement.amount,
        reference: financialAgreement.reference,
        tenantId: financialAgreement.tenantId,
      },
      financialAgreement.debtorId,
    );

    if (!pending.success || !pending.claimId || !pending.obligationId) {
      throw new Error(pending.error || "Kon het vervolgingsproces niet starten.");
    }

    await prisma.financialAgreement.update({
      where: { id: financialAgreementId },
      data: { escalatedToDebtClaimId: pending.claimId, escalatedAt: new Date() },
    });

    return {
      claimId: pending.claimId,
      obligationId: pending.obligationId,
      amount: pending.amount ?? 0,
    };
  };
}
