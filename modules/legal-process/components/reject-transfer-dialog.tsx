"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { rejectLegalProcessTransfer } from "@/modules/legal-process/actions/legal-process.actions";

interface RejectTransferDialogProps {
  open: boolean;
  onClose: () => void;
  legalProcessId: string;
  onRegistered: () => void;
}

export const RejectTransferDialog: React.FC<RejectTransferDialogProps> = ({
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
      await rejectLegalProcessTransfer(legalProcessId, reason);
      notifySuccess("Dossier afgewezen");
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
      <DialogTitle>Dossier afwijzen</DialogTitle>
      <DialogContent>
        <TextField
          label="Reden van afwijzing"
          required
          fullWidth
          size="small"
          multiline
          minRows={2}
          sx={{ mt: 1 }}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Terug</Button>
        <Button variant="contained" color="error" onClick={handleSubmit} disabled={loading}>
          Afwijzen bevestigen
        </Button>
      </DialogActions>
    </Dialog>
  );
};
