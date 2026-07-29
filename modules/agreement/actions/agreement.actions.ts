"use server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/infrastructure/mail/resend-client";
import { Agreement, CreateAgreement, AgreementResponse } from "@/modules/agreement/services/agreement.validators";
import { AgreementStatus } from "@/modules/agreement/constants/agreement-status";
import { AgreementService } from "@/modules/agreement/services/agreement.service";
import { TenantService } from "@/modules/tenant/services/tenant.service";
import { UserRole } from "@/shared/constants/user-role";

type PaymentAgreementFilter = {
  debtClaim_id?: string;
  tenant_id?: string;
  status?: AgreementStatus;
  debtor_id?: string;
};

// El acuerdo solo pasa a ACCEPTED/REJECTED cuando lo decide el tenant, nunca
// el propio deudor. Sin esto, cualquier sesión autenticada podía invocar el
// server action directamente y autoaprobar su solicitud.
async function requireTenantStaff(agreementId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenant_id) {
    throw new Error("U bent niet ingelogd.");
  }

  if (session.user.roles?.includes(UserRole.DEBTOR)) {
    throw new Error(
      "Alleen medewerkers kunnen een betalingsregeling goedkeuren, afwijzen of aanpassen.",
    );
  }

  const existing = await AgreementService.getById(agreementId);
  if (!existing || existing.tenant_id !== session.user.tenant_id) {
    throw new Error("Betalingsregeling niet gevonden.");
  }
}

export const getPaymentAgreements = async (
  filter?: Partial<PaymentAgreementFilter>,
): Promise<AgreementResponse[]> => {
  const result = await AgreementService.getAll(filter);
  revalidatePath("/dashboard/agreements");
  return result;
};

export const createPaymentAgreement = async (
  tenant_id: string,
  data: CreateAgreement,
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.tenant_id !== tenant_id) {
    throw new Error("U bent niet ingelogd voor deze tenant.");
  }

  const result = await AgreementService.create(tenant_id, data, session.user.id);
  revalidatePath(`/dashboard/claims/${data.debtClaim_id}`);
  return result;
};

export const deletePaymentAgreement = async (id: string) => {
  await requireTenantStaff(id);
  await AgreementService.delete(id);
  revalidatePath("/dashboard/agreements");
};

export const updatePaymentAgreement = async (id: string, data: Partial<Agreement>) => {
  await requireTenantStaff(id);
  const result = await AgreementService.update(id, data);
  revalidatePath("/dashboard/agreements");
  return result;
};

export const existsPaymentAgreement = async (debtClaim_id: string): Promise<boolean> => {
  return AgreementService.existsAccepted(debtClaim_id);
};

export const getPaymentAgreementById = async (id: string): Promise<Agreement | null> => {
  return AgreementService.getById(id);
};

export const countPaymentAgreementsByCliam = async (debtClaim_id: string): Promise<number> => {
  return AgreementService.countByClaimId(debtClaim_id);
};

export const getInstallmentsByAgreement = async (agreement_id: string) => {
  return AgreementService.getInstallmentsByAgreementId(agreement_id);
};

export const hasAgreement = async (debtClaim_id: string): Promise<boolean> => {
  return AgreementService.hasAccepted(debtClaim_id);
};

export const hasPaymentsUpToDate = async (debtClaim_id: string): Promise<boolean> => {
  return AgreementService.hasPaymentsUpToDate(debtClaim_id);
};

export const cancelAgreementsByCliam = async (debtClaim_id: string) => {
  return AgreementService.cancelByClaim(debtClaim_id);
};

export const getAgreementsByDebtClaimId = async (
  debtClaim_id: string,
): Promise<AgreementResponse[]> => {
  return AgreementService.getAllByDebtClaimId(debtClaim_id);
};

export const getAgreementByDebtClaimId = async (
  debtClaim_id: string,
): Promise<AgreementResponse | null> => {
  return AgreementService.getByDebtClaimId(debtClaim_id);
};

export const notifyApprovalAgreement = async (agreement_id: string) => {
  const agreement = await AgreementService.getById(agreement_id);
  if (!agreement) throw new Error("Agreement not found");
  if (!agreement.debtor_id) throw new Error("Agreement has no debtor associated");

  const tenant = agreement.tenant_id ? await TenantService.getById(agreement.tenant_id) : null;

  sendEmail({
    to: tenant?.contact_email || "",
    subject: `Betalingsovereenkomst Goedgekeurd: ${agreement.total_amount} over ${agreement.installments_count} termijnen`,
    html: "Aprobado",
  });
};
