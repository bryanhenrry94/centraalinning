"use client";

import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import { AgreementResponse } from "@/modules/agreement/services/agreement.validators";
import { isAgreementPending } from "@/modules/agreement/constants/agreement-status";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";

export interface AgreementDecision {
  status: "ACCEPTED" | "REJECTED";
  rejection_reason?: string;
  total_amount?: number;
  installment_amount?: number;
  installments_count?: number;
  start_date?: Date;
  end_date?: Date;
  comment?: string;
}

interface AgreementDecisionDialogProps {
  open: boolean;
  onClose: () => void;
  agreement: AgreementResponse | null;
  // El participante siempre puede decidir; el abogado/alguacil asignado
  // solo si el CaseTransfer tiene volmacht (power of attorney) otorgado —
  // esa condición la resuelve el llamador, este componente solo la refleja.
  canDecide: boolean;
  onDecide: (agreementId: string, decision: AgreementDecision) => Promise<unknown>;
  onDecided: () => void;
}

export const AgreementDecisionDialog: React.FC<AgreementDecisionDialogProps> = ({
  open,
  onClose,
  agreement,
  canDecide,
  onDecide,
  onDecided,
}) => {
  const [totalAmount, setTotalAmount] = useState("");
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [installmentsCount, setInstallmentsCount] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!agreement) return;
    setTotalAmount(String(agreement.total_amount));
    setInstallmentAmount(String(agreement.installment_amount));
    setInstallmentsCount(String(agreement.installments_count));
    setShowRejectReason(false);
    setRejectReason("");
  }, [agreement]);

  if (!agreement) return null;

  const pending = isAgreementPending(agreement.status);
  const modified =
    Number(totalAmount) !== agreement.total_amount ||
    Number(installmentAmount) !== agreement.installment_amount ||
    Number(installmentsCount) !== agreement.installments_count;

  const handleAccept = async () => {
    setProcessing(true);
    try {
      await onDecide(agreement.id, {
        status: "ACCEPTED",
        total_amount: Number(totalAmount),
        installment_amount: Number(installmentAmount),
        installments_count: Number(installmentsCount),
      });
      notifySuccess(modified ? "Acuerdo aceptado con ajustes." : "Acuerdo aceptado.");
      onDecided();
      onClose();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Actie mislukt");
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) return;
    setProcessing(true);
    try {
      await onDecide(agreement.id, { status: "REJECTED", rejection_reason: rejectReason.trim() });
      notifySuccess("Betalingsregeling afgewezen.");
      onDecided();
      onClose();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Actie mislukt");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
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
        Betalingsregeling — {pending ? "beoordelen" : "details"}
        <IconButton onClick={onClose} disabled={processing} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {!canDecide && pending && (
            <Alert severity="info">
              Este acuerdo está pendiente de la decisión del participante. Usted no tiene poder
              (volmacht) para decidir por su cuenta.
            </Alert>
          )}
          <TextField
            label="Totaalbedrag"
            type="number"
            size="small"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            disabled={!canDecide || !pending}
          />
          <TextField
            label="Bedrag per termijn"
            type="number"
            size="small"
            value={installmentAmount}
            onChange={(e) => setInstallmentAmount(e.target.value)}
            disabled={!canDecide || !pending}
          />
          <TextField
            label="Aantal termijnen"
            type="number"
            size="small"
            value={installmentsCount}
            onChange={(e) => setInstallmentsCount(e.target.value)}
            disabled={!canDecide || !pending}
          />
          {agreement.comment && (
            <Box>
              <Alert severity="info" variant="outlined">
                {agreement.comment}
              </Alert>
            </Box>
          )}
          {agreement.status === "REJECTED" && agreement.rejection_reason && (
            <Alert severity="error">{agreement.rejection_reason}</Alert>
          )}
          {canDecide && pending && showRejectReason && (
            <TextField
              label="Motivo del rechazo"
              size="small"
              required
              multiline
              minRows={2}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {canDecide && pending && !showRejectReason && (
          <>
            <Button
              color="error"
              onClick={() => setShowRejectReason(true)}
              disabled={processing}
            >
              Afwijzen
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleAccept}
              disabled={processing || !totalAmount || !installmentAmount || !installmentsCount}
            >
              {modified ? "Aanpassen en accepteren" : "Accepteren"}
            </Button>
          </>
        )}
        {canDecide && pending && showRejectReason && (
          <>
            <Button onClick={() => setShowRejectReason(false)} disabled={processing}>
              Terug
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleConfirmReject}
              disabled={processing || !rejectReason.trim()}
            >
              Bevestig afwijzing
            </Button>
          </>
        )}
        <Button onClick={onClose} disabled={processing}>
          Sluiten
        </Button>
      </DialogActions>
    </Dialog>
  );
};
