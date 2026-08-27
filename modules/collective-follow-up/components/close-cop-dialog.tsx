"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { closeCollectiveCollection } from "@/modules/collective-follow-up/actions/collective-collection.actions";

interface CloseCopDialogProps {
  open: boolean;
  onClose: () => void;
  collectionId: string;
  onClosed: () => void;
}

export const CloseCopDialog: React.FC<CloseCopDialogProps> = ({
  open,
  onClose,
  collectionId,
  onClosed,
}) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setReason("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      notifyError("Vermeld de reden van sluiting");
      return;
    }

    try {
      setSubmitting(true);
      await closeCollectiveCollection({ collectionId, reason: reason.trim() });
      notifySuccess("Collectieve Opvolging gesloten.");
      onClosed();
      handleClose();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Kon de Collectieve Opvolging niet sluiten");
    } finally {
      setSubmitting(false);
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
        Collectieve Opvolging sluiten
        <IconButton onClick={handleClose} disabled={submitting} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <TextField
          label="Reden van sluiting"
          required
          multiline
          minRows={2}
          size="small"
          fullWidth
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions sx={{ flexDirection: "column", alignItems: "stretch", gap: 1, px: 3, pb: 2 }}>
        <Button variant="contained" color="error" onClick={handleSubmit} disabled={submitting} fullWidth>
          {submitting ? "Bezig..." : "Sluiten"}
        </Button>
        <Button onClick={handleClose}>Annuleren</Button>
      </DialogActions>
    </Dialog>
  );
};
