"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
} from "@mui/material";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { cancelCaseTransfer } from "@/modules/legal-process/actions/case-transfer.actions";

interface CancelTransferDialogProps {
  open: boolean;
  onClose: () => void;
  caseTransferId: string;
  onRegistered: () => void;
}

export const CancelTransferDialog: React.FC<CancelTransferDialogProps> = ({
  open,
  onClose,
  caseTransferId,
  onRegistered,
}) => {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setReason("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      notifyError("Vul een reden in");
      return;
    }

    setLoading(true);
    try {
      await cancelCaseTransfer({ caseTransferId, reason });
      notifySuccess("Overdracht geannuleerd");
      onRegistered();
      handleClose();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Actie mislukt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Dossieroverdracht annuleren</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Deze actie stopt de opvolging van het dossier definitief.
        </Alert>
        <TextField
          label="Reden van annulering"
          required
          fullWidth
          size="small"
          multiline
          minRows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Terug</Button>
        <Button variant="contained" color="error" onClick={handleSubmit} disabled={loading}>
          Annuleren bevestigen
        </Button>
      </DialogActions>
    </Dialog>
  );
};
