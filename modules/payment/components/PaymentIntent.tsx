import React, { useState, useEffect } from "react";
import {
  Button,
  Typography,
  Dialog,
  DialogContent,
  CircularProgress,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import { notifyError } from "@/shared/ui/notifications";

export interface PaymentIntentProps {
  onCreateTransaction: () => Promise<{
    success: boolean;
    error?: string;
    paymentId?: string;
    paymentUrl?: string;
  }>;
  onPaymentConfirmed: (paymentId: string) => Promise<void>;
  onPaymentFailed?: (paymentId: string) => Promise<void>;
  pollingInterval?: number;
  timeout?: number;
}

export const PaymentIntent: React.FC<PaymentIntentProps> = ({
  onCreateTransaction,
  onPaymentConfirmed,
  onPaymentFailed,
  pollingInterval = 5000,
  timeout = 120000,
}) => {
  const [open, setOpen] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePayNow = async () => {
    try {
      setLoading(true);
      const { success, paymentId, paymentUrl, error } =
        await onCreateTransaction();

      if (!success || !paymentId || !paymentUrl) {
        console.error("Error creando transacción", error);
        notifyError(error || "Kon de betaling niet aanmaken.");
        return;
      }

      setPaymentId(paymentId);
      window.open(paymentUrl, "_blank");
      setOpen(true);
    } catch (err) {
      console.error("Error creando transacción", err);
      notifyError("Kon de betaling niet aanmaken.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !paymentId) return;

    const start = Date.now();
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/${paymentId}/status`);
        const data = await res.json();

        switch (data.status) {
          case "failed":
            clearInterval(interval);
            setOpen(false);
            if (onPaymentFailed) {
              await onPaymentFailed(paymentId);
            }
            break;
          case "paid":
            clearInterval(interval);
            setOpen(false);
            await onPaymentConfirmed(paymentId);
            break;
          default:
            // Continue polling
            break;
        }
      } catch (err) {
        console.error("Error en polling de pago", err);
      }
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [
    open,
    paymentId,
    pollingInterval,
    timeout,
    onPaymentConfirmed,
    onPaymentFailed,
  ]);

  return (
    <>
      <Button
        type="button"
        variant="contained"
        color="primary"
        onClick={handlePayNow}
        startIcon={<LockIcon />}
        fullWidth
        sx={{
          textTransform: "none",
          fontSize: "1rem",
          fontWeight: 700,
          bgcolor: "#F97316",
          "&:hover": {
            bgcolor: "#EA580C",
          },
        }}
        disabled={loading}
      >
        {loading ? "Verwerken..." : "Nu betalen"}
      </Button>

      <Dialog open={open} disableEscapeKeyDown>
        <DialogContent sx={{ textAlign: "center", p: 4 }}>
          <CircularProgress size={48} sx={{ mt: 2 }} />
          <Typography variant="body2" sx={{ mt: 2 }}>
            ⏳ Wachten op betalingsbevestiging...
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
};
