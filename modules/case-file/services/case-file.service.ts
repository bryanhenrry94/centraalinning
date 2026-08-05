import { prisma } from "@/lib/prisma";
import { CaseFileCategory, CASE_FILE_CATEGORY_LABEL } from "@/modules/case-file/constants/case-file-category";

export interface CaseFileItem {
  id: string;
  category: CaseFileCategory;
  categoryLabel: string;
  title: string;
  sourceLabel?: string;
  mimeType?: string;
  size?: number;
  createdAt: Date;
  downloadUrl?: string;
}

// Servicio de agregación virtual del expediente digital: NO crea ninguna
// tabla nueva ni migra documentos existentes (decisión ya tomada en
// docs/plan-alineacion-cfsb.md sección 6, ítem 2.7). Cada tabla original
// (ContractDocument, BlockadeDocument, CaseTransferDocument,
// LegalProcessDocument, VerdictAttachment, LawyerFeeInvoice,
// BailiffFeeInvoice, GopPaymentConfirmation, PaymentTransferVerification)
// sigue siendo la fuente de verdad y el único lugar donde se sube el
// archivo — este servicio solo LEE y reúne, nunca duplica una carga.
export class CaseFileService {
  static getForDebtClaim = async (debtClaimId: string): Promise<CaseFileItem[]> => {
    const debtClaim = await prisma.debtClaim.findUnique({
      where: { id: debtClaimId },
      include: {
        contract: { include: { documents: true } },
        blockade: { include: { documents: true } },
        administrativeCollection: { include: { steps: true } },
        caseTransfers: { include: { documents: true, lawyerFeeInvoices: true } },
        legalProcess: {
          include: {
            documents: true,
            bailiffFeeInvoices: true,
            paymentConfirmations: { include: { payment: true } },
            verdicts: { include: { attachments: true } },
          },
        },
      },
    });
    if (!debtClaim) return [];

    const items: CaseFileItem[] = [];

    // Overeenkomst (Contract)
    if (debtClaim.contract) {
      for (const doc of debtClaim.contract.documents) {
        items.push({
          id: doc.id,
          category: CaseFileCategory.CONTRACT,
          categoryLabel: CASE_FILE_CATEGORY_LABEL[CaseFileCategory.CONTRACT],
          title: doc.file_name,
          sourceLabel: debtClaim.contract.reference_number ?? undefined,
          mimeType: doc.mime_type,
          size: doc.file_size,
          createdAt: doc.created_at,
          downloadUrl: `/api/contracts/documents/${doc.id}/download`,
        });
      }
    }

    // AOP-brieven: no hay PDF persistido, solo el registro de envío por
    // paso — se incluyen como registros del expediente (sin descarga).
    if (debtClaim.administrativeCollection) {
      for (const step of debtClaim.administrativeCollection.steps) {
        if (!step.sentAt) continue;
        items.push({
          id: step.id,
          category: CaseFileCategory.AOP_LETTER,
          categoryLabel: CASE_FILE_CATEGORY_LABEL[CaseFileCategory.AOP_LETTER],
          title: `${step.step} verzonden`,
          createdAt: step.sentAt,
        });
      }
    }

    // Blokkade
    if (debtClaim.blockade) {
      for (const doc of debtClaim.blockade.documents) {
        items.push({
          id: doc.id,
          category: CaseFileCategory.BLOCKADE,
          categoryLabel: CASE_FILE_CATEGORY_LABEL[CaseFileCategory.BLOCKADE],
          title: doc.originalName,
          mimeType: doc.mimeType,
          size: doc.size,
          createdAt: doc.createdAt,
          downloadUrl: `/api/blockades/documents/${doc.id}/download`,
        });
      }
    }

    // Overdrachten (CaseTransfer) + facturas de abogado
    for (const transfer of debtClaim.caseTransfers) {
      for (const doc of transfer.documents) {
        items.push({
          id: doc.id,
          category: CaseFileCategory.TRANSFER,
          categoryLabel: CASE_FILE_CATEGORY_LABEL[CaseFileCategory.TRANSFER],
          title: doc.originalName,
          sourceLabel: doc.category ?? undefined,
          mimeType: doc.mimeType,
          size: doc.size,
          createdAt: doc.createdAt,
          downloadUrl: `/api/legal-processes/transfers/documents/${doc.id}/download`,
        });
      }
      for (const invoice of transfer.lawyerFeeInvoices) {
        items.push({
          id: invoice.id,
          category: CaseFileCategory.LAWYER_INVOICE,
          categoryLabel: CASE_FILE_CATEGORY_LABEL[CaseFileCategory.LAWYER_INVOICE],
          title: invoice.originalName,
          mimeType: invoice.mimeType,
          size: invoice.size,
          createdAt: invoice.createdAt,
          downloadUrl: `/api/legal-processes/invoices/lawyer/${invoice.id}/download`,
        });
      }
    }

    // Gerechtelijk dossier (LegalProcess / GOP)
    if (debtClaim.legalProcess) {
      const lp = debtClaim.legalProcess;

      for (const doc of lp.documents) {
        items.push({
          id: doc.id,
          category: CaseFileCategory.LEGAL_PROCESS,
          categoryLabel: CASE_FILE_CATEGORY_LABEL[CaseFileCategory.LEGAL_PROCESS],
          title: doc.originalName,
          sourceLabel: doc.category ?? undefined,
          mimeType: doc.mimeType,
          size: doc.size,
          createdAt: doc.createdAt,
          downloadUrl: `/api/legal-processes/documents/${doc.id}/download`,
        });
      }

      for (const invoice of lp.bailiffFeeInvoices) {
        items.push({
          id: invoice.id,
          category: CaseFileCategory.BAILIFF_INVOICE,
          categoryLabel: CASE_FILE_CATEGORY_LABEL[CaseFileCategory.BAILIFF_INVOICE],
          title: invoice.originalName,
          mimeType: invoice.mimeType,
          size: invoice.size,
          createdAt: invoice.createdAt,
          downloadUrl: `/api/legal-processes/invoices/bailiff/${invoice.id}/download`,
        });
      }

      for (const confirmation of lp.paymentConfirmations) {
        items.push({
          id: confirmation.id,
          category: CaseFileCategory.PAYMENT_PROOF,
          categoryLabel: CASE_FILE_CATEGORY_LABEL[CaseFileCategory.PAYMENT_PROOF],
          title: confirmation.proofOriginalName,
          sourceLabel: `${confirmation.status} — ${Number(confirmation.payment.total_amount)}`,
          mimeType: confirmation.proofMimeType,
          size: confirmation.proofSize,
          createdAt: confirmation.recordedAt,
          downloadUrl: `/api/legal-processes/payment-confirmations/${confirmation.id}/download`,
        });
      }

      for (const verdict of lp.verdicts) {
        for (const attachment of verdict.attachments) {
          items.push({
            id: attachment.id,
            category: CaseFileCategory.VERDICT,
            categoryLabel: CASE_FILE_CATEGORY_LABEL[CaseFileCategory.VERDICT],
            title: attachment.file_name,
            sourceLabel: verdict.registration_number,
            size: Number(attachment.file_size),
            createdAt: attachment.created_at,
            downloadUrl: `/api/verdicts/attachments/${attachment.id}/download`,
          });
        }
      }
    }

    // Betalingsbewijzen van overschrijvingen (AOP e.a., fuera del GOP).
    const transferVerifications = await prisma.paymentTransferVerification.findMany({
      where: { payment: { obligation: { debtClaimId } } },
    });
    for (const verification of transferVerifications) {
      items.push({
        id: verification.id,
        category: CaseFileCategory.PAYMENT_PROOF,
        categoryLabel: CASE_FILE_CATEGORY_LABEL[CaseFileCategory.PAYMENT_PROOF],
        title: verification.receipt_file_name,
        sourceLabel: verification.decision,
        createdAt: verification.created_at,
        downloadUrl: `/api/payments/transfer-verifications/${verification.id}/download`,
      });
    }

    // FAR y COP: sin documentos propios hoy (FAR no tiene seguimiento
    // activo; COP aún no está construido) — quedan como categorías vacías,
    // listas para poblarse el día que existan sin tocar este servicio.

    return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  };
}
