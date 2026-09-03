"use client";
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  Paper,
  Stack,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { notifyError } from "@/shared/ui/notifications";
import { formatCurrency } from "@/shared/utils/formatters";
import { requestStartCollectiveCollection } from "@/modules/collective-follow-up/actions/collective-collection.actions";
import { getParameterForTenantAction } from "@/modules/settings/actions/parameter.actions";
import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";

// Solo para mostrar el monto antes de pagar — el monto real y autoritativo
// se calcula server-side en CollectiveCollectionService.requestStart. No se
// importa desde modules/collective-follow-up/constants/ porque ese archivo
// reexporta un enum de @prisma/client y este es un componente "use client".
const COP_START_FEE_RATE = 0.05;

interface StartCopDialogProps {
  open: boolean;
  onClose: () => void;
  debtClaimId: string;
  principalAmount: number;
  onStarted: (collectionId: string) => void;
}

export const StartCopDialog: React.FC<StartCopDialogProps> = ({
  open,
  onClose,
  debtClaimId,
  principalAmount,
  onStarted,
}) => {
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [abbRate, setAbbRate] = useState<number>(0);

  useEffect(() => {
    if (!open) return;

    const fetchAbbRate = async () => {
      try {
        const parameter = await getParameterForTenantAction();
        setAbbRate(parameter?.abb_rate ?? 0);
      } catch (error) {
        console.error("Error fetching ABB rate:", error);
      }
    };

    fetchAbbRate();
  }, [open]);

  // De 5%-startvergoeding is netto (excl. ABB) — de deelnemer ziet en
  // betaalt altijd vergoeding + ABB bovenop (zelfde regel als BLC/Financieel
  // Rapport), nooit ABB die uit het totaal wordt teruggerekend.
  const feeAmount = principalAmount * COP_START_FEE_RATE;
  const abbAmount = Number(((feeAmount * abbRate) / 100).toFixed(2));
  const totalAmount = Number((feeAmount + abbAmount).toFixed(2));

  const handleCreateTransaction = async () => {
    try {
      const result = await requestStartCollectiveCollection({ debtClaimId });
      setCollectionId(result.collectionId);
      return {
        success: true,
        paymentId: result.paymentId,
        paymentUrl: result.paymentUrl,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Kon de Collectieve Opvolging niet aanvragen";
      notifyError(message);
      return { success: false, error: message };
    }
  };

  const handlePaymentConfirmed = async () => {
    if (collectionId) {
      onStarted(collectionId);
    }
    onClose();
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
        Collectieve Opvolging starten
        <IconButton onClick={onClose} sx={{ color: "white" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 3 }}>
          <Stack spacing={2} sx={{ mt: 4 }}>
            <Typography
              variant="body2"
              color="text.primary"
              sx={{ textAlign: "justify" }}
            >
              Start Collectieve Opvolging om via de samenwerking tot betaling of
              een betalingsregeling te komen en mogelijke gerechtelijke
              opvolging zoveel mogelijk te voorkomen.
            </Typography>
            <Typography
              variant="body2"
              color="text.primary"
              sx={{ textAlign: "justify" }}
            >
              De Collectieve Opvolging wordt actief nadat de startvergoeding is
              betaald.
            </Typography>
          </Stack>
        </Box>

        <Paper
          variant="outlined"
          sx={{
            width: "100%",
            p: 2,
            borderRadius: 2,
            bgcolor: "#FFF7ED",
            borderColor: "#FBD9B4",
          }}
        >
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                Startvergoeding (5%, excl. ABB)
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatCurrency(feeAmount)}
              </Typography>
            </Stack>

            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                ABB {abbRate}%
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatCurrency(abbAmount)}
              </Typography>
            </Stack>

            <Divider />

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="subtitle1" fontWeight={700}>
                Totaal
              </Typography>
              <Typography variant="h5" fontWeight={700} sx={{ color: "#F97316" }}>
                {formatCurrency(totalAmount)}
              </Typography>
            </Stack>
          </Stack>
        </Paper>
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

          <PaymentIntent
            onCreateTransaction={handleCreateTransaction}
            onPaymentConfirmed={handlePaymentConfirmed}
          />
        </Stack>
      </DialogActions>
    </Dialog>
  );
};
