"use client";
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Stack,
  Grid,
  TextField,
  MenuItem,
  Typography,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloseIcon from "@mui/icons-material/Close";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { submitLawyerFeeInvoice } from "@/modules/legal-process/actions/case-transfer.actions";
import { CaseTransferOutcome } from "@/modules/legal-process/services/case-transfer.validators";
import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";
import { getActiveBailiffsDirectory } from "@/modules/bailiff/actions/bailiff.actions";
import { Bailiff } from "@/modules/bailiff/services/bailiff.validators";

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
  bailiffId: "",
};

// Label boven elk veld, in lijn met het compacte formulier-ontwerp van de
// sponsor (vetgedrukt label + rode asterisk, geen zwevende MUI-labels).
const FieldLabel: React.FC<{ label: string; required?: boolean }> = ({
  label,
  required,
}) => (
  <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
    {label}
    {required && (
      <Box component="span" sx={{ color: "error.main", ml: 0.5 }}>
        *
      </Box>
    )}
  </Typography>
);

// Toont het geselecteerde bestand als kaart (PDF-icoon + naam + grootte + X
// om te verwijderen); zonder bestand gewoon de upload-knop.
const FileUploadField: React.FC<{
  file: File | null;
  onSelect: (file: File | null) => void;
  placeholder: string;
}> = ({ file, onSelect, placeholder }) => {
  if (file) {
    return (
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          p: 1,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1,
            bgcolor: "#EF4444",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          PDF
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {file.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {(file.size / (1024 * 1024)).toFixed(1)} MB
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={() => onSelect(null)}
          aria-label="Verwijderen"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>
    );
  }

  return (
    <Button
      component="label"
      variant="outlined"
      fullWidth
      startIcon={<UploadFileIcon />}
      sx={{ justifyContent: "flex-start" }}
    >
      {placeholder}
      <input
        type="file"
        hidden
        onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
      />
    </Button>
  );
};

export const FinalizeLawyerWorkDialog: React.FC<
  FinalizeLawyerWorkDialogProps
> = ({ open, onClose, caseTransferId, onFinalized }) => {
  const [form, setForm] = useState(emptyState);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [verdictFile, setVerdictFile] = useState<File | null>(null);
  const [bailiffs, setBailiffs] = useState<Bailiff[]>([]);

  useEffect(() => {
    if (!open) return;
    getActiveBailiffsDirectory()
      .then(setBailiffs)
      .catch(() => notifyError("Kon deurwaarders niet laden"));
  }, [open]);

  const set =
    (field: keyof typeof emptyState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
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
    if (
      hasVerdict &&
      (!form.verdictNumber.trim() || !form.verdictDate || !verdictFile)
    ) {
      return {
        success: false,
        error: "Vul het vonnisnummer, de datum vonnis en het vonnisdocument in",
      };
    }
    if (hasVerdict && !form.bailiffId) {
      return {
        success: false,
        error: "Selecteer de deurwaarder voor tenuitvoerlegging",
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
          bailiffId: hasVerdict ? form.bailiffId : null,
        },
        invoiceFile,
        hasVerdict ? verdictFile : null,
      );
      return {
        success: true,
        paymentId: result.paymentId,
        paymentUrl: result.paymentUrl,
      };
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
          fontWeight: 700,
        }}
      >
        Dossier afronden
        <IconButton onClick={handleClose} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2.5 }}>
        <Stack spacing={2}>
          <Alert severity="info" sx={{ textAlign: "justify" }}>
            CFSB berekent automatisch 5% plus de toepasselijke belasting over
            het geregistreerde honorarium. Na betaling wordt de advocatenfase
            afgerond, het dossier afgesloten en een geregistreerd vonnis
            automatisch naar de geselecteerde deurwaarder verzonden.
          </Alert>

          <Box>
            <FieldLabel label="Uitkomst" required />
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
                control={<Radio size="small" />}
                label="Buitengerechtelijk opgelost"
              />
              <FormControlLabel
                value="GERECHTELIJK"
                control={<Radio size="small" />}
                label="Gerechtelijk behandeld (met of zonder vonnis)"
              />
            </RadioGroup>
          </Box>

          {isGerechtelijk && (
            <Box>
              <FieldLabel label="Is er een vonnis?" required />
              <RadioGroup
                row
                value={form.hasVerdict}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    hasVerdict: e.target.value as "true" | "false",
                  }))
                }
              >
                <FormControlLabel
                  value="true"
                  control={<Radio size="small" />}
                  label="Ja"
                />
                <FormControlLabel
                  value="false"
                  control={<Radio size="small" />}
                  label="Nee"
                />
              </RadioGroup>
            </Box>
          )}

          {hasVerdict && (
            <>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FieldLabel label="Vonnisnummer" required />
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="ECLI:NL:OGEAC:2026:1234"
                    value={form.verdictNumber}
                    onChange={set("verdictNumber")}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FieldLabel label="Datum vonnis" required />
                  <TextField
                    fullWidth
                    type="date"
                    size="small"
                    value={form.verdictDate}
                    onChange={set("verdictDate")}
                  />
                </Grid>
              </Grid>

              <Box>
                <FieldLabel label="Vonnisdocument" required />
                <FileUploadField
                  file={verdictFile}
                  onSelect={setVerdictFile}
                  placeholder="Vonnisdocument uploaden"
                />
              </Box>

              <Box>
                <FieldLabel
                  label="Deurwaarder voor tenuitvoerlegging"
                  required
                />
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={form.bailiffId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, bailiffId: e.target.value }))
                  }
                >
                  {bailiffs.map((bailiff) => (
                    <MenuItem key={bailiff.id} value={bailiff.id}>
                      {bailiff.fullname}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </>
          )}

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FieldLabel label="Datum afronding" required />
              <TextField
                fullWidth
                type="date"
                size="small"
                value={form.completionDate}
                onChange={set("completionDate")}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FieldLabel label="Totaal honorarium (USD)" required />
              <TextField
                fullWidth
                type="number"
                size="small"
                placeholder="0,00"
                value={form.totalAmount}
                onChange={set("totalAmount")}
              />
            </Grid>
          </Grid>

          <Box>
            <FieldLabel label="Factuur advocaat" required />
            <FileUploadField
              file={invoiceFile}
              onSelect={setInvoiceFile}
              placeholder="Factuur advocaat uploaden"
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{
          flexDirection: "column",
          alignItems: "stretch",
          gap: 1,
          px: 3,
          pb: 2,
        }}
      >
        <PaymentIntent
          onCreateTransaction={handleCreateTransaction}
          onPaymentConfirmed={handlePaymentConfirmed}
          onPaymentFailed={handlePaymentFailed}
          buttonLabel="Afronden en verzenden"
        />
        <Button variant="outlined" onClick={handleClose}>
          Annuleren
        </Button>
      </DialogActions>
    </Dialog>
  );
};
