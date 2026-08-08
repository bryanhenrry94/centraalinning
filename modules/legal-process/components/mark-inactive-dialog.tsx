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
  Alert,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import {
  markGopInactive,
  uploadLegalProcessDocument,
} from "@/modules/legal-process/actions/legal-process.actions";
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

const todayISO = () => new Date().toISOString().split("T")[0];

// "Geen executiemogelijkheid" — de sentencia blijft geregistreerd, het
// dossier blijft open en de blokkade blijft actief. Zodra een nieuwe
// executiemaatregel/rente-update/kost geregistreerd wordt, reactiveert het
// dossier automatisch naar GOP Actief.
export const MarkInactiveDialog: React.FC<MarkInactiveDialogProps> = ({
  open,
  onClose,
  legalProcessId,
  onRegistered,
}) => {
  const [reason, setReason] = useState<GopInactiveReason | "">("");
  const [foundAt, setFoundAt] = useState(todayISO());
  const [reviewDate, setReviewDate] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setReason("");
    setFoundAt(todayISO());
    setReviewDate("");
    setNotes("");
    setFile(null);
    onClose();
  };

  const applyPreset = (months: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    setReviewDate(date.toISOString().split("T")[0]);
  };

  const handleSubmit = async () => {
    if (!reason || !foundAt || !reviewDate) {
      notifyError("Selecteer een reden, de datum van bevinding en een controledatum");
      return;
    }

    setLoading(true);
    try {
      await markGopInactive({
        legalProcessId,
        reason: reason as GopInactiveReason,
        foundAt: new Date(foundAt),
        reviewDate: new Date(reviewDate),
        notes,
      });

      if (file) {
        await uploadLegalProcessDocument(legalProcessId, file, "Executieonderzoek");
      }

      notifySuccess("Dossier staat nu in onderzoek naar executiemogelijkheden");
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
      <DialogTitle>Geen executiemogelijkheid registreren</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info">
            Het dossier blijft open en de blokkade actief. Zodra een nieuwe executiemogelijkheid
            gevonden wordt, registreert u een executiemaatregel en reactiveert het GOP automatisch.
          </Alert>

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

          <TextField
            label="Datum van bevinding"
            type="date"
            size="small"
            required
            slotProps={{ inputLabel: { shrink: true } }}
            value={foundAt}
            onChange={(e) => setFoundAt(e.target.value)}
          />

          <Stack direction="row" spacing={1}>
            {REVIEW_PRESETS.map((preset) => (
              <Button key={preset.months} size="small" onClick={() => applyPreset(preset.months)}>
                {preset.label}
              </Button>
            ))}
          </Stack>

          <TextField
            label="Controledatum"
            type="date"
            size="small"
            required
            slotProps={{ inputLabel: { shrink: true } }}
            value={reviewDate}
            onChange={(e) => setReviewDate(e.target.value)}
          />

          <TextField
            label="Toelichting"
            size="small"
            multiline
            minRows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
            {file ? file.name : "Bewijs/document toevoegen (optioneel)"}
            <input type="file" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Button>
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
