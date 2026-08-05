"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";

import {
  getGopPaymentConfirmations,
  confirmGopPayment,
  disputeGopPayment,
  correctGopPayment,
} from "@/modules/legal-process/actions/legal-process.actions";
import { formatCurrency, formatDateTime } from "@/shared/utils/formatters";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { AlertService } from "@/shared/ui/alerts";

type PaymentConfirmation = Awaited<ReturnType<typeof getGopPaymentConfirmations>>[number];

const STATUS_LABEL: Record<string, string> = {
  REGISTERED: "Geregistreerd",
  AWAITING_CONFIRMATION: "In afwachting van bevestiging",
  CONFIRMED: "Bevestigd",
  DISPUTED: "Betwist",
  CORRECTED: "Gecorrigeerd — opnieuw in afwachting",
};

const STATUS_COLOR: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  REGISTERED: "default",
  AWAITING_CONFIRMATION: "info",
  CONFIRMED: "success",
  DISPUTED: "error",
  CORRECTED: "warning",
};

interface GopPaymentConfirmationsProps {
  legalProcessId: string;
  currentUserId?: string;
  // Confirmar/disputar es de la CONTRAPARTE de quien recibió el pago: si lo
  // recibió el alguacil, confirma el staff; si lo recibió el participante,
  // confirma el alguacil asignado — el server-side vuelve a verificar esto.
  isStaff: boolean;
  isBailiffRole: boolean;
  onChanged: () => void;
}

export const GopPaymentConfirmations: React.FC<GopPaymentConfirmationsProps> = ({
  legalProcessId,
  currentUserId,
  isStaff,
  isBailiffRole,
  onChanged,
}) => {
  const [items, setItems] = useState<PaymentConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [disputeTarget, setDisputeTarget] = useState<PaymentConfirmation | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [correctTarget, setCorrectTarget] = useState<PaymentConfirmation | null>(null);
  const [correctAmount, setCorrectAmount] = useState("");
  const [correctNote, setCorrectNote] = useState("");
  const [correctFile, setCorrectFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setItems(await getGopPaymentConfirmations(legalProcessId));
    } catch (error) {
      notifyError("Kon betalingen niet laden");
    } finally {
      setLoading(false);
    }
  }, [legalProcessId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleConfirm = async (confirmation: PaymentConfirmation) => {
    const confirmed = await AlertService.showConfirm(
      "Betaling bevestigen?",
      `Bevestig dat ${formatCurrency(confirmation.payment.total_amount)} correct is ontvangen.`,
      "Ja, bevestigen",
      "Annuleren",
    );
    if (!confirmed) return;

    try {
      await confirmGopPayment(confirmation.id);
      notifySuccess("Betaling bevestigd en toegepast op het saldo.");
      await load();
      onChanged();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Actie mislukt");
    }
  };

  const handleConfirmDispute = async () => {
    if (!disputeTarget || !disputeReason.trim()) return;
    setProcessing(true);
    try {
      await disputeGopPayment(disputeTarget.id, disputeReason.trim());
      notifySuccess("Betaling betwist.");
      setDisputeTarget(null);
      setDisputeReason("");
      await load();
      onChanged();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Actie mislukt");
    } finally {
      setProcessing(false);
    }
  };

  const openCorrect = (confirmation: PaymentConfirmation) => {
    setCorrectTarget(confirmation);
    setCorrectAmount(String(confirmation.payment.total_amount));
    setCorrectNote("");
    setCorrectFile(null);
  };

  const handleConfirmCorrect = async () => {
    if (!correctTarget) return;
    setProcessing(true);
    try {
      await correctGopPayment(
        correctTarget.id,
        { amount: Number(correctAmount) || undefined, note: correctNote.trim() || undefined },
        correctFile ?? undefined,
      );
      notifySuccess("Betaling gecorrigeerd, opnieuw in afwachting van bevestiging.");
      setCorrectTarget(null);
      await load();
      onChanged();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Actie mislukt");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return null;
  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Nog geen betalingen geregistreerd.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5}>
      {items.map((item) => {
        const isCounterpart =
          item.receivedBy === "BAILIFF" ? isStaff : isBailiffRole;
        const canDecide =
          ["AWAITING_CONFIRMATION", "CORRECTED"].includes(item.status) && isCounterpart;
        const canCorrect = item.status === "DISPUTED" && item.recordedById === currentUserId;

        return (
          <Box key={item.id} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {formatCurrency(item.payment.total_amount)} — ontvangen door{" "}
                  {item.receivedBy === "BAILIFF" ? "de deurwaarder" : "de deelnemer"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDateTime(item.recordedAt.toString())}
                </Typography>
              </Box>
              <Chip size="small" label={STATUS_LABEL[item.status] ?? item.status} color={STATUS_COLOR[item.status] ?? "default"} />
            </Stack>

            {item.status === "DISPUTED" && item.disputeReason && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                Motivo: {item.disputeReason}
              </Typography>
            )}

            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
              <Button
                size="small"
                startIcon={<DownloadIcon />}
                href={`/api/legal-processes/payment-confirmations/${item.id}/download`}
              >
                Bewijsstuk
              </Button>
              {canDecide && (
                <>
                  <Button size="small" variant="contained" color="success" onClick={() => handleConfirm(item)}>
                    Bevestigen
                  </Button>
                  <Button size="small" variant="outlined" color="error" onClick={() => setDisputeTarget(item)}>
                    Betwisten
                  </Button>
                </>
              )}
              {canCorrect && (
                <Button size="small" variant="outlined" onClick={() => openCorrect(item)}>
                  Corrigeren
                </Button>
              )}
            </Stack>
          </Box>
        );
      })}

      <Dialog open={!!disputeTarget} onClose={() => setDisputeTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Betaling betwisten</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            sx={{ mt: 1 }}
            label="Motivo"
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="Bijvoorbeeld: het bedrag komt niet overeen met het bewijsstuk."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisputeTarget(null)} disabled={processing}>
            Annuleren
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={processing || !disputeReason.trim()}
            onClick={handleConfirmDispute}
          >
            Betwisten
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!correctTarget} onClose={() => setCorrectTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Betaling corrigeren</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Bedrag"
              type="number"
              size="small"
              value={correctAmount}
              onChange={(e) => setCorrectAmount(e.target.value)}
            />
            <TextField
              label="Toelichting"
              size="small"
              multiline
              minRows={2}
              value={correctNote}
              onChange={(e) => setCorrectNote(e.target.value)}
            />
            <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
              {correctFile ? correctFile.name : "Nieuw bewijsstuk uploaden (optioneel)"}
              <input type="file" hidden onChange={(e) => setCorrectFile(e.target.files?.[0] ?? null)} />
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCorrectTarget(null)} disabled={processing}>
            Annuleren
          </Button>
          <Button variant="contained" disabled={processing} onClick={handleConfirmCorrect}>
            Corrigeren
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
