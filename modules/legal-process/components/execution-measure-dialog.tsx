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
  MenuItem,
} from "@mui/material";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { registerGopExecutionMeasure } from "@/modules/legal-process/actions/legal-process.actions";

interface ExecutionMeasureDialogProps {
  open: boolean;
  onClose: () => void;
  verdictId: string;
  onRegistered: () => void;
}

const MEASURE_TYPES = [
  { value: "BANK_ACCOUNT", label: "Beslag bankrekening" },
  { value: "SALARY", label: "Loonbeslag" },
  { value: "MOVABLE_PROPERTY", label: "Beslag roerende goederen" },
  { value: "IMMOVABLE_PROPERTY", label: "Beslag onroerend goed" },
  { value: "THIRD_PARTY", label: "Derdenbeslag" },
  { value: "JUDICIAL_SALE", label: "Gerechtelijke verkoop" },
  { value: "OTHER", label: "Andere maatregel" },
];

const emptyState = {
  embargo_type: "",
  company_name: "",
  company_phone: "",
  company_email: "",
  company_address: "",
  embargo_date: "",
  embargo_amount: "",
  total_amount: "",
};

export const ExecutionMeasureDialog: React.FC<ExecutionMeasureDialogProps> = ({
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
    if (!form.embargo_type || !form.embargo_date) {
      notifyError("Vul het type maatregel en de datum in");
      return;
    }

    setLoading(true);
    try {
      await registerGopExecutionMeasure({
        verdictId,
        embargo_type: form.embargo_type,
        embargo_date: new Date(form.embargo_date),
        embargo_amount: Number(form.embargo_amount) || 0,
        total_amount: Number(form.total_amount) || Number(form.embargo_amount) || 0,
        company_name: form.company_name,
        company_phone: form.company_phone,
        company_email: form.company_email,
        company_address: form.company_address,
      });
      notifySuccess("Executiemaatregel geregistreerd");
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
      <DialogTitle>Executiemaatregel registreren</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label="Type maatregel"
            required
            size="small"
            value={form.embargo_type}
            onChange={set("embargo_type")}
          >
            {MEASURE_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Datum"
            type="date"
            size="small"
            required
            slotProps={{ inputLabel: { shrink: true } }}
            value={form.embargo_date}
            onChange={set("embargo_date")}
          />
          <TextField
            label="Beslagen bedrag"
            type="number"
            size="small"
            value={form.embargo_amount}
            onChange={set("embargo_amount")}
          />
          <TextField
            label="Totaalbedrag (indien anders)"
            type="number"
            size="small"
            value={form.total_amount}
            onChange={set("total_amount")}
          />
          <TextField
            label="Naam derde / entiteit"
            size="small"
            value={form.company_name}
            onChange={set("company_name")}
          />
          <TextField
            label="Telefoon"
            size="small"
            value={form.company_phone}
            onChange={set("company_phone")}
          />
          <TextField
            label="E-mailadres"
            size="small"
            value={form.company_email}
            onChange={set("company_email")}
          />
          <TextField
            label="Adres"
            size="small"
            value={form.company_address}
            onChange={set("company_address")}
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
