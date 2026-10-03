"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
  Typography,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloseIcon from "@mui/icons-material/Close";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { submitBailiffOutcomeInvoice } from "@/modules/legal-process/actions/case-transfer.actions";
import { CaseTransferOutcome } from "@/modules/legal-process/services/case-transfer.validators";
import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";

interface RegisterBailiffOutcomeDialogProps {
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
};

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

// "Uitkomst registreren" voor de rechtstreekse deurwaarder-route (geen
// advocaat). Is er wél een vonnis, dan rondt dit formulier de overdrachtsfase
// NIET af en verstuurt het niets: de hoofdknop wordt "Doorgaan naar vonnis
// registreren" en leidt rechtstreeks naar de bestaande "Vonnis registreren"
// -route, waar vonnisnummer/datum/document één keer worden ingevuld.
export const RegisterBailiffOutcomeDialog: React.FC<
  RegisterBailiffOutcomeDialogProps
> = ({ open, onClose, caseTransferId, onFinalized }) => {
  const router = useRouter();
  const [form, setForm] = useState(emptyState);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  const set =
    (field: keyof typeof emptyState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const isGerechtelijk = form.outcome === "GERECHTELIJK";
  const hasVerdict = isGerechtelijk && form.hasVerdict === "true";
  const canSubmitOutcome =
    form.outcome === "BUITENGERECHTELIJK" ||
    (isGerechtelijk && form.hasVerdict === "false");

  const handleClose = () => {
    setForm(emptyState);
    setInvoiceFile(null);
    onClose();
  };

  // "Ja, er is een vonnis": de overdrachtsfase rondt hier NIET af — enkel de
  // normale transferfase stopt, en het dossier gaat door naar de bestaande
  // "Vonnis registreren"-route (vonnisnummer/datum/document worden daar pas
  // één keer ingevuld, niet hier).
  const handleContinueToVerdict = () => {
    handleClose();
    router.push(`/verdicts/new?caseTransferId=${caseTransferId}`);
  };

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
    if (!canSubmitOutcome) {
      return {
        success: false,
        error:
          "Is er een vonnis, gebruik dan 'Vonnis registreren' in plaats van deze uitkomstregistratie.",
      };
    }
    if (!form.completionDate) {
      return { success: false, error: "Vul de datum afronding in" };
    }
    if (!Number(form.totalAmount)) {
      return { success: false, error: "Voer het totale kostenbedrag in" };
    }
    if (!invoiceFile) {
      return { success: false, error: "Upload de kostenfactuur" };
    }

    try {
      const result = await submitBailiffOutcomeInvoice(
        {
          caseTransferId,
          outcome: form.outcome as CaseTransferOutcome,
          completionDate: new Date(form.completionDate),
          totalAmount: Number(form.totalAmount),
        },
        invoiceFile,
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
    notifySuccess(
      "Betaling bevestigd. Deze route is afgerond — er is geen GOP.",
    );
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
      <DialogContent sx={{ pt: 2.5, mt: 2 }}>
        <Stack spacing={2}>
          {/* <Alert severity="info" sx={{ textAlign: "justify" }}>
            Dit formulier is enkel voor een afronding zonder vonnis. CFSB
            berekent automatisch 5% plus de toepasselijke belasting over het
            geregistreerde kostenbedrag. Na betaling wordt deze route afgesloten
            — er ontstaat geen GOP.
          </Alert> */}

          <Box>
            <FieldLabel label="Afronding in" required />
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
                label="Buitengerechtelijk fase"
              />
              <FormControlLabel
                value="GERECHTELIJK"
                control={<Radio size="small" />}
                label="Gerechtelijke fase"
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

          {/* {hasVerdict && (
            <Alert severity="info">
              De overdrachtsfase rondt hier niet af. Vonnisnummer, datum en het
              vonnisdocument vult u in één keer in bij &quot;Vonnis
              registreren&quot; — niet hier.
            </Alert>
          )} */}

          {canSubmitOutcome && (
            <>
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
                  <FieldLabel label="Totaal kostenbedrag (USD)" required />
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
                <FieldLabel label="Kostenfactuur" required />
                <FileUploadField
                  file={invoiceFile}
                  onSelect={setInvoiceFile}
                  placeholder="Factuur uploaden"
                />
              </Box>
            </>
          )}
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
        {canSubmitOutcome ? (
          <PaymentIntent
            onCreateTransaction={handleCreateTransaction}
            onPaymentConfirmed={handlePaymentConfirmed}
            onPaymentFailed={handlePaymentFailed}
            buttonLabel="Afronden en verzenden"
          />
        ) : hasVerdict ? (
          <Button variant="contained" onClick={handleContinueToVerdict}>
            Doorgaan naar vonnis registreren
          </Button>
        ) : (
          <Button variant="contained" disabled>
            Afronden en verzenden
          </Button>
        )}
        <Button variant="outlined" onClick={handleClose}>
          Annuleren
        </Button>
      </DialogActions>
    </Dialog>
  );
};
