"use client";
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  Stack,
  Divider,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RequestQuoteOutlinedIcon from "@mui/icons-material/RequestQuoteOutlined";
import { formatCurrency } from "@/shared/utils/formatters";
import {
  getDebtorCollectionFeeObligations,
  requestDebtorCollectionFeePayment,
} from "@/modules/collection/actions/debtor.actions";
import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";

interface PayCollectionFeeDialogProps {
  open: boolean;
  onClose: () => void;
  debtClaimId: string;
  onPaid: () => void;
}

// Pago de la(s) comisión(es) CFSB a cargo del DEUDOR. Administrativamente
// pueden ser varias obligaciones separadas (el registro del AOP + recargos
// posteriores por falta de respuesta a la aanmaning/sommatie, ver
// CollectionService.applyNoResponseFee) — pero para el deudor se presenta
// como un solo total con un solo botón de pago; el reparto interno hacia
// cada obligación se resuelve vía PaymentAllocation
// (CollectionService.requestDebtorCollectionFeePayment).
export const PayCollectionFeeDialog: React.FC<PayCollectionFeeDialogProps> = ({
  open,
  onClose,
  debtClaimId,
  onPaid,
}) => {
  const [loading, setLoading] = useState(true);
  const [obligations, setObligations] = useState<
    Awaited<ReturnType<typeof getDebtorCollectionFeeObligations>>
  >([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getDebtorCollectionFeeObligations(debtClaimId)
      .then((rows) => setObligations(rows.filter((o) => o.balanceAmount > 0)))
      .finally(() => setLoading(false));
  }, [open, debtClaimId]);

  const total = obligations.reduce((sum, o) => sum + o.balanceAmount, 0);

  const handleCreateTransaction = async () => {
    try {
      const result = await requestDebtorCollectionFeePayment(debtClaimId);
      return {
        success: true,
        paymentId: result.paymentId,
        paymentUrl: result.paymentUrl,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Kon de betaling niet aanmaken";
      return { success: false, error: message };
    }
  };

  const handlePaymentConfirmed = async () => {
    onPaid();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { overflow: "hidden" } }}
    >
      <Box
        sx={{
          bgcolor: "secondary.main",
          color: "white",
          px: 3,
          py: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6" component="h3" sx={{ fontWeight: 700 }}>
          CFSB-kosten
        </Typography>
        <IconButton onClick={onClose} sx={{ color: "white" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <DialogContent sx={{ pt: 4 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={28} />
          </Box>
        ) : obligations.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center" }}
          >
            Geen openstaande CFSB-kosten voor dit dossier.
          </Typography>
        ) : (
          <Stack alignItems="center" spacing={1.5}>
            <Box
              sx={{
                bgcolor: "secondary.light",
                borderRadius: "50%",
                width: 80,
                height: 80,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <RequestQuoteOutlinedIcon
                sx={{ fontSize: 36, color: "secondary.main" }}
              />
            </Box>

            <Typography variant="body1" color="secondary.main">
              Te betalen CFSB-kosten
            </Typography>

            <Typography variant="h4" fontWeight={700} sx={{ color: "#F97316" }}>
              {formatCurrency(total)}
            </Typography>

            <Divider sx={{ width: "100%", my: 1 }} />

            <Typography
              variant="body2"
              color="secondary.main"
              sx={{ textAlign: "justify" }}
            >
              U betaalt de openstaande CFSB-kosten rechtstreeks aan CFSB. Deze
              kosten staan los van het bedrag dat u aan de deelnemer
              verschuldigd bent.
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Stack direction="row" spacing={2} width="100%">
          <Button
            fullWidth
            variant="outlined"
            color="inherit"
            startIcon={<CloseIcon />}
            onClick={onClose}
            sx={{ textTransform: "none" }}
          >
            Annuleren
          </Button>

          {!loading && obligations.length > 0 && (
            <PaymentIntent
              onCreateTransaction={handleCreateTransaction}
              onPaymentConfirmed={handlePaymentConfirmed}
            />
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
};
