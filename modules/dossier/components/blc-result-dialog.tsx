"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { sendBlockCheckInvitation } from "@/modules/dossier/actions/dossier.actions";
import { DossierRow } from "@/modules/dossier/types/dossier.types";

interface BlcResultDialogProps {
  row: DossierRow;
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
}

export const BlcResultDialog = ({
  row,
  open,
  onClose,
  onInvited,
}: BlcResultDialogProps) => {
  const [sending, setSending] = useState(false);

  const canInvite = row.blockadeFound && !row.financialDeclarationInvited;

  const handleInvite = async () => {
    if (!row.blockCheckId) return;
    setSending(true);
    try {
      const result = await sendBlockCheckInvitation(row.blockCheckId);
      if (!result.success) {
        notifyError(result.error || "Kon de uitnodiging niet versturen");
        return;
      }
      notifySuccess("Uitnodiging verstuurd");
      onInvited();
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Blok-Check resultaat</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Debiteur
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {row.debtorName}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Datum
            </Typography>
            <Typography variant="body2">
              {formatDate(row.date.toString())}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Kosten
            </Typography>
            <Typography variant="body2">
              {row.claimed !== undefined ? formatCurrency(row.claimed) : "-"}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Resultaat
            </Typography>
            <Typography
              variant="body2"
              fontWeight={600}
              color={row.blockadeFound ? "error.main" : "success.main"}
            >
              {row.statusLabel}
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        {canInvite && (
          <Button onClick={handleInvite} disabled={sending} variant="contained">
            Uitnodiging versturen
          </Button>
        )}
        <Button onClick={onClose}>Sluiten</Button>
      </DialogActions>
    </Dialog>
  );
};
