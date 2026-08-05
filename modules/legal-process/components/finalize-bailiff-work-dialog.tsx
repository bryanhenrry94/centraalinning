"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  Alert,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { submitBailiffFeeInvoice } from "@/modules/legal-process/actions/legal-process.actions";
import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";

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

  const set = (field: keyof typeof emptyState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

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
    notifySuccess("Betaling bevestigd. Trabajo finalizado.");
    onFinalized();
    handleClose();
  };

  const handlePaymentFailed = async () => {
    notifyError("De betaling is niet gelukt. Probeer het opnieuw.");
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Trabajo finalizado: costos y comisión CFSB</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info">
            Al registrar la factura se calcula automáticamente la comisión del CFSB (5%) sobre el
            monto total. Debe pagarla para poder cerrar el expediente GOP.
          </Alert>
          <TextField
            label="Monto total facturado al debiteur"
            type="number"
            size="small"
            required
            value={form.totalAmount}
            onChange={set("totalAmount")}
          />
          <TextField
            label="Número de factura (opcional)"
            size="small"
            value={form.invoiceNumber}
            onChange={set("invoiceNumber")}
          />
          <TextField
            label="Fecha de factura (opcional)"
            type="date"
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            value={form.invoiceDate}
            onChange={set("invoiceDate")}
          />
          <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
            {file ? file.name : "Subir factura de costos"}
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
