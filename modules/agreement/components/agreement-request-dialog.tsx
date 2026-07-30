"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import {
  getPaymentAgreementDetail,
  notifyApprovalAgreement,
  updatePaymentAgreement,
} from "@/modules/agreement/actions/agreement.actions";
import { AgreementResponse } from "@/modules/agreement/services/agreement.validators";
import { AgreementStatus, isAgreementPending } from "@/modules/agreement/constants/agreement-status";
import { AlertService } from "@/shared/ui/alerts";
import { notifyError, notifyInfo } from "@/shared/ui/notifications";
import { formatCurrency, formatDate, formatDateTime } from "@/shared/utils/formatters";

interface AgreementRequestDialogProps {
  open: boolean;
  agreementId: string | null;
  onClose: () => void;
  onResolved?: () => void;
}

const Field = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <Box sx={{ mb: 1.5 }}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={600}>
      {value || "-"}
    </Typography>
  </Box>
);

export const AgreementRequestDialog: React.FC<AgreementRequestDialogProps> = ({
  open,
  agreementId,
  onClose,
  onResolved,
}) => {
  const [agreement, setAgreement] = useState<AgreementResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (!open || !agreementId) return;
    setLoading(true);
    getPaymentAgreementDetail(agreementId)
      .then(setAgreement)
      .catch(() => notifyError("Kon betalingsverzoek niet laden."))
      .finally(() => setLoading(false));
  }, [open, agreementId]);

  const handleClose = () => {
    setAgreement(null);
    onClose();
  };

  const handleAccept = () => {
    if (!agreement) return;
    AlertService.showConfirm(
      "Wilt u deze betalingsregeling accepteren?",
      "",
      "JA",
      "NEE",
    ).then(async (confirmed) => {
      if (!confirmed) return;
      setProcessing(true);
      try {
        await updatePaymentAgreement(agreement.id, { status: AgreementStatus.ACCEPTED });
        await notifyApprovalAgreement(agreement.id);
        notifyInfo("Betalingsregeling succesvol goedgekeurd.");
        onResolved?.();
        handleClose();
      } catch (err) {
        notifyError(err instanceof Error ? err.message : "Kon de betalingsregeling niet goedkeuren.");
      } finally {
        setProcessing(false);
      }
    });
  };

  // Un rechazo sin motivo deja al deudor sin poder ajustar una nueva
  // solicitud; por eso el motivo es obligatorio (el botón permanece
  // deshabilitado hasta que haya texto). Se usa un Dialog de MUI anidado en
  // vez de AlertService.showConfirmWithInput: ese helper inyecta un <input>
  // vía SweetAlert fuera del árbol de React, y compite por el foco con el
  // FocusTrap del Dialog de MUI que ya está abierto, dejando el campo
  // inutilizable.
  const handleReject = () => {
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!agreement || !rejectReason.trim()) return;
    setProcessing(true);
    try {
      await updatePaymentAgreement(agreement.id, {
        status: AgreementStatus.REJECTED,
        rejection_reason: rejectReason.trim(),
      });
      notifyInfo("Betalingsregeling afgewezen.");
      setRejectDialogOpen(false);
      onResolved?.();
      handleClose();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Kon de betalingsregeling niet afwijzen.");
    } finally {
      setProcessing(false);
    }
  };

  const pending = agreement ? isAgreementPending(agreement.status) : false;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <Box
        sx={{
          bgcolor: "secondary.main",
          color: "white",
          px: 2,
          py: 1.5,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Betalingsverzoek details
          {agreement?.debtClaim_reference ? ` — ${agreement.debtClaim_reference}` : ""}
        </Typography>
        <IconButton sx={{ color: "white" }} onClick={handleClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent>
        {loading || !agreement ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Box sx={{ py: 1 }}>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                  Verzoek informatie
                </Typography>
                <Field
                  label="Aangevraagd op"
                  value={agreement.created_at ? formatDateTime(agreement.created_at.toString()) : undefined}
                />
                <Field
                  label="Voorgesteld termijnbedrag"
                  value={formatCurrency(agreement.installment_amount)}
                />
                <Field label="Aantal termijnen" value={agreement.installments_count} />
                <Field label="Eerste betaaldatum" value={formatDate(agreement.start_date.toString())} />
                <Field label="Laatste betaaldatum" value={formatDate(agreement.end_date.toString())} />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                  Debiteur (aanvrager)
                </Typography>
                <Field label="Naam" value={agreement.debtor?.fullname} />
                <Field label="CFSB Persoonsnummer" value={agreement.debtor?.personal_number} />
                <Field label="E-mailadres" value={agreement.debtor?.email} />
                <Field label="Telefoonnummer" value={agreement.debtor?.phone} />
              </Grid>
            </Grid>

            {agreement.comment && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Opmerking
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {agreement.comment}
                </Typography>
              </>
            )}

            {!pending && agreement.status === AgreementStatus.REJECTED && agreement.rejection_reason && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Motivo van afwijzing
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {agreement.rejection_reason}
                </Typography>
              </>
            )}
          </Box>
        )}
      </DialogContent>

      <Stack
        direction="row"
        spacing={1}
        justifyContent="flex-end"
        sx={{ px: 2, py: 1.5, borderTop: "1px solid", borderColor: "divider" }}
      >
        {pending && (
          <>
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckIcon />}
              disabled={processing || loading}
              onClick={handleAccept}
            >
              Accepteren
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<CloseRoundedIcon />}
              disabled={processing || loading}
              onClick={handleReject}
            >
              Afwijzen
            </Button>
          </>
        )}
        <Button onClick={handleClose} disabled={processing}>
          Sluiten
        </Button>
      </Stack>

      <Dialog
        open={rejectDialogOpen}
        onClose={() => !processing && setRejectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Motivo van afwijzing</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Leg uit waarom dit verzoek wordt afgewezen. De deelnemer ziet dit en
            kan een nieuw voorstel indienen.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Bijvoorbeeld: het voorgestelde termijnbedrag is te laag gezien de openstaande schuld."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)} disabled={processing}>
            Annuleren
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={processing || !rejectReason.trim()}
            onClick={handleConfirmReject}
          >
            Afwijzen
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};
