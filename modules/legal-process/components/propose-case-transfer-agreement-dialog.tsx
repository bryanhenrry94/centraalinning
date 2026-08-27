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
import { proposeCaseTransferAgreement } from "@/modules/legal-process/actions/case-transfer.actions";

interface ProposeCaseTransferAgreementDialogProps {
  open: boolean;
  onClose: () => void;
  caseTransferId: string;
  onRegistered: () => void;
}

export const ProposeCaseTransferAgreementDialog: React.FC<ProposeCaseTransferAgreementDialogProps> = ({
  open,
  onClose,
  caseTransferId,
  onRegistered,
}) => {
  const [totalAmount, setTotalAmount] = useState("");
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [installmentsCount, setInstallmentsCount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setTotalAmount("");
    setInstallmentAmount("");
    setInstallmentsCount("");
    setStartDate("");
    setComment("");
    onClose();
  };

  const handleSubmit = async () => {
    const count = Number(installmentsCount);
    if (!totalAmount || !installmentAmount || !count || !startDate) {
      notifyError("Vul alle verplichte velden in");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + count);

    setLoading(true);
    try {
      await proposeCaseTransferAgreement(caseTransferId, {
        total_amount: Number(totalAmount),
        installment_amount: Number(installmentAmount),
        installments_count: count,
        start_date: start,
        end_date: end,
        comment,
      });
      notifySuccess("Betalingsregeling voorgesteld, in afwachting van de deelnemer");
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
        Betalingsregeling voorstellen
        <IconButton onClick={handleClose} disabled={loading} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Totaalbedrag"
            type="number"
            size="small"
            required
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
          />
          <TextField
            label="Bedrag per termijn"
            type="number"
            size="small"
            required
            value={installmentAmount}
            onChange={(e) => setInstallmentAmount(e.target.value)}
          />
          <TextField
            label="Aantal termijnen"
            type="number"
            size="small"
            required
            value={installmentsCount}
            onChange={(e) => setInstallmentsCount(e.target.value)}
          />
          <TextField
            label="Startdatum"
            type="date"
            size="small"
            required
            slotProps={{ inputLabel: { shrink: true } }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <TextField
            label="Opmerkingen"
            size="small"
            multiline
            minRows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annuleren</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          Voorstellen
        </Button>
      </DialogActions>
    </Dialog>
  );
};
