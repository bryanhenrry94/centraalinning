"use client";
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  TextField,
  MenuItem,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { getActiveBailiffsDirectory } from "@/modules/bailiff/actions/bailiff.actions";
import { Bailiff } from "@/modules/bailiff/services/bailiff.validators";
import { changeGopBailiff } from "@/modules/legal-process/actions/legal-process.actions";

interface ChangeBailiffDialogProps {
  open: boolean;
  onClose: () => void;
  legalProcessId: string;
  currentBailiffId?: string | null;
  onRegistered: () => void;
}

export const ChangeBailiffDialog: React.FC<ChangeBailiffDialogProps> = ({
  open,
  onClose,
  legalProcessId,
  currentBailiffId,
  onRegistered,
}) => {
  const [bailiffs, setBailiffs] = useState<Bailiff[]>([]);
  const [newBailiffId, setNewBailiffId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    getActiveBailiffsDirectory()
      .then(setBailiffs)
      .catch(() => notifyError("Kon deurwaarders niet laden"));
  }, [open]);

  const handleClose = () => {
    setNewBailiffId("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!newBailiffId) {
      notifyError("Selecteer een deurwaarder");
      return;
    }

    setLoading(true);
    try {
      await changeGopBailiff({ legalProcessId, newBailiffId });
      notifySuccess("Deurwaarder gewijzigd");
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
        Deurwaarder wijzigen
        <IconButton onClick={handleClose} disabled={loading} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <TextField
          select
          label="Nieuwe deurwaarder"
          required
          fullWidth
          size="small"
          sx={{ mt: 1 }}
          value={newBailiffId}
          onChange={(e) => setNewBailiffId(e.target.value)}
        >
          {bailiffs
            .filter((b) => b.id !== currentBailiffId)
            .map((b) => (
              <MenuItem key={b.id} value={b.id}>
                {b.fullname}
              </MenuItem>
            ))}
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annuleren</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          Wijzigen
        </Button>
      </DialogActions>
    </Dialog>
  );
};
