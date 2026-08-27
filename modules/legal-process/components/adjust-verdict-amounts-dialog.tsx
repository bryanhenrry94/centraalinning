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
import CloseIcon from "@mui/icons-material/Close";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { adjustVerdictAmounts } from "@/modules/legal-process/actions/legal-process.actions";

interface AdjustVerdictAmountsDialogProps {
  open: boolean;
  onClose: () => void;
  verdictId: string;
  currentSentenceAmount: number;
  currentProcesalCost: number;
  onAdjusted: () => void;
}

// Punto 7 del análisis CFSB: el alguacil ajusta el monto decidido por la
// corte y/o los costos procesales del vonnis para que coincidan con su
// saldo/facturación confirmada. Cada cambio queda en AuditLog (valor
// anterior -> nuevo -> usuario -> fecha), y la obligación administrativa
// CFSB recuperable del deudor se recalcula automáticamente — ver
// VerdictService.adjustAmounts.
export const AdjustVerdictAmountsDialog: React.FC<AdjustVerdictAmountsDialogProps> = ({
  open,
  onClose,
  verdictId,
  currentSentenceAmount,
  currentProcesalCost,
  onAdjusted,
}) => {
  const [sentenceAmount, setSentenceAmount] = useState(String(currentSentenceAmount));
  const [procesalCost, setProcesalCost] = useState(String(currentProcesalCost));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSentenceAmount(String(currentSentenceAmount));
      setProcesalCost(String(currentProcesalCost));
    }
  }, [open, currentSentenceAmount, currentProcesalCost]);

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const handleSubmit = async () => {
    const newSentenceAmount = Number(sentenceAmount);
    const newProcesalCost = Number(procesalCost);
    if (!Number.isFinite(newSentenceAmount) || newSentenceAmount <= 0) {
      notifyError("Vul een geldig vonnisbedrag in");
      return;
    }
    if (!Number.isFinite(newProcesalCost) || newProcesalCost < 0) {
      notifyError("Vul geldige proceskosten in");
      return;
    }

    setLoading(true);
    try {
      await adjustVerdictAmounts({
        verdictId,
        sentence_amount: newSentenceAmount,
        procesal_cost: newProcesalCost,
      });
      notifySuccess("Vonnisbedragen aangepast. Wijzigingen zijn vastgelegd in het auditlog.");
      onAdjusted();
      onClose();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Aanpassing mislukt");
    } finally {
      setLoading(false);
    }
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
        Vonnisbedragen aanpassen
        <IconButton onClick={handleClose} disabled={loading} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info">
            Elke wijziging wordt vastgelegd (oude waarde → nieuwe waarde, gebruiker, datum/tijd) en
            de terugvorderbare CFSB-administratiekosten van de schuldenaar worden automatisch
            herberekend.
          </Alert>

          <TextField
            label="Beslissing bedrag (rechtbank)"
            type="number"
            size="small"
            required
            inputProps={{ step: "any" }}
            value={sentenceAmount}
            onChange={(e) => setSentenceAmount(e.target.value)}
          />

          <TextField
            label="Overige proceskosten"
            type="number"
            size="small"
            inputProps={{ step: "any" }}
            value={procesalCost}
            onChange={(e) => setProcesalCost(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Annuleren
        </Button>
        <Button variant="contained" onClick={handleSubmit} loading={loading}>
          Opslaan
        </Button>
      </DialogActions>
    </Dialog>
  );
};
