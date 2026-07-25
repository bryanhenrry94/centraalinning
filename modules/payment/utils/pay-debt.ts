import { formatCurrency } from "@/shared/utils/formatters";
import { notifyError, notifyInfo, notifyWarning } from "@/shared/ui/notifications";
import { AlertService } from "@/shared/ui/alerts";
import { createSentooPayment } from "@/actions/sentoo.actions";
import {
  getPaymentByDebtClaimId,
  hasPendingPayments,
  registerDebtPayment,
} from "@/modules/payment/actions/payment.actions";
import { PaymentCreate, PaymentType } from "@/modules/payment/services/payment.validators";
import { getAgreementByDebtClaimId } from "@/modules/agreement/actions/agreement.actions";
import { AgreementStatus } from "@/modules/agreement/constants/agreement-status";
import { DebtorSummary } from "@/modules/collection/types/DebtorSummary";

const getPendingPayment = async (debtId: string) => {
  const hasPending = await hasPendingPayments(debtId);
  if (!hasPending) return null;

  return await getPaymentByDebtClaimId(debtId);
};

const redirectToExistingPayment = (payment: any) => {
  notifyWarning("Tienes un pago pendiente. Redirigiendo al proveedor...");

  if (payment?.provider === "sentoo") {
    try {
      const payload = JSON.parse(payment.provider_payload || "{}");
      const url = payload?.success?.data?.url;

      if (url) window.location.href = url;
    } catch {
      notifyError("No se pudo recuperar el link de pago");
    }
  }
};

const createAndRedirectToPayment = async ({
  debt,
  amountToPay,
  collectionCaseId,
}: {
  debt: DebtorSummary;
  amountToPay: number;
  collectionCaseId: string;
}) => {
  const newTab = window.open("", "_blank");

  try {
    const res = await createSentooPayment({
      amount: amountToPay,
      description: `Pago deuda ${debt.reference}`,
      reference: `debt-${debt.id}-case-${collectionCaseId}-${Date.now()}`,
    });

    if (!res.success || !res.payment?.url) {
      throw new Error("Error al crear el pago en Sentoo");
    }

    const payment: PaymentCreate = {
      debtClaim_id: debt.id,
      method: "TRANSFER",
      total_amount: amountToPay,
      paid_at: null,
      status: "pending",
      provider: "sentoo",
      provider_ref: res.payment.id,
      provider_payload: JSON.stringify(res.raw),
      reference_number: "",
      agreement_id: null,
      payment_type: PaymentType.DEBT_PAYMENT,
    };

    const paymentRes = await registerDebtPayment(debt.tenant_id, payment);

    if (!paymentRes.id) {
      notifyError("Error al registrar el pago");
      newTab?.close();
      return;
    }

    notifyInfo("Redirigiendo a la pasarela de pago...");

    if (newTab) {
      newTab.location.href = res.payment.url;
    } else {
      window.location.href = res.payment.url;
    }
  } catch (error) {
    console.error(error);
    notifyError("Error al crear el pago");
    newTab?.close();
  }
};

/**
 * Inicia el flujo de pago de una deuda para el deudor: valida pagos y
 * acuerdos pendientes, pide confirmación y redirige a Sentoo.
 */
export const payDebt = async (debt: DebtorSummary): Promise<void> => {
  if (!debt) {
    notifyError("No se seleccionó una deuda para pagar");
    return;
  }

  const collectionCaseId = debt.source_id;

  if (!collectionCaseId) {
    notifyError("No se encontró el caso de cobranza asociado a esta deuda");
    return;
  }

  const existingPayment = await getPendingPayment(debt.id);
  if (existingPayment) {
    redirectToExistingPayment(existingPayment);
    return;
  }

  const agreement = await getAgreementByDebtClaimId(debt.id);

  if (agreement?.status === AgreementStatus.PENDING) {
    notifyWarning("Tu solicitud de acuerdo de pago está pendiente de aprobación.");
    return;
  }

  const amountToPay = agreement?.installment_amount ?? debt.balance;

  const confirmed = await AlertService.showConfirm(
    "¿Estás seguro?",
    `Vas a pagar ${formatCurrency(amountToPay)} para la deuda ${debt.reference}.`,
    "Sí, pagar",
    "Cancelar",
  );

  if (!confirmed) return;

  await createAndRedirectToPayment({ debt, amountToPay, collectionCaseId });
};
