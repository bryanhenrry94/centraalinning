"use client";
import React, { useState } from "react";
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
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloseIcon from "@mui/icons-material/Close";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { submitLawyerFeeInvoice } from "@/modules/legal-process/actions/case-transfer.actions";
import { CaseTransferOutcome } from "@/modules/legal-process/services/case-transfer.validators";
import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";

interface FinalizeLawyerWorkDialogProps {
  open: boolean;
  onClose: () => void;
  caseTransferId: string;
  onFinalized: () => void;
}

const emptyState = {
  outcome: "" as CaseTransferOutcome | "",
  hasVerdict: "" as "" | "true" | "false",
  completionDate: "",
  totalAmount: "",
  verdictNumber: "",
  verdictDate: "",
};

export const FinalizeLawyerWorkDialog: React.FC<FinalizeLawyerWorkDialogProps> = ({
  open,
  onClose,
  caseTransferId,
  onFinalized,
}) => {
  const [form, setForm] = useState(emptyState);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [verdictFile, setVerdictFile] = useState<File | null>(null);

  const set = (field: keyof typeof emptyState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const isGerechtelijk = form.outcome === "GERECHTELIJK";
  const hasVerdict = isGerechtelijk && form.hasVerdict === "true";

  const handleClose = () => {
    setForm(emptyState);
    setInvoiceFile(null);
    setVerdictFile(null);
    onClose();
  };

  // El registro de la finalización (uitkomst + honorarium + factuur) y la
  // apertura del payment intent contra Sentoo ocurren en un solo paso: no
  // tiene sentido guardar los datos sin también cobrar la comisión CFSB que
  // la habilita.
  const handleCreateTransaction = async (): Promise<{
    success: boolean;
    error?: string;
    paymentId?: string;
    paymentUrl?: string;
  }> => {
    if (!form.outcome) {
      return { success: false, error: "Selecteer de uitkomst" };
    }
    if (isGerechtelijk && !form.hasVerdict) {
      return { success: false, error: "Geef aan of er een vonnis is" };
    }
    if (!form.completionDate) {
      return { success: false, error: "Vul de datum afronding in" };
    }
    if (!Number(form.totalAmount)) {
      return { success: false, error: "Voer het totale honorariumbedrag in" };
    }
    if (!invoiceFile) {
      return { success: false, error: "Upload de honorariumfactuur" };
    }
    if (hasVerdict && (!form.verdictNumber.trim() || !form.verdictDate || !verdictFile)) {
      return {
        success: false,
        error: "Vul het vonnisnummer, de datum vonnis en het vonnisdocument in",
      };
    }

    try {
      const result = await submitLawyerFeeInvoice(
        {
          caseTransferId,
          outcome: form.outcome as CaseTransferOutcome,
          hasVerdict: isGerechtelijk ? form.hasVerdict === "true" : null,
          completionDate: new Date(form.completionDate),
          totalAmount: Number(form.totalAmount),
          verdictNumber: hasVerdict ? form.verdictNumber : null,
          verdictDate: hasVerdict ? new Date(form.verdictDate) : null,
        },
        invoiceFile,
        hasVerdict ? verdictFile : null,
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
        Dossier afronden
        <IconButton onClick={handleClose} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info">
            Bij het registreren van het honorarium wordt automatisch de CFSB-commissie (5% + ABB)
            berekend. Deze moet betaald worden zodat de advocatenfase de status &quot;Afgerond&quot;
            krijgt.
          </Alert>

          <FormControl>
            <FormLabel>Uitkomst</FormLabel>
            <RadioGroup
              value={form.outcome}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  outcome: e.target.value as CaseTransferOutcome,
                  hasVerdict: "",
                }))
              }
            >
              <FormControlLabel
                value="BUITENGERECHTELIJK"
                control={<Radio />}
                label="Buitengerechtelijk opgelost"
              />
              <FormControlLabel
                value="GERECHTELIJK"
                control={<Radio />}
                label="Gerechtelijk behandeld (met of zonder vonnis)"
              />
            </RadioGroup>
          </FormControl>

          {isGerechtelijk && (
            <FormControl>
              <FormLabel>Is er een vonnis?</FormLabel>
              <RadioGroup
                row
                value={form.hasVerdict}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, hasVerdict: e.target.value as "true" | "false" }))
                }
              >
                <FormControlLabel value="true" control={<Radio />} label="Ja" />
                <FormControlLabel value="false" control={<Radio />} label="Nee" />
              </RadioGroup>
            </FormControl>
          )}

          {hasVerdict && (
            <>
              <Divider />
              <TextField
                label="Vonnisnummer"
                size="small"
                required
                value={form.verdictNumber}
                onChange={set("verdictNumber")}
              />
              <TextField
                label="Datum vonnis"
                type="date"
                size="small"
                required
                slotProps={{ inputLabel: { shrink: true } }}
                value={form.verdictDate}
                onChange={set("verdictDate")}
              />
              <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
                {verdictFile ? verdictFile.name : "Vonnisdocument uploaden"}
                <input
                  type="file"
                  hidden
                  onChange={(e) => setVerdictFile(e.target.files?.[0] ?? null)}
                />
              </Button>
              <Divider />
            </>
          )}

          <TextField
            label="Datum afronding"
            type="date"
            size="small"
            required
            slotProps={{ inputLabel: { shrink: true } }}
            value={form.completionDate}
            onChange={set("completionDate")}
          />
          <TextField
            label="Totaal honorarium (USD)"
            type="number"
            size="small"
            required
            value={form.totalAmount}
            onChange={set("totalAmount")}
          />
          <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
            {invoiceFile ? invoiceFile.name : "Factuur advocaat uploaden"}
            <input
              type="file"
              hidden
              onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)}
            />
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexDirection: "column", alignItems: "stretch", gap: 1, px: 3, pb: 2 }}>
        <PaymentIntent
          onCreateTransaction={handleCreateTransaction}
          onPaymentConfirmed={handlePaymentConfirmed}
          onPaymentFailed={handlePaymentFailed}
          buttonLabel="Afronden en verzenden"
        />
        <Button onClick={handleClose}>Annuleren</Button>
      </DialogActions>
    </Dialog>
  );
};
