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
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import UploadFileIcon from "@mui/icons-material/UploadFile";
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
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (field: keyof typeof emptyState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };

  const handleClose = () => {
    setForm(emptyState);
    setFile(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!form.service_invoice_number || !form.service_type || !Number(form.service_cost)) {
      notifyError("Vul alle velden in");
      return;
    }

    setLoading(true);
    try {
      await registerGopBailiffCost(
        {
          verdictId,
          service_invoice_number: form.service_invoice_number,
          service_type: form.service_type,
          service_cost: Number(form.service_cost),
        },
        file ?? undefined,
      );
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
        Definitieve deurwaarderskosten registreren
        <IconButton onClick={handleClose} disabled={loading} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info">
            De CFSB-commissie (5%) wordt pas berekend bij het afronden van het werk (gezamenlijke
            factuur), over de som van alle geregistreerde kostenregels.
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
          <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
            {file ? file.name : "Document uploaden (optioneel)"}
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
