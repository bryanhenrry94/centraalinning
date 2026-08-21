import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { StorageService } from "@/infrastructure/storage/storage.service";
import { ObligationService } from "@/modules/collection/services/obligation.service";
import { ClaimTimelineService } from "@/modules/collection/services/claim-timeline.service";
import { CollectiveCollectionService } from "@/modules/collective-follow-up/services/collective-collection.service";
import {
  sendTransferPaymentApprovedEmail,
  sendTransferPaymentReceiptToTenant,
  sendTransferPaymentRejectedEmail,
  sendTransferPaymentVerificationEmail,
} from "@/modules/payment/services/payment-transfer-mail.service";

const TOKEN_TTL_DAYS = 7;
const CLOSED_DEBT_CLAIM_STATUSES = ["SETTLED", "CLOSED", "CANCELLED"];

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

type ActingUser = {
  id: string;
  tenantId: string;
  displayName: string;
};

export class PaymentTransferService {
  static async initiate(input: InitiateTransferPaymentInput): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await CollectiveCollectionService.assertDebtorPaymentAllowed(input.debtClaimId);

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

      if (CLOSED_DEBT_CLAIM_STATUSES.includes(debtClaim.status)) {
        return {
          success: false,
          error:
            "Deze vordering is al afgehandeld en kan niet meer betaald worden.",
        };
      }

      const obligation = await ObligationService.ensurePrincipalDebtObligation(
        input.debtClaimId,
        input.amount,
      );

      if (Number(obligation.balanceAmount) <= 0) {
        return {
          success: false,
          error: "Deze vordering is al volledig betaald.",
        };
      }

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

      await ClaimTimelineService.logEvent(
        input.debtClaimId,
        "PAYMENT_REGISTERED",
        "Betalingsbewijs geüpload door de debiteur, in afwachting van verificatie.",
        { paymentId: payment.id, amount: input.amount },
      );

      if (debtClaim.tenant.contact_email) {
        await sendTransferPaymentVerificationEmail({
          to: debtClaim.tenant.contact_email,
          debtorEmail: input.debtorEmail,
          debtClaimReference: debtClaim.reference || debtClaim.id,
          amount: input.amount,
          referenceNumber: input.referenceNumber,
          token,
          tenantSubdomain: debtClaim.tenant.subdomain,
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
        tenantId: debtClaim?.tenantId || "",
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

  private static async loadVerificationForDecision(token: string) {
    const verification = await prisma.paymentTransferVerification.findUnique({
      where: { token },
      include: {
        payment: {
          include: {
            obligation: {
              include: {
                debtClaim: {
                  include: { debtor: true, tenant: true, administrativeCollection: true },
                },
              },
            },
          },
        },
      },
    });

    if (!verification) {
      return { error: "Verzoek niet gevonden." } as const;
    }

    if (verification.decision !== "PENDING") {
      return { error: "Dit verzoek is al verwerkt." } as const;
    }

    if (verification.token_expires_at < new Date()) {
      return { error: "Dit verzoek is verlopen." } as const;
    }

    return { verification } as const;
  }

  static async approve(
    token: string,
    actingUser: ActingUser,
  ): Promise<{ success: boolean; error?: string }> {
    const result = await this.loadVerificationForDecision(token);
    if ("error" in result) {
      return { success: false, error: result.error };
    }
    const { verification } = result;

    const debtClaim = verification.payment.obligation?.debtClaim;
    if (!debtClaim || debtClaim.tenantId !== actingUser.tenantId) {
      return {
        success: false,
        error: "U heeft geen toegang tot deze betalingsverificatie.",
      };
    }

    await prisma.payment.update({
      where: { id: verification.payment_id },
      data: { status: "paid", paid_at: new Date() },
    });

    const updatedObligation = await ObligationService.applyPayment(
      verification.payment_id,
    );

    await prisma.paymentTransferVerification.update({
      where: { id: verification.id },
      data: {
        decision: "APPROVED",
        decided_at: new Date(),
        decided_by_id: actingUser.id,
        balance_after: updatedObligation.balanceAmount,
      },
    });

    await ClaimTimelineService.logEvent(
      debtClaim.id,
      "PAYMENT_VERIFIED",
      `Betaling van ${Number(verification.payment.total_amount).toFixed(2)} goedgekeurd door ${actingUser.displayName}.`,
      {
        paymentId: verification.payment_id,
        amount: Number(verification.payment.total_amount),
        decidedBy: actingUser.id,
      },
    );

    const debtorEmail = debtClaim.debtor?.email;
    if (debtorEmail) {
      await sendTransferPaymentApprovedEmail({
        to: debtorEmail,
        amount: Number(verification.payment.total_amount),
        debtClaimReference: debtClaim.reference || debtClaim.id,
      });
    }

    if (debtClaim.tenant.contact_email) {
      await sendTransferPaymentReceiptToTenant({
        to: debtClaim.tenant.contact_email,
        amount: Number(verification.payment.total_amount),
        debtClaimReference: debtClaim.reference || debtClaim.id,
        decidedByName: actingUser.displayName,
      });
    }

    if (Number(updatedObligation.balanceAmount) <= 0) {
      await prisma.debtClaim.update({
        where: { id: debtClaim.id },
        data: { status: "SETTLED" },
      });

      if (debtClaim.administrativeCollection) {
        await prisma.administrativeCollection.update({
          where: { id: debtClaim.administrativeCollection.id },
          data: { status: "PAID", finishedAt: new Date() },
        });
      }

      await ClaimTimelineService.logEvent(
        debtClaim.id,
        "STATUS_CHANGED",
        "Vordering volledig betaald.",
        { newStatus: "SETTLED" },
      );

      try {
        await CollectiveCollectionService.checkAndCloseIfSettled(debtClaim.id, actingUser.id);
      } catch (error) {
        console.error("Error checking/closing COP after settled payment:", error);
      }
    }

    return { success: true };
  }

  static async reject(
    token: string,
    actingUser: ActingUser,
    reason?: string,
  ): Promise<{ success: boolean; error?: string }> {
    const result = await this.loadVerificationForDecision(token);
    if ("error" in result) {
      return { success: false, error: result.error };
    }
    const { verification } = result;

    const debtClaim = verification.payment.obligation?.debtClaim;
    if (!debtClaim || debtClaim.tenantId !== actingUser.tenantId) {
      return {
        success: false,
        error: "U heeft geen toegang tot deze betalingsverificatie.",
      };
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
        decided_by_id: actingUser.id,
        rejection_reason: reason || null,
      },
    });

    await ClaimTimelineService.logEvent(
      debtClaim.id,
      "PAYMENT_REJECTED",
      `Betaling afgewezen door ${actingUser.displayName}.${reason ? ` Reden: ${reason}` : ""}`,
      {
        paymentId: verification.payment_id,
        amount: Number(verification.payment.total_amount),
        decidedBy: actingUser.id,
        reason,
      },
    );

    const debtorEmail = debtClaim.debtor?.email;
    if (debtorEmail) {
      await sendTransferPaymentRejectedEmail({
        to: debtorEmail,
        amount: Number(verification.payment.total_amount),
        debtClaimReference: debtClaim.reference || debtClaim.id,
        reason,
      });
    }

    return { success: true };
  }
}
