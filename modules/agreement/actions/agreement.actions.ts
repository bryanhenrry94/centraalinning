"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Agreement, CreateAgreement, AgreementResponse } from "@/modules/agreement/services/agreement.validators";
import { sendEmail } from "@/infrastructure/mail/resend-client";
import { AgreementStatus } from "@/modules/agreement/constants/agreement-status";
import { InstallmentStatus } from "@/modules/agreement/constants/installment-status";

type PaymentAgreementFilter = {
  debtClaim_id?: string;
  tenant_id?: string;
  status?: AgreementStatus;
  debtor_id?: string;
};

export const getPaymentAgreements = async (
  filter?: Partial<PaymentAgreementFilter>,
): Promise<AgreementResponse[]> => {
  const agreements = await prisma.agreement.findMany({
    where: { ...filter },
    include: {
      debtor: { include: { person: true } },
      debtClaim: true,
    },
  });

  revalidatePath("/dashboard/agreements");
  return agreements.map((a: any) => ({
    id: a.id,
    tenant_id: a.tenant_id,
    debtClaim_id: a.debtClaim_id,
    total_amount: Number(a.total_amount),
    installment_amount: Number(a.installment_amount),
    installments_count: a.installments_count,
    start_date: a.start_date,
    end_date: a.end_date,
    status: String(a.status),
    created_at: a.created_at ?? undefined,
    updated_at: a.updated_at ?? undefined,
    debtor_id: a.debtor_id ?? undefined,
    comment: a.comment ?? undefined,
    debtor: a.debtor
      ? {
          id: a.debtor.id,
          fullname:
            `${a.debtor.person?.first_name ?? ""} ${a.debtor.person?.last_name ?? ""}`.trim() ||
            a.debtor.person?.business_name ||
            "",
          email: a.debtor.email ?? undefined,
        }
      : undefined,
  }));
};

export const createPaymentAgreement = async (
  tenant_id: string,
  data: CreateAgreement,
) => {
  const newAgreement = await prisma.agreement.create({
    data: {
      tenant_id,
      debtClaim_id: data.debtClaim_id,
      total_amount: data.total_amount,
      installment_amount: data.installment_amount,
      installments_count: data.installments_count,
      start_date: data.start_date,
      end_date: data.end_date,
      status: AgreementStatus.PENDING,
      debtor_id: data.debtor_id,
    },
  });

  for (let i = 0; i < data.installments_count; i++) {
    const installmentDate = new Date(data.start_date);
    installmentDate.setMonth(installmentDate.getMonth() + i);
    await prisma.agreementInstallment.create({
      data: {
        agreement_id: newAgreement.id,
        number: i + 1,
        due_date: installmentDate,
        amount: data.installment_amount,
        status: InstallmentStatus.PENDING,
      },
    });
  }

  revalidatePath(`/dashboard/claims/${data.debtClaim_id}`);
  return {
    id: newAgreement.id,
    debtClaim_id: newAgreement.debtClaim_id,
    total_amount: Number(newAgreement.total_amount),
    installment_amount: Number(newAgreement.installment_amount),
    installments_count: newAgreement.installments_count,
    start_date: newAgreement.start_date,
    status: String(newAgreement.status),
    created_at: newAgreement.created_at ?? undefined,
    updated_at: newAgreement.updated_at ?? undefined,
    debtor_id: newAgreement.debtor_id ?? undefined,
  };
};

export const deletePaymentAgreement = async (id: string) => {
  await prisma.agreementInstallment.deleteMany({ where: { agreement_id: id } });
  await prisma.agreement.delete({ where: { id } });
  revalidatePath("/dashboard/agreements");
};

export const updatePaymentAgreement = async (
  id: string,
  data: Partial<Agreement>,
) => {
  const updateData: {
    total_amount?: number;
    installment_amount?: number;
    installments_count?: number;
    start_date?: Date;
    status?: AgreementStatus;
    debtor_id?: string | null;
    comment?: string;
  } = {};

  if (data.total_amount !== undefined) updateData.total_amount = data.total_amount;
  if (data.installment_amount !== undefined) updateData.installment_amount = data.installment_amount;
  if (data.installments_count !== undefined) updateData.installments_count = data.installments_count;
  if (data.start_date !== undefined) updateData.start_date = data.start_date;
  if (data.status !== undefined) updateData.status = data.status as unknown as AgreementStatus;
  if (data.debtor_id !== undefined) updateData.debtor_id = data.debtor_id ?? null;
  if (data.comment !== undefined) updateData.comment = data.comment ?? "";

  const updated = await prisma.agreement.update({ where: { id }, data: updateData });

  if (updateData.installments_count) {
    await prisma.agreementInstallment.deleteMany({ where: { agreement_id: id } });
    for (let i = 0; i < updateData.installments_count; i++) {
      const d = new Date(updateData.start_date || updated.start_date);
      d.setMonth(d.getMonth() + i);
      await prisma.agreementInstallment.create({
        data: {
          agreement_id: id,
          number: i + 1,
          due_date: d,
          amount: Number(updateData.installment_amount),
          status: InstallmentStatus.PENDING,
        },
      });
    }
  }

  revalidatePath("/dashboard/agreements");
  return {
    id: updated.id,
    debtClaim_id: updated.debtClaim_id,
    total_amount: Number(updated.total_amount),
    installment_amount: Number(updated.installment_amount),
    installments_count: updated.installments_count,
    start_date: updated.start_date,
    status: String(updated.status),
    created_at: updated.created_at ?? undefined,
    updated_at: updated.updated_at ?? undefined,
    debtor_id: updated.debtor_id ?? undefined,
  };
};

