"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/shared/constants/user-role";
import { PaymentTransferService } from "@/modules/payment/services/payment-transfer.service";
import {
  ALLOWED_RECEIPT_MIME_TYPES,
  MAX_RECEIPT_FILE_SIZE,
  initiateTransferPaymentSchema,
} from "@/modules/payment/services/payment-transfer.validators";

async function requireTenantAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.tenant_id) {
    return { error: "U bent niet ingelogd." } as const;
  }

  if (!session.user.roles?.includes(UserRole.TENANT_ADMIN)) {
    return {
      error: "Alleen een tenantbeheerder kan deze actie uitvoeren.",
    } as const;
  }

  return {
    actingUser: {
      id: session.user.id,
      tenantId: session.user.tenant_id,
      displayName: session.user.fullname || session.user.email || "Onbekend",
    },
  } as const;
}

export async function initiateTransferPayment(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const file = formData.get("file") as File | null;

    const parsed = initiateTransferPaymentSchema.safeParse({
      debtClaimId: formData.get("debtClaimId"),
      tenantId: formData.get("tenantId"),
      debtorEmail: formData.get("debtorEmail"),
      amount: formData.get("amount"),
      referenceNumber: formData.get("referenceNumber"),
    });

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Ongeldige gegevens",
      };
    }

    if (!file) {
      return { success: false, error: "Het betalingsbewijs is verplicht." };
    }

    if (!ALLOWED_RECEIPT_MIME_TYPES.includes(file.type)) {
      return {
        success: false,
        error: "Alleen PDF, PNG, JPG en WEBP bestanden zijn toegestaan.",
      };
    }

    if (file.size > MAX_RECEIPT_FILE_SIZE) {
      return { success: false, error: "Maximale bestandsgrootte is 10 MB." };
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    return PaymentTransferService.initiate({
      ...parsed.data,
      fileName: file.name,
      contentType: file.type,
      fileBuffer,
    });
  } catch (error) {
    console.error("Error in initiateTransferPayment action:", error);
    return { success: false, error: "Er is een fout opgetreden." };
  }
}

export async function getTransferVerificationByToken(token: string) {
  return PaymentTransferService.getByToken(token);
}

export async function approveTransferPayment(
  token: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireTenantAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  return PaymentTransferService.approve(token, auth.actingUser);
}

export async function rejectTransferPayment(
  token: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireTenantAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  return PaymentTransferService.reject(token, auth.actingUser, reason);
}
