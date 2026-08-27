"use client";
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Stack,
  TextField,
  Alert,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloseIcon from "@mui/icons-material/Close";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import {
  submitBailiffFeeInvoice,
  getGopBailiffCostsSummary,
} from "@/modules/legal-process/actions/legal-process.actions";
import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";
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

export const FinalizeBailiffWorkDialog: React.FC<FinalizeBailiffWorkDialogProps> = ({
  open,
  onClose,
  legalProcessId,
  onFinalized,
}) => {
  const [form, setForm] = useState(emptyState);
  const [file, setFile] = useState<File | null>(null);
  const [registeredCostsTotal, setRegisteredCostsTotal] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    getGopBailiffCostsSummary(legalProcessId)
      .then(setRegisteredCostsTotal)
      .catch(() => setRegisteredCostsTotal(null));
  }, [open, legalProcessId]);

  const set = (field: keyof typeof emptyState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // No bloqueante: el spec solo pide una advertencia cuando la factura final
  // no calza con la suma de actuaciones ya registradas.
  const mismatchWarning =
    registeredCostsTotal !== null &&
    Number(form.totalAmount) > 0 &&
    Math.abs(Number(form.totalAmount) - registeredCostsTotal) > 0.01
      ? `Let op: het ingevoerde totaalbedrag (${formatCurrency(Number(form.totalAmount))}) komt niet overeen met de som van de geregistreerde actuaties (${formatCurrency(registeredCostsTotal)}).`
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
    if (!file) {
      return { success: false, error: "Upload uw kostenfactuur" };
    }

    try {
      const result = await submitBailiffFeeInvoice(
        {
          legalProcessId,
          totalAmount: Number(form.totalAmount),
          invoiceNumber: form.invoiceNumber || null,
          invoiceDate: form.invoiceDate ? new Date(form.invoiceDate) : null,
        },
        file,
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
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle
        sx={{
          bgcolor: "secondary.main",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontWeight: 600,
        }}
      >
        Werk afgerond: kosten en CFSB-commissie
        <IconButton onClick={handleClose} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info">
            Bij het registreren van de factuur wordt automatisch de CFSB-commissie (5%) over het
            totaalbedrag berekend. Deze moet betaald worden om het GOP-dossier te kunnen sluiten.
          </Alert>
          {registeredCostsTotal !== null && (
            <Alert severity="info" variant="outlined">
              Som van de geregistreerde deurwaarderskosten: {formatCurrency(registeredCostsTotal)}
            </Alert>
          )}
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
            {file ? file.name : "Kostenfactuur uploaden"}
            <input type="file" hidden onChange={handleFileChange} />
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexDirection: "column", alignItems: "stretch", gap: 1, px: 3, pb: 2 }}>
        <PaymentIntent
          onCreateTransaction={handleCreateTransaction}
          onPaymentConfirmed={handlePaymentConfirmed}
          onPaymentFailed={handlePaymentFailed}
        />
        <Button onClick={handleClose}>Annuleren</Button>
      </DialogActions>
    </Dialog>
  );
};
