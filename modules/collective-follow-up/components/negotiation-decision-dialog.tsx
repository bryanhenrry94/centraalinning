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
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { decideCopNegotiation } from "@/modules/collective-follow-up/actions/collective-collection.actions";
import { formatCurrency } from "@/shared/utils/formatters";

type Decision = "ACCEPT" | "ACCEPT_MODIFIED" | "REJECT";

interface NegotiationDecisionDialogProps {
  open: boolean;
  onClose: () => void;
  negotiationId: string;
  proposalAmount: number;
  onDecided: () => void;
}

export const NegotiationDecisionDialog: React.FC<NegotiationDecisionDialogProps> = ({
  open,
  onClose,
  negotiationId,
  proposalAmount,
  onDecided,
}) => {
  const [decision, setDecision] = useState<Decision>("ACCEPT");
  const [acceptedAmount, setAcceptedAmount] = useState(String(proposalAmount));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setDecision("ACCEPT");
    setAcceptedAmount(String(proposalAmount));
    setNotes("");
    onClose();
  };

  const handleDecisionChange = (_: unknown, value: Decision | null) => {
    if (!value) return;
    setDecision(value);
    if (value === "ACCEPT") setAcceptedAmount(String(proposalAmount));
  };

  const handleSubmit = async () => {
    if (decision === "ACCEPT_MODIFIED" && (!acceptedAmount || Number(acceptedAmount) <= 0)) {
      notifyError("Vul het aangepaste bedrag in");
      return;
    }
    if ((decision === "ACCEPT_MODIFIED" || decision === "REJECT") && !notes.trim()) {
      notifyError(
        decision === "REJECT"
          ? "Vermeld de reden van afwijzing"
          : "Leg uit waarom het bedrag werd aangepast",
      );
      return;
    }

    try {
      setSubmitting(true);
      await decideCopNegotiation({
        negotiationId,
        action: decision,
        acceptedAmount: decision === "ACCEPT_MODIFIED" ? Number(acceptedAmount) : null,
        notes: notes.trim() || null,
      });
      notifySuccess("De betalingsregeling is verwerkt.");
      onDecided();
      handleClose();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Kon de betalingsregeling niet verwerken");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Betalingsregeling beoordelen</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Voorgesteld bedrag: {formatCurrency(proposalAmount)}
          </Typography>
          <ToggleButtonGroup
            color="primary"
            exclusive
            fullWidth
            size="small"
            value={decision}
            onChange={handleDecisionChange}
          >
            <ToggleButton value="ACCEPT">Accepteren</ToggleButton>
            <ToggleButton value="ACCEPT_MODIFIED">Aanpassen</ToggleButton>
            <ToggleButton value="REJECT">Afwijzen</ToggleButton>
          </ToggleButtonGroup>

          {decision === "ACCEPT_MODIFIED" && (
            <TextField
              label="Aangepast bedrag"
              type="number"
              required
              size="small"
              value={acceptedAmount}
              onChange={(e) => setAcceptedAmount(e.target.value)}
            />
          )}

          {(decision === "ACCEPT_MODIFIED" || decision === "REJECT") && (
            <TextField
              label={decision === "REJECT" ? "Reden van afwijzing" : "Toelichting op de aanpassing"}
              required
              multiline
              minRows={2}
              size="small"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexDirection: "column", alignItems: "stretch", gap: 1, px: 3, pb: 2 }}>
        <Button variant="contained" color="primary" onClick={handleSubmit} disabled={submitting} fullWidth>
          {submitting ? "Bezig..." : "Bevestigen"}
        </Button>
        <Button onClick={handleClose}>Annuleren</Button>
      </DialogActions>
    </Dialog>
  );
};
