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
import { markGopInactive } from "@/modules/legal-process/actions/legal-process.actions";
import { GopInactiveReason } from "@/modules/legal-process/constants/legal-process-status";
import { getGopInactiveReasonLabel } from "@/modules/legal-process/utils/legal-process-status";

interface MarkInactiveDialogProps {
  open: boolean;
  onClose: () => void;
  legalProcessId: string;
  onRegistered: () => void;
}

const REASON_OPTIONS = Object.values(GopInactiveReason);

const REVIEW_PRESETS = [
  { label: "3 maanden", months: 3 },
  { label: "6 maanden", months: 6 },
  { label: "12 maanden", months: 12 },
];

export const MarkInactiveDialog: React.FC<MarkInactiveDialogProps> = ({
  open,
  onClose,
  legalProcessId,
  onRegistered,
}) => {
  const [reason, setReason] = useState<GopInactiveReason | "">("");
  const [reviewDate, setReviewDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setReason("");
    setReviewDate("");
    setNotes("");
    onClose();
  };

  const applyPreset = (months: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    setReviewDate(date.toISOString().split("T")[0]);
  };

  const handleSubmit = async () => {
    if (!reason || !reviewDate) {
      notifyError("Selecteer een reden en een revisiedatum");
      return;
    }

    setLoading(true);
    try {
      await markGopInactive({
        legalProcessId,
        reason: reason as GopInactiveReason,
        reviewDate: new Date(reviewDate),
        notes,
      });
      notifySuccess("GOP gemarkeerd als Inactief");
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
      <DialogTitle>Zonder resultaat (GOP Inactief)</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label="Reden"
            required
            size="small"
            value={reason}
            onChange={(e) => setReason(e.target.value as GopInactiveReason)}
          >
            {REASON_OPTIONS.map((r) => (
              <MenuItem key={r} value={r}>
                {getGopInactiveReasonLabel(r)}
              </MenuItem>
            ))}
          </TextField>

          <Stack direction="row" spacing={1}>
            {REVIEW_PRESETS.map((preset) => (
              <Button key={preset.months} size="small" onClick={() => applyPreset(preset.months)}>
                {preset.label}
              </Button>
            ))}
          </Stack>

          <TextField
            label="Revisiedatum"
            type="date"
            size="small"
            required
            slotProps={{ inputLabel: { shrink: true } }}
            value={reviewDate}
            onChange={(e) => setReviewDate(e.target.value)}
          />

          <TextField
            label="Opmerkingen"
            size="small"
            multiline
            minRows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annuleren</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          Bevestigen
        </Button>
      </DialogActions>
    </Dialog>
  );
};
