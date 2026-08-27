"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  DialogContentText,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { acceptCaseTransfer } from "@/modules/legal-process/actions/case-transfer.actions";

interface AcceptTransferDialogProps {
  open: boolean;
  onClose: () => void;
  caseTransferId: string;
  onRegistered: () => void;
}

export const AcceptTransferDialog: React.FC<AcceptTransferDialogProps> = ({
  open,
  onClose,
  caseTransferId,
  onRegistered,
}) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await acceptCaseTransfer(caseTransferId);
      notifySuccess("Dossier geaccepteerd");
      onRegistered();
      onClose();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Actie mislukt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
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
        Dossier accepteren
        <IconButton onClick={onClose} disabled={loading} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <DialogContentText>
          Weet u zeker dat u dit dossier wilt accepteren?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Terug</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          Accepteren bevestigen
        </Button>
      </DialogActions>
    </Dialog>
  );
};
