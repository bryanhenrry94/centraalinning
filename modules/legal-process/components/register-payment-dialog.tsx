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
  MenuItem,
  Typography,
  Alert,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloseIcon from "@mui/icons-material/Close";
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
  const [receivedBy, setReceivedBy] = useState<"BAILIFF" | "PARTICIPANT">("BAILIFF");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setAmount("");
    setReceivedBy("BAILIFF");
    setFile(null);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };

  const handleSubmit = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      notifyError("Voer een geldig bedrag in");
      return;
    }
    if (!file) {
      notifyError("Upload het betalingsbewijs");
      return;
    }

    setLoading(true);
    try {
      await registerGopPayment(legalProcessId, { amount: value, receivedBy }, file);
      notifySuccess("Betaling geregistreerd. In afwachting van bevestiging door de andere partij.");
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
        Betaling registreren
        <IconButton onClick={handleClose} disabled={loading} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info">
            El pago no se aplica al saldo hasta que la otra parte (el alguacil o el participante,
            según quién lo recibió) lo confirme.
          </Alert>
          {balanceAmount !== undefined && (
            <Typography variant="body2" color="text.secondary">
              Openstaand saldo: {formatCurrency(balanceAmount)}
            </Typography>
          )}
          <TextField
            select
            label="Ontvangen door"
            size="small"
            required
            value={receivedBy}
            onChange={(e) => setReceivedBy(e.target.value as "BAILIFF" | "PARTICIPANT")}
          >
            <MenuItem value="BAILIFF">De deurwaarder</MenuItem>
            <MenuItem value="PARTICIPANT">De deelnemer</MenuItem>
          </TextField>
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
          <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
            {file ? file.name : "Betalingsbewijs uploaden"}
            <input type="file" hidden onChange={handleFileChange} />
          </Button>
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
