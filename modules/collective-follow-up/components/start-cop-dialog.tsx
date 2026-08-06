"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
} from "@mui/material";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { startCollectiveCollection } from "@/modules/collective-follow-up/actions/collective-collection.actions";

interface StartCopDialogProps {
  open: boolean;
  onClose: () => void;
  debtClaimId: string;
  onStarted: (collectionId: string) => void;
}

export const StartCopDialog: React.FC<StartCopDialogProps> = ({
  open,
  onClose,
  debtClaimId,
  onStarted,
}) => {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const collection = await startCollectiveCollection({ debtClaimId });
      notifySuccess("Collectieve Opvolging gestart.");
      onStarted(collection.id);
      onClose();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Kon de Collectieve Opvolging niet starten");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Collectieve Opvolging starten</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          CFSB controleert automatisch of de debiteur werkzaam is bij een aangesloten deelnemer en
          informeert de debiteur dat er nog kan worden betaald of een betalingsregeling kan worden
          aangevraagd, om een gerechtelijke procedure te voorkomen.
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Weet u zeker dat u een Collectieve Opvolging wilt starten voor dit dossier?
        </Typography>
      </DialogContent>
      <DialogActions sx={{ flexDirection: "column", alignItems: "stretch", gap: 1, px: 3, pb: 2 }}>
        <Button variant="contained" color="primary" onClick={handleSubmit} disabled={submitting} fullWidth>
          {submitting ? "Bezig..." : "Collectieve Opvolging starten"}
        </Button>
        <Button onClick={onClose}>Annuleren</Button>
      </DialogActions>
    </Dialog>
  );
};
