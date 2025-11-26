"use server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import {
  Agreement,
  CreateAgreement,
  AgreementResponse,
} from "@/lib/validations/agreement";
import { $Enums } from "@/prisma/generated/prisma";

type PaymentAgreementFilter = {
  debt_id?: string;
  tenant_id?: string;
  status?: $Enums.AgreementStatus;
  debtor_id?: string;
};

export const getPaymentAgreements = async (
  filter?: Partial<PaymentAgreementFilter>
): Promise<AgreementResponse[]> => {
  const agreements = await prisma.agreement.findMany({
    where: { ...filter },
    include: {
      debtor: {
        include: {
          person: true,
        },
      },
      debt: true,
    },
  });

  revalidatePath("/dashboard/agreements");
  return agreements.map((agreement) => ({
    id: agreement.id,
    tenant_id: agreement.tenant_id,
    debt_id: agreement.debt_id ?? undefined,
    total_amount: Number(agreement.total_amount),
    installment_amount: Number(agreement.installment_amount),
    installments_count: agreement.installments_count,
    start_date: agreement.start_date,
    end_date: agreement.end_date,
    status: String(agreement.status),
    created_at: agreement.created_at ?? undefined,
    updated_at: agreement.updated_at ?? undefined,
    debtor_id: agreement.debtor_id ?? undefined,
    comment: agreement.comment ?? undefined,
    debtor: agreement.debtor
      ? {
          id: agreement.debtor.id,
          fullname:
            agreement.debtor.person?.first_name +
              " " +
              agreement.debtor.person?.last_name ||
            agreement.debtor.person?.business_name ||
            "",
          email: agreement.debtor.email ?? undefined,
        }
      : undefined,
  }));
};

