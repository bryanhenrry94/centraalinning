import React, { useState, useEffect } from "react";
import {
  Button,
  Typography,
  Dialog,
  DialogContent,
  CircularProgress,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";

export interface PaymentIntentProps {
  onCreateTransaction: () => Promise<{
    paymentId: string;
    paymentUrl: string;
  }>;
  onPaymentConfirmed: () => Promise<void>;
  pollingInterval?: number;
  timeout?: number;
}

export const PaymentIntent: React.FC<PaymentIntentProps> = ({
  onCreateTransaction,
  onPaymentConfirmed,
  pollingInterval = 5000,
  timeout = 120000,
}) => {
  const [open, setOpen] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePayNow = async () => {
    try {
      setLoading(true);
      const { paymentId, paymentUrl } = await onCreateTransaction();
      setPaymentId(paymentId);
      window.open(paymentUrl, "_blank");
      setOpen(true);
    } catch (err) {
      console.error("Error creando transacción", err);
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

        if (data.status === "paid") {
          // El webhook ya actualizó la BD
          // Continúa con el registro del bloqueo
          clearInterval(interval);
          setOpen(false);
          await onPaymentConfirmed();
        } else if (Date.now() - start > timeout) {
          clearInterval(interval);
          setOpen(false);
          console.warn("Timeout esperando confirmación de pago");
        }
      } catch (err) {
        console.error("Error en polling de pago", err);
      }
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [open, paymentId, pollingInterval, timeout, onPaymentConfirmed]);

  return (
    <>
      <Button
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
