"use client";
import React, { useEffect, useState } from "react";
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
import { requestCopPaymentAgreement } from "@/modules/collective-follow-up/actions/collective-collection.actions";
import { formatCurrency } from "@/shared/utils/formatters";

interface DebtorRequestAgreementDialogProps {
  open: boolean;
  onClose: () => void;
  collectionId: string;
  outstandingAmount: number;
  onRequested: () => void;
}

export const DebtorRequestAgreementDialog: React.FC<DebtorRequestAgreementDialogProps> = ({
  open,
  onClose,
  collectionId,
  outstandingAmount,
  onRequested,
}) => {
  const [startDate, setStartDate] = useState("");
  const [installmentsCount, setInstallmentsCount] = useState("1");
  const [installmentAmount, setInstallmentAmount] = useState(0);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Termijnbedrag en einddatum worden altijd afgeleid van het openstaande
  // bedrag en de gebruikersinvoer — nooit rechtstreeks door de gebruiker
  // in te vullen (zelfde patroon als agreement-form.tsx:81-88).
  useEffect(() => {
    const count = Number(installmentsCount);
    if (outstandingAmount > 0 && count > 0) {
      setInstallmentAmount(Math.round((outstandingAmount / count) * 100) / 100);
    } else {
      setInstallmentAmount(0);
    }

    if (startDate && count > 0) {
      const end = new Date(startDate);
      end.setMonth(end.getMonth() + count);
      setEndDate(end);
    } else {
      setEndDate(null);
    }
  }, [outstandingAmount, installmentsCount, startDate]);

  const handleClose = () => {
    setStartDate("");
    setInstallmentsCount("1");
    setNotes("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!startDate) {
      notifyError("Vul de gewenste startdatum in");
      return;
    }
    const count = Number(installmentsCount);
    if (!count || count <= 0) {
      notifyError("Het aantal termijnen moet groter zijn dan 0");
      return;
    }

    try {
      setSubmitting(true);
      await requestCopPaymentAgreement({
        collectionId,
        installmentsCount: count,
        startDate: new Date(startDate),
        notes: notes.trim() || null,
      });
      notifySuccess("Uw voorstel voor een betalingsregeling is verzonden.");
      onRequested();
      handleClose();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Kon de betalingsregeling niet aanvragen");
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
        Betalingsregeling aanvragen
        <IconButton onClick={handleClose} disabled={submitting} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Openstaand bedrag"
            value={formatCurrency(outstandingAmount)}
            disabled
            fullWidth
            size="small"
          />

          <TextField
            label="Gewenste startdatum"
            type="date"
            required
            size="small"
            fullWidth
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            helperText="Vanaf welke datum wilt u starten?"
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <TextField
            label="Aantal termijnen"
            type="number"
            required
            size="small"
            fullWidth
            value={installmentsCount}
            onChange={(e) => setInstallmentsCount(e.target.value)}
            helperText="In hoeveel maandelijkse termijnen wilt u betalen?"
          />

          <TextField
            label="Termijnbedrag (maandelijks)"
            value={formatCurrency(installmentAmount)}
            disabled
            fullWidth
            size="small"
            helperText="Automatisch berekend: openstaand bedrag ÷ aantal termijnen."
          />

          <TextField
            label="Verwachte einddatum"
            value={endDate ? endDate.toISOString().slice(0, 10) : ""}
            disabled
            fullWidth
            size="small"
            helperText="Automatisch berekend op basis van startdatum en aantal termijnen."
          />

          <TextField
            label="Toelichting (optioneel)"
            multiline
            minRows={2}
            size="small"
            fullWidth
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexDirection: "column", alignItems: "stretch", gap: 1, px: 3, pb: 2 }}>
        <Button variant="contained" color="primary" onClick={handleSubmit} disabled={submitting} fullWidth>
          {submitting ? "Bezig..." : "Voorstel verzenden"}
        </Button>
        <Button onClick={handleClose}>Annuleren</Button>
      </DialogActions>
    </Dialog>
  );
};