export const createPaymentAgreement = async (
  tenant_id: string,
  data: CreateAgreement
) => {
  const newAgreement = await prisma.agreement.create({
    data: {
      tenant_id: tenant_id,
      debt_id: data.debt_id ?? undefined,
      total_amount: data.total_amount,
      installment_amount: data.installment_amount,
      installments_count: data.installments_count,
      start_date: data.start_date,
      end_date: data.end_date,
      status: $Enums.AgreementStatus.PENDING,
      debtor_id: data.debtor_id,
    },
  });

  // recorre el numero de cuotas y crea las cuotas correspondientes
  for (let i = 0; i < data.installments_count; i++) {
    const installmentDate = new Date(data.start_date);
    installmentDate.setMonth(installmentDate.getMonth() + i);

    await prisma.agreementInstallment.create({
      data: {
        agreement_id: newAgreement.id,
        number: i + 1,
        due_date: installmentDate,
        amount: data.installment_amount,
        status: $Enums.InstallmentStatus.PENDING,
      },
    });
  }

  revalidatePath(`/dashboard/collection-cases/${data.debt_id}`);
  return {
    id: newAgreement.id,
    debt_id: newAgreement.debt_id ?? undefined,
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
  // primero elimina las cuotas asociadas al acuerdo de pago
  await prisma.agreementInstallment.deleteMany({
    where: { agreement_id: id },
  });

  // luego elimina el acuerdo de pago
  const agreement = await prisma.agreement.delete({
    where: { id },
  });

  revalidatePath(`/dashboard/collection-cases`);
  return;
};

export const updatePaymentAgreement = async (
  id: string,
  data: Partial<Agreement>
) => {
  // Build an update object with only the fields that Prisma allows to be updated
  const updateData: {
    total_amount?: number;
    installment_amount?: number;
    installments_count?: number;
    start_date?: Date;
    status?: $Enums.AgreementStatus;
    debtor_id?: string | null;
    comment?: string;
  } = {};

  if (data.total_amount !== undefined)
    updateData.total_amount = data.total_amount;
  if (data.installment_amount !== undefined)
    updateData.installment_amount = data.installment_amount;
  if (data.installments_count !== undefined)
    updateData.installments_count = data.installments_count;
  if (data.start_date !== undefined) updateData.start_date = data.start_date;
  if (data.status !== undefined)
    updateData.status = data.status as unknown as $Enums.AgreementStatus;
  if (data.debtor_id !== undefined)
    updateData.debtor_id = data.debtor_id ?? null;
  if (data.comment !== undefined) updateData.comment = data.comment ?? "";

  const updatedAgreement = await prisma.agreement.update({
    where: { id },
    data: updateData,
  });

  if (updateData.installments_count) {
    // elimina las cuotas existentes
    await prisma.agreementInstallment.deleteMany({
      where: { agreement_id: id },
    });

    // recorre el numero de cuotas y crea las cuotas correspondientes
    for (let i = 0; i < updateData.installments_count; i++) {
      const installmentDate = new Date(
        updateData.start_date || updatedAgreement.start_date
      );
      installmentDate.setMonth(installmentDate.getMonth() + i);

      await prisma.agreementInstallment.create({
        data: {
          agreement_id: id,
          number: i + 1,
          due_date: installmentDate,
          amount: Number(updateData.installment_amount),
          status: $Enums.InstallmentStatus.PENDING,
        },
      });
    }
  }

  // use the updated record to revalidate the correct collection case path
  revalidatePath(`/dashboard/collection-cases`);
  return {
    id: updatedAgreement.id,
    debt_id: updatedAgreement.debt_id,
    total_amount: Number(updatedAgreement.total_amount),
    installment_amount: Number(updatedAgreement.installment_amount),
    installments_count: updatedAgreement.installments_count,
    start_date: updatedAgreement.start_date,
    status: String(updatedAgreement.status),
    created_at: updatedAgreement.created_at ?? undefined,
    updated_at: updatedAgreement.updated_at ?? undefined,
    debtor_id: updatedAgreement.debtor_id ?? undefined,
  };
};

export const existsPaymentAgreement = async (
  debt_id: string
): Promise<boolean> => {
  const count = await prisma.agreement.count({
    where: { debt_id, status: $Enums.AgreementStatus.ACCEPTED },
  });

  return count > 0;
};

export const getPaymentAgreementById = async (
  id: string
): Promise<Agreement | null> => {
  const agreement = await prisma.agreement.findUnique({
    where: { id },
  });

  if (!agreement) {
    return null;
  }

  return {
    id: agreement.id,
    debt_id: agreement.debt_id ?? undefined,
    tenant_id: agreement.tenant_id,
    total_amount: Number(agreement.total_amount),
    installment_amount: Number(agreement.installment_amount),
    installments_count: agreement.installments_count,
    start_date: agreement.start_date,
    end_date: agreement.end_date,
    status: String(agreement.status),
    created_at: agreement.created_at ?? undefined,
    updated_at: agreement.updated_at ?? undefined,
    debtor_id: agreement.debtor_id ?? undefined,
  };
};

export const countPaymentAgreementsByCollection = async (
  debt_id: string
): Promise<number> => {
  const count = await prisma.agreement.count({
    where: { debt_id },
  });

  return count;
};

export const getInstallmentsByAgreement = async (agreement_id: string) => {
  const installments = await prisma.agreementInstallment.findMany({
    where: { agreement_id },
  });

  return installments.map((installment) => ({
    id: installment.id,
    agreement_id: installment.agreement_id,
    number: installment.number,
    due_date: installment.due_date,
    amount: Number(installment.amount),
    status: String(installment.status),
    created_at: installment.created_at ?? undefined,
    updated_at: installment.updated_at ?? undefined,
  }));
};

export const hasAgreement = async (debt_id: string): Promise<boolean> => {
  try {
    const agreement = await prisma.agreement.findFirst({
      where: {
        debt_id: debt_id,
        status: $Enums.AgreementStatus.ACCEPTED,
      },
    });

    if (agreement) return true;
    else return false;
  } catch (e) {
    return false;
  }
};

// tiene pagos al dia del acuerdo de pago
export const hasPaymentsUpToDate = async (
  debt_id: string
): Promise<boolean> => {
  try {
    const agreement = await prisma.agreement.findFirst({
      where: {
        debt_id: debt_id,
        status: $Enums.AgreementStatus.ACCEPTED,
      },
      include: {
        installments: true,
      },
    });

    if (!agreement) return false;

    const today = new Date();
    for (const installment of agreement.installments) {
      if (
        installment.due_date <= today &&
        installment.status !== $Enums.InstallmentStatus.PAID
      ) {
        return false;
      }
    }

    return true;
  } catch (e) {
    return false;
  }
};

export const cancelAgreementsByCollectionCase = async (debt_id: string) => {
  await prisma.agreement.updateMany({
    where: {
      debt_id,
      status: $Enums.AgreementStatus.ACCEPTED,
    },
    data: {
      status: $Enums.AgreementStatus.CANCELLED,
    },
  });
};

export const getAgreementsByDebtId = async (
  debt_id: string
): Promise<AgreementResponse[]> => {
  const agreements = await prisma.agreement.findMany({
    where: { debt_id },
    include: {
      debtor: {
        include: {
          person: true,
        },
      },
      debt: true,
    },
  });

  return agreements.map((agreement) => ({
    id: agreement.id,
    tenant_id: agreement.tenant_id,
    debt_id: agreement.debt_id ?? undefined,
    total_amount: Number(agreement.total_amount),
    installment_amount: Number(agreement.installment_amount),
    installments_count: agreement.installments_count,
    start_date: agreement.start_date,
    end_date: agreement.end_date,
    status: String(agreement.status),
    created_at: agreement.created_at ?? undefined,
    updated_at: agreement.updated_at ?? undefined,
    debtor_id: agreement.debtor_id ?? undefined,
    comment: agreement.comment ?? undefined,
    debtor: agreement.debtor
      ? {
          id: agreement.debtor.id,
          fullname:
            agreement.debtor.person?.first_name +
              " " +
              agreement.debtor.person?.last_name ||
            agreement.debtor.person?.business_name ||
            "",
          email: agreement.debtor.email ?? undefined,
        }
      : undefined,
  }));
};
