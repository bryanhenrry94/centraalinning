"use client";
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
} from "@mui/material";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { getActiveBailiffsDirectory } from "@/modules/bailiff/actions/bailiff.actions";
import { Bailiff } from "@/modules/bailiff/services/bailiff.validators";
import { assignBailiffForExecution } from "@/modules/legal-process/actions/case-transfer.actions";

interface TransferToBailiffDialogProps {
  open: boolean;
  onClose: () => void;
  caseTransferId: string;
  onTransferred: () => void;
}

export const TransferToBailiffDialog: React.FC<TransferToBailiffDialogProps> = ({
  open,
  onClose,
  caseTransferId,
  onTransferred,
}) => {
  const [bailiffs, setBailiffs] = useState<Bailiff[]>([]);
  const [bailiffId, setBailiffId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    getActiveBailiffsDirectory()
      .then(setBailiffs)
      .catch(() => notifyError("Kon deurwaarders niet laden"));
  }, [open]);

  const handleClose = () => {
    setBailiffId("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!bailiffId) {
      notifyError("Selecteer een deurwaarder");
      return;
    }

    setLoading(true);
    try {
      await assignBailiffForExecution({ caseTransferId, bailiffId });
      notifySuccess("Vonnis overgedragen aan de deurwaarder");
      onTransferred();
      handleClose();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Overdracht mislukt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Transferir sentencia al agente judicial</DialogTitle>
      <DialogContent>
        <TextField
          select
          label="Agente judicial (alguacil)"
          required
          fullWidth
          size="small"
          sx={{ mt: 1 }}
          value={bailiffId}
          onChange={(e) => setBailiffId(e.target.value)}
        >
          {bailiffs.map((b) => (
            <MenuItem key={b.id} value={b.id}>
              {b.fullname}
            </MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annuleren</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          Transferir
        </Button>
      </DialogActions>
    </Dialog>
  );
};
