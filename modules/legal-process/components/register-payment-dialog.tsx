"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { registerGopPayment } from "@/modules/legal-process/actions/legal-process.actions";
import { formatCurrency } from "@/shared/utils/formatters";

interface RegisterPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  legalProcessId: string;
  balanceAmount?: number;
  onRegistered: () => void;
}

export const RegisterPaymentDialog: React.FC<RegisterPaymentDialogProps> = ({
  open,
  onClose,
  legalProcessId,
  balanceAmount,
  onRegistered,
}) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setAmount("");
    onClose();
  };

  const handleSubmit = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      notifyError("Voer een geldig bedrag in");
      return;
    }

    setLoading(true);
    try {
      await registerGopPayment(legalProcessId, value);
      notifySuccess("Betaling geregistreerd");
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
      <DialogTitle>Betaling registreren</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {balanceAmount !== undefined && (
            <Typography variant="body2" color="text.secondary">
              Openstaand saldo: {formatCurrency(balanceAmount)}
            </Typography>
          )}
          <TextField
            label="Bedrag"
            type="number"
            size="small"
            required
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {balanceAmount !== undefined && (
            <Button size="small" onClick={() => setAmount(String(balanceAmount))}>
              Volledig saldo invullen
            </Button>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annuleren</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          Registreren
        </Button>
      </DialogActions>
    </Dialog>
  );
};
