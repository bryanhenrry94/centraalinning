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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { registerGopInterestUpdate } from "@/modules/legal-process/actions/legal-process.actions";

interface InterestUpdateDialogProps {
  open: boolean;
  onClose: () => void;
  verdictId: string;
  onRegistered: () => void;
}

const emptyState = {
  interest_type: "Wettelijke rente",
  base_amount: "",
  calculation_start: "",
  calculation_end: "",
  total_interest: "",
};

export const InterestUpdateDialog: React.FC<InterestUpdateDialogProps> = ({
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
    if (!form.calculation_start || !form.calculation_end || !form.total_interest) {
      notifyError("Vul de periode en het rentebedrag in");
      return;
    }

    setLoading(true);
    try {
      await registerGopInterestUpdate({
        verdictId,
        interest: {
          interest_type: form.interest_type,
          base_amount: Number(form.base_amount) || 0,
          calculation_start: new Date(form.calculation_start),
          calculation_end: new Date(form.calculation_end),
          total_interest: Number(form.total_interest),
          details: [],
        },
      });
      notifySuccess("Rente-update geregistreerd");
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
        Rente-update registreren
        <IconButton onClick={handleClose} disabled={loading} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Type rente"
            size="small"
            value={form.interest_type}
            onChange={set("interest_type")}
          />
          <TextField
            label="Grondslag (hoofdsom)"
            type="number"
            size="small"
            value={form.base_amount}
            onChange={set("base_amount")}
          />
          <TextField
            label="Periode vanaf"
            type="date"
            size="small"
            required
            slotProps={{ inputLabel: { shrink: true } }}
            value={form.calculation_start}
            onChange={set("calculation_start")}
          />
          <TextField
            label="Periode tot"
            type="date"
            size="small"
            required
            slotProps={{ inputLabel: { shrink: true } }}
            value={form.calculation_end}
            onChange={set("calculation_end")}
          />
          <TextField
            label="Totaal berekende rente"
            type="number"
            size="small"
            required
            value={form.total_interest}
            onChange={set("total_interest")}
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
