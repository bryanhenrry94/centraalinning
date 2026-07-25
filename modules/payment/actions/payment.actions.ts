"use server";
import { Payment, PaymentCreate } from "@/modules/payment/services/payment.validators";
import { PaymentService } from "@/modules/payment/services/payment.service";

interface PaymentFilter {
  debtClaim_id?: string;
}

export const getPayments = async (
  filter: PaymentFilter,
): Promise<{ success: boolean; error?: string; data?: Payment[] }> => {
  return PaymentService.getByFilter(filter);
};

export const getPaymentsByInvoice = async (debtClaim_id: string): Promise<Payment[]> => {
  return PaymentService.getAllByDebtClaim(debtClaim_id);
};

export const getPaymentsByDebtor = async (
  debtor_id: string,
): Promise<Payment[]> => {
  return PaymentService.getByDebtorId(debtor_id);
};

export const registerDebtPayment = async (
  tenant_id: string,
  payload: PaymentCreate,
) => {
  return PaymentService.registerPayment(tenant_id, payload);
};

export const getPaymentById = async (_paymentId: string) => {
  // not implemented
};

export const updatePayment = async (_tenant_id: string, _paymentId: string, _data: any) => {
  // not implemented
};

export const deletePayment = async (_tenant_id: string, _paymentId: string) => {
  // not implemented
};

export const recalculateInvoiceBalance = async (_tenant_id: string, _debt_id: string) => {
  // not implemented
};

export const recalculatePaymentAgreement = async (
  _tenant_id: string,
  _paymentAgreementId: string,
) => {
  // not implemented
};

export const updateInvoiceStatusIfPaid = async (_debt_id: string) => {
  // not implemented
};

export const distributePayment = async (_paymentDetailId: string) => {
  // not implemented
};

export const hasPendingPayments = async (debtClaim_id: string): Promise<boolean> => {
  return PaymentService.hasPending(debtClaim_id);
};

export const getLinkToPayment = async (paymentId: string): Promise<string | null> => {
  return PaymentService.getLinkToPayment(paymentId);
};

export const getPaymentByDebtClaimId = async (
  debtClaim_id: string,
): Promise<Payment | null> => {
  return PaymentService.getFirstByDebtClaimId(debtClaim_id);
};
