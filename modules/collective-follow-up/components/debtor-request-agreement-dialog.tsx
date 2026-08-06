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
} from "@mui/material";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { requestCopPaymentAgreement } from "@/modules/collective-follow-up/actions/collective-collection.actions";

interface DebtorRequestAgreementDialogProps {
  open: boolean;
  onClose: () => void;
  collectionId: string;
  onRequested: () => void;
}

export const DebtorRequestAgreementDialog: React.FC<DebtorRequestAgreementDialogProps> = ({
  open,
  onClose,
  collectionId,
  onRequested,
}) => {
  const [proposalAmount, setProposalAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setProposalAmount("");
    setNotes("");
    onClose();
  };

  const handleSubmit = async () => {
    const amount = Number(proposalAmount);
    if (!amount || amount <= 0) {
      notifyError("Vul een geldig bedrag in");
      return;
    }

    try {
      setSubmitting(true);
      await requestCopPaymentAgreement({
        collectionId,
        proposalAmount: amount,
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
      <DialogTitle>Betalingsregeling aanvragen</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Voorgesteld bedrag"
            type="number"
            required
            size="small"
            value={proposalAmount}
            onChange={(e) => setProposalAmount(e.target.value)}
          />
          <TextField
            label="Toelichting (optioneel)"
            multiline
            minRows={2}
            size="small"
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
