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
  FormControlLabel,
  Switch,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { setCaseTransferPowerOfAttorney } from "@/modules/legal-process/actions/case-transfer.actions";

interface PowerOfAttorneyDialogProps {
  open: boolean;
  onClose: () => void;
  caseTransferId: string;
  currentlyGranted: boolean;
  onUpdated: () => void;
}

export const PowerOfAttorneyDialog: React.FC<PowerOfAttorneyDialogProps> = ({
  open,
  onClose,
  caseTransferId,
  currentlyGranted,
  onUpdated,
}) => {
  const [granted, setGranted] = useState(currentlyGranted);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setGranted(currentlyGranted);
    setNote("");
    onClose();
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await setCaseTransferPowerOfAttorney(caseTransferId, granted, note.trim() || undefined);
      notifySuccess(
        granted ? "Volmacht (power of attorney) verleend." : "Volmacht (power of attorney) ingetrokken.",
      );
      onUpdated();
      handleClose();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Actie mislukt");
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
        Volmacht (power of attorney)
        <IconButton onClick={handleClose} disabled={loading} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info">
            Sin volmacht, el abogado/alguacil asignado solo puede registrar propuestas de acuerdo
            de pago — usted siempre decide (acepta, modifica o rechaza). Con volmacht, el
            profesional también puede decidir por su cuenta.
          </Alert>
          <FormControlLabel
            control={<Switch checked={granted} onChange={(e) => setGranted(e.target.checked)} />}
            label={granted ? "Volmacht verleend" : "Geen volmacht"}
          />
          {granted && (
            <TextField
              label="Toelichting (optioneel)"
              size="small"
              multiline
              minRows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annuleren</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          Opslaan
        </Button>
      </DialogActions>
    </Dialog>
  );
};
