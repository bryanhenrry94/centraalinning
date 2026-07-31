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
  Alert,
} from "@mui/material";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { registerGopBailiffCost } from "@/modules/legal-process/actions/legal-process.actions";

interface BailiffCostDialogProps {
  open: boolean;
  onClose: () => void;
  verdictId: string;
  onRegistered: () => void;
}

const emptyState = {
  service_invoice_number: "",
  service_type: "",
  service_cost: "",
};

export const BailiffCostDialog: React.FC<BailiffCostDialogProps> = ({
  open,
  onClose,
  verdictId,
  onRegistered,
}) => {
  const [form, setForm] = useState(emptyState);
  const [loading, setLoading] = useState(false);

  const set = (field: keyof typeof emptyState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleClose = () => {
    setForm(emptyState);
    onClose();
  };

  const handleSubmit = async () => {
    if (!form.service_invoice_number || !form.service_type || !Number(form.service_cost)) {
      notifyError("Vul alle velden in");
      return;
    }

    setLoading(true);
    try {
      await registerGopBailiffCost({
        verdictId,
        service_invoice_number: form.service_invoice_number,
        service_type: form.service_type,
        service_cost: Number(form.service_cost),
      });
      notifySuccess("Deurwaarderskosten geregistreerd en gefactureerd (5%)");
      onRegistered();
      handleClose();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Registratie mislukt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Definitieve deurwaarderskosten registreren</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info">
            Bij registratie wordt automatisch 5% van dit bedrag aan de opdrachtgever gefactureerd.
          </Alert>
          <TextField
            label="Factuurnummer deurwaarder"
            size="small"
            required
            value={form.service_invoice_number}
            onChange={set("service_invoice_number")}
          />
          <TextField
            label="Type dienst / kosten"
            size="small"
            required
            value={form.service_type}
            onChange={set("service_type")}
          />
          <TextField
            label="Kosten"
            type="number"
            size="small"
            required
            value={form.service_cost}
            onChange={set("service_cost")}
          />
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
