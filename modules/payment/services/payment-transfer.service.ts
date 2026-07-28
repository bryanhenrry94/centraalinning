import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { StorageService } from "@/infrastructure/storage/storage.service";
import { ObligationService } from "@/modules/collection/services/obligation.service";
import {
  sendTransferPaymentApprovedEmail,
  sendTransferPaymentRejectedEmail,
  sendTransferPaymentVerificationEmail,
} from "@/modules/payment/services/payment-transfer-mail.service";

const TOKEN_TTL_DAYS = 7;

type InitiateTransferPaymentInput = {
  tenantId: string;
  debtClaimId: string;
  debtorEmail: string;
  amount: number;
  referenceNumber: string;
  fileName: string;
  contentType: string;
  fileBuffer: Buffer;
};

export class PaymentTransferService {
  static async initiate(input: InitiateTransferPaymentInput): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const pendingVerification =
        await prisma.paymentTransferVerification.findFirst({
          where: {
            decision: "PENDING",
            payment: { obligation: { debtClaimId: input.debtClaimId } },
          },
        });

      if (pendingVerification) {
        return {
          success: false,
          error:
            "Er is al een betalingsbewijs in behandeling voor deze vordering.",
        };
      }

      const debtClaim = await prisma.debtClaim.findUnique({
        where: { id: input.debtClaimId },
        include: { tenant: true },
      });

      if (!debtClaim) {
        return { success: false, error: "Vordering niet gevonden." };
      }

      const obligation = await ObligationService.ensurePrincipalDebtObligation(
        input.debtClaimId,
        input.amount,
      );

      const sanitizedName = input.fileName
        .replace(/\s+/g, "-")
        .replace(/[^\w.-]/g, "");
      const folder = `${input.tenantId}/debt-claims/${input.debtClaimId}/transfers`;
      const filePath = await StorageService.uploadFile(
        folder,
        sanitizedName,
        input.contentType,
        input.fileBuffer,
      );

      const payment = await prisma.payment.create({
        data: {
          tenant_id: input.tenantId,
          obligation_id: obligation.id,
          total_amount: input.amount,
          status: "pending",
          method: "TRANSFER",
          payment_type: "DEBT_PAYMENT",
          reference_number: input.referenceNumber,
        },
      });

      const token = randomUUID();
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setDate(tokenExpiresAt.getDate() + TOKEN_TTL_DAYS);

      await prisma.paymentTransferVerification.create({
        data: {
          payment_id: payment.id,
          receipt_file_path: filePath,
          receipt_file_name: sanitizedName,
          token,
          token_expires_at: tokenExpiresAt,
          decision: "PENDING",
        },
      });

      if (debtClaim.tenant.contact_email) {
        await sendTransferPaymentVerificationEmail({
          to: debtClaim.tenant.contact_email,
          debtorEmail: input.debtorEmail,
          debtClaimReference: debtClaim.reference || debtClaim.id,
          amount: input.amount,
          referenceNumber: input.referenceNumber,
          token,
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Error initiating transfer payment:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      };
    }
  }

  static async getByToken(token: string) {
    const verification = await prisma.paymentTransferVerification.findUnique({
      where: { token },
      include: {
        payment: {
          include: {
            obligation: {
              include: {
                debtClaim: {
                  include: { debtor: true, tenant: true },
                },
              },
            },
          },
        },
      },
    });

    if (!verification) {
      return { success: false as const, error: "not_found" as const };
    }

    if (verification.token_expires_at < new Date()) {
      return { success: false as const, error: "expired" as const };
    }

    const receiptUrl = await StorageService.getDocumentUrl(
      verification.receipt_file_path,
    );

    const debtClaim = verification.payment.obligation?.debtClaim;

    return {
      success: true as const,
      data: {
        decision: verification.decision,
        payment: {
          totalAmount: Number(verification.payment.total_amount),
          referenceNumber: verification.payment.reference_number,
        },
        debtClaim: {
          reference: debtClaim?.reference || debtClaim?.id || "",
        },
        receiptUrl,
      },
    };
  }

  static async approve(token: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const verification = await prisma.paymentTransferVerification.findUnique({
      where: { token },
      include: {
        payment: {
          include: {
            obligation: { include: { debtClaim: { include: { debtor: true } } } },
          },
        },
      },
    });

    if (!verification) {
      return { success: false, error: "Verzoek niet gevonden." };
    }

    if (verification.decision !== "PENDING") {
      return { success: false, error: "Dit verzoek is al verwerkt." };
    }

    if (verification.token_expires_at < new Date()) {
      return { success: false, error: "Dit verzoek is verlopen." };
    }

    await prisma.payment.update({
      where: { id: verification.payment_id },
      data: { status: "paid", paid_at: new Date() },
    });

    await prisma.paymentTransferVerification.update({
      where: { id: verification.id },
      data: { decision: "APPROVED", decided_at: new Date() },
    });

    await ObligationService.applyPayment(verification.payment_id);

    const debtorEmail = verification.payment.obligation?.debtClaim?.debtor?.email;
    if (debtorEmail) {
      await sendTransferPaymentApprovedEmail({
        to: debtorEmail,
        amount: Number(verification.payment.total_amount),
        debtClaimReference:
          verification.payment.obligation?.debtClaim?.reference ||
          verification.payment.obligation?.debtClaim?.id ||
          "",
      });
    }

    return { success: true };
  }

  static async reject(
    token: string,
    reason?: string,
  ): Promise<{ success: boolean; error?: string }> {
    const verification = await prisma.paymentTransferVerification.findUnique({
      where: { token },
      include: {
        payment: {
          include: {
            obligation: { include: { debtClaim: { include: { debtor: true } } } },
          },
        },
      },
    });

    if (!verification) {
      return { success: false, error: "Verzoek niet gevonden." };
    }

    if (verification.decision !== "PENDING") {
      return { success: false, error: "Dit verzoek is al verwerkt." };
    }

    if (verification.token_expires_at < new Date()) {
      return { success: false, error: "Dit verzoek is verlopen." };
    }

    await prisma.payment.update({
      where: { id: verification.payment_id },
      data: { status: "failed" },
    });

    await prisma.paymentTransferVerification.update({
      where: { id: verification.id },
      data: {
        decision: "REJECTED",
        decided_at: new Date(),
        rejection_reason: reason || null,
      },
    });

    const debtorEmail = verification.payment.obligation?.debtClaim?.debtor?.email;
    if (debtorEmail) {
      await sendTransferPaymentRejectedEmail({
        to: debtorEmail,
        amount: Number(verification.payment.total_amount),
        debtClaimReference:
          verification.payment.obligation?.debtClaim?.reference ||
          verification.payment.obligation?.debtClaim?.id ||
          "",
        reason,
      });
    }

    return { success: true };
  }
}
