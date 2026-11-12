"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { rejectCaseTransfer } from "@/modules/legal-process/actions/case-transfer.actions";

interface RejectTransferDialogProps {
  open: boolean;
  onClose: () => void;
  caseTransferId: string;
  onRegistered: () => void;
}

export const RejectTransferDialog: React.FC<RejectTransferDialogProps> = ({
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
      await rejectCaseTransfer({ caseTransferId, reason });
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
        Dossier afwijzen
        <IconButton onClick={handleClose} disabled={loading} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
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