export const existsPaymentAgreement = async (debtClaim_id: string): Promise<boolean> => {
  const count = await prisma.agreement.count({
    where: { debtClaim_id, status: AgreementStatus.ACCEPTED },
  });
  return count > 0;
};

export const getPaymentAgreementById = async (id: string): Promise<Agreement | null> => {
  const a = await prisma.agreement.findUnique({ where: { id } });
  if (!a) return null;
  return {
    id: a.id,
    debtClaim_id: a.debtClaim_id,
    tenant_id: a.tenant_id,
    total_amount: Number(a.total_amount),
    installment_amount: Number(a.installment_amount),
    installments_count: a.installments_count,
    start_date: a.start_date,
    end_date: a.end_date,
    status: String(a.status),
    created_at: a.created_at ?? undefined,
    updated_at: a.updated_at ?? undefined,
    debtor_id: a.debtor_id ?? undefined,
  };
};

export const countPaymentAgreementsByCliam = async (debtClaim_id: string): Promise<number> => {
  return prisma.agreement.count({ where: { debtClaim_id } });
};

export const getInstallmentsByAgreement = async (agreement_id: string) => {
  const installments = await prisma.agreementInstallment.findMany({
    where: { agreement_id },
  });
  return installments.map((i: any) => ({
    id: i.id,
    agreement_id: i.agreement_id,
    number: i.number,
    due_date: i.due_date,
    amount: Number(i.amount),
    status: String(i.status),
    created_at: i.created_at ?? undefined,
    updated_at: i.updated_at ?? undefined,
  }));
};

export const hasAgreement = async (debtClaim_id: string): Promise<boolean> => {
  try {
    const a = await prisma.agreement.findFirst({
      where: { debtClaim_id, status: AgreementStatus.ACCEPTED },
    });
    return !!a;
  } catch {
    return false;
  }
};

export const hasPaymentsUpToDate = async (debtClaim_id: string): Promise<boolean> => {
  try {
    const a = await prisma.agreement.findFirst({
      where: { debtClaim_id, status: AgreementStatus.ACCEPTED },
      include: { installments: true },
    });
    if (!a) return false;
    const today = new Date();
    for (const inst of a.installments) {
      if (inst.due_date <= today && inst.status !== InstallmentStatus.PAID) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
};

export const cancelAgreementsByCliam = async (debtClaim_id: string) => {
  await prisma.agreement.updateMany({
    where: { debtClaim_id, status: AgreementStatus.ACCEPTED },
    data: { status: AgreementStatus.CANCELLED },
  });
};

export const getAgreementsByDebtClaimId = async (
  debtClaim_id: string,
): Promise<AgreementResponse[]> => {
  const agreements = await prisma.agreement.findMany({
    where: { debtClaim_id },
    include: { debtor: { include: { person: true } }, debtClaim: true },
  });

  return agreements.map((a: any) => ({
    id: a.id,
    tenant_id: a.tenant_id,
    debtClaim_id: a.debtClaim_id,
    total_amount: Number(a.total_amount),
    installment_amount: Number(a.installment_amount),
    installments_count: a.installments_count,
    start_date: a.start_date,
    end_date: a.end_date,
    status: String(a.status),
    created_at: a.created_at ?? undefined,
    updated_at: a.updated_at ?? undefined,
    debtor_id: a.debtor_id ?? undefined,
    comment: a.comment ?? undefined,
    debtor: a.debtor
      ? {
          id: a.debtor.id,
          fullname:
            `${a.debtor.person?.first_name ?? ""} ${a.debtor.person?.last_name ?? ""}`.trim() ||
            a.debtor.person?.business_name ||
            "",
          email: a.debtor.email ?? undefined,
        }
      : undefined,
  }));
};

export const getAgreementByDebtClaimId = async (
  debtClaim_id: string,
): Promise<AgreementResponse | null> => {
  const a = await prisma.agreement.findFirst({
    where: { debtClaim_id },
    include: { debtor: { include: { person: true } }, debtClaim: true },
  });
  if (!a) return null;

  return {
    id: a.id,
    tenant_id: a.tenant_id,
    debtClaim_id: a.debtClaim_id,
    total_amount: Number(a.total_amount),
    installment_amount: Number(a.installment_amount),
    installments_count: a.installments_count,
    start_date: a.start_date,
    end_date: a.end_date,
    status: String(a.status),
    created_at: a.created_at ?? undefined,
    updated_at: a.updated_at ?? undefined,
    debtor_id: a.debtor_id ?? undefined,
    comment: a.comment ?? undefined,
    debtor: a.debtor
      ? {
          id: a.debtor.id,
          fullname:
            `${a.debtor.person?.first_name ?? ""} ${a.debtor.person?.last_name ?? ""}`.trim() ||
            a.debtor.person?.business_name ||
            "",
          email: a.debtor.email ?? undefined,
        }
      : undefined,
  };
};

export const notifyApprovalAgreement = async (agreement_id: string) => {
  const agreement = await getPaymentAgreementById(agreement_id);
  if (!agreement) throw new Error("Agreement not found");
  if (!agreement.debtor_id) throw new Error("Agreement has no debtor associated");

  const debtor = await prisma.debtor.findUnique({
    where: { id: agreement.debtor_id },
    include: { person: true },
  });
  if (!debtor) throw new Error("Debtor not found");
  if (!debtor.email) throw new Error("Debtor has no email");

  const debtorName =
    debtor.person?.first_name || debtor.person?.last_name
      ? `${debtor.person?.first_name ?? ""} ${debtor.person?.last_name ?? ""}`.trim()
      : debtor.person?.business_name || "Debtor";

  sendEmail({
    to: debtor.email,
    subject: `Betalingsovereenkomst Goedgekeurd: ${agreement.total_amount} over ${agreement.installments_count} termijnen`,
    html: "Aprobado",
  });
};
