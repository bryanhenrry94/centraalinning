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
import { cancelGop } from "@/modules/legal-process/actions/legal-process.actions";

interface CancelGopDialogProps {
  open: boolean;
  onClose: () => void;
  legalProcessId: string;
  onRegistered: () => void;
}

export const CancelGopDialog: React.FC<CancelGopDialogProps> = ({
  open,
  onClose,
  legalProcessId,
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
      await cancelGop({ legalProcessId, reason });
      notifySuccess("GOP geannuleerd");
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
      <DialogTitle>Gerechtelijke opvolging annuleren</DialogTitle>
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
