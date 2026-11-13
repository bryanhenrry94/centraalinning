"use client";
import React, { useEffect, useState } from "react";
import { Button, Stack, TextField, Alert } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { AlertService } from "@/shared/ui/alerts";
import {
  submitBailiffFeeInvoice,
  getGopBailiffCostsSummary,
  getGopBailiffFeeRatePercent,
} from "@/modules/legal-process/actions/legal-process.actions";
import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";
import { PaymentConfirmDialog } from "@/shared/ui/payment-confirm-dialog";
import { formatCurrency } from "@/shared/utils/formatters";

interface FinalizeBailiffWorkDialogProps {
  open: boolean;
  onClose: () => void;
  legalProcessId: string;
  onFinalized: () => void;
}

const emptyState = {
  totalAmount: "",
  invoiceNumber: "",
  invoiceDate: "",
};

type CostsSummary = Awaited<ReturnType<typeof getGopBailiffCostsSummary>>;

export const FinalizeBailiffWorkDialog: React.FC<FinalizeBailiffWorkDialogProps> = ({
  open,
  onClose,
  legalProcessId,
  onFinalized,
}) => {
  const [form, setForm] = useState(emptyState);
  const [file, setFile] = useState<File | null>(null);
  const [costsSummary, setCostsSummary] = useState<CostsSummary | null>(null);
  const [bailiffFeeRatePercent, setBailiffFeeRatePercent] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    getGopBailiffCostsSummary(legalProcessId)
      .then(setCostsSummary)
      .catch(() => setCostsSummary(null));
    getGopBailiffFeeRatePercent(legalProcessId)
      .then(setBailiffFeeRatePercent)
      .catch(() => setBailiffFeeRatePercent(null));
  }, [open, legalProcessId]);

  const set = (field: keyof typeof emptyState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const registeredCostsTotal = costsSummary?.total ?? null;
  // Per regel OF gezamenlijk, nooit allebei verplicht (punt 19 GOP-analyse):
  // als elke geregistreerde kostenregel al zijn eigen document heeft, hoeft
  // hier geen gezamenlijke factuur meer geüpload te worden.
  const combinedInvoiceRequired = !costsSummary?.allDocumented;

  const totalAmountNumber = Number(form.totalAmount) || 0;
  const cfsbFeeTotal =
    bailiffFeeRatePercent != null && totalAmountNumber > 0
      ? Math.round(totalAmountNumber * (bailiffFeeRatePercent / 100) * 100) / 100
      : null;

  // No bloqueante: el spec solo pide una advertencia cuando la factura final
  // no calza con la suma de actuaciones ya registradas.
  const mismatchWarning =
    registeredCostsTotal !== null &&
    totalAmountNumber > 0 &&
    Math.abs(totalAmountNumber - registeredCostsTotal) > 0.01
      ? `Let op: het ingevoerde totaalbedrag (${formatCurrency(totalAmountNumber)}) komt niet overeen met de som van de geregistreerde actuaties (${formatCurrency(registeredCostsTotal)}).`
      : null;

  const handleClose = () => {
    setForm(emptyState);
    setFile(null);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };

  // El registro de la factura (subida + cálculo del 5%) y la apertura del
  // payment intent contra Sentoo ocurren en un solo paso, igual que en el
  // flujo equivalente del abogado (FinalizeLawyerWorkDialog).
  const handleCreateTransaction = async (): Promise<{
    success: boolean;
    error?: string;
    paymentId?: string;
    paymentUrl?: string;
  }> => {
    if (!Number(form.totalAmount)) {
      return { success: false, error: "Voer het totale kostenbedrag in" };
    }
    if (!file && combinedInvoiceRequired) {
      return {
        success: false,
        error: "Upload een gezamenlijke factuur, of registreer eerst een document bij elke kostenregel.",
      };
    }

    const confirmed = await AlertService.showConfirm(
      "Deurwaarderskosten registreren",
      "Weet u zeker dat u deze deurwaarderskosten wilt registreren?",
      "Ja, registreren",
      "Nee",
    );
    if (!confirmed) {
      return { success: false };
    }

    try {
      const result = await submitBailiffFeeInvoice(
        {
          legalProcessId,
          totalAmount: Number(form.totalAmount),
          invoiceNumber: form.invoiceNumber || null,
          invoiceDate: form.invoiceDate ? new Date(form.invoiceDate) : null,
        },
        file ?? undefined,
      );
      return { success: true, paymentId: result.paymentId, paymentUrl: result.paymentUrl };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Registratie mislukt",
      };
    }
  };

  const handlePaymentConfirmed = async () => {
    notifySuccess("Betaling bevestigd. Werk afgerond.");
    onFinalized();
    handleClose();
  };

  const handlePaymentFailed = async () => {
    notifyError("De betaling is niet gelukt. Probeer het opnieuw.");
  };

  return (
    <PaymentConfirmDialog
      open={open}
      onClose={handleClose}
      title="Werk afgerond: kosten en CFSB-commissie"
      lineItems={[]}
      total={cfsbFeeTotal ?? 0}
      totalLabel="CFSB-commissie"
      helperText="Bij het registreren van de factuur wordt automatisch de CFSB-commissie (5%) over het totaalbedrag berekend. Deze moet betaald worden om het GOP-dossier te kunnen sluiten."
      payAction={
        <PaymentIntent
          onCreateTransaction={handleCreateTransaction}
          onPaymentConfirmed={handlePaymentConfirmed}
          onPaymentFailed={handlePaymentFailed}
        />
      }
    >
      <Stack spacing={2}>
        {mismatchWarning && <Alert severity="warning">{mismatchWarning}</Alert>}
        <TextField
          label="Totaalbedrag gefactureerd aan de debiteur"
          type="number"
          size="small"
          required
          value={form.totalAmount}
          onChange={set("totalAmount")}
        />
        <TextField
          label="Factuurnummer (optioneel)"
          size="small"
          value={form.invoiceNumber}
          onChange={set("invoiceNumber")}
        />
        <TextField
          label="Factuurdatum (optioneel)"
          type="date"
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
          value={form.invoiceDate}
          onChange={set("invoiceDate")}
        />
        <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
          {file ? file.name : combinedInvoiceRequired ? "Gezamenlijke factuur uploaden" : "Gezamenlijke factuur uploaden (optioneel)"}
          <input type="file" hidden onChange={handleFileChange} />
        </Button>
        {!combinedInvoiceRequired && !file && (
          <Alert severity="success" variant="outlined">
            Elke geregistreerde kostenregel heeft al een eigen document — een gezamenlijke
            factuur is hier niet verplicht.
          </Alert>
        )}
      </Stack>
    </PaymentConfirmDialog>
  );
};
