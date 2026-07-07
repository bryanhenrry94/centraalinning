import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  Typography,
  CircularProgress,
} from "@mui/material";

interface PaymentModalProps {
  paymentId: string;
  onPaidSuccess: () => Promise<void>;
}

export default function PaymentModal({
  paymentId,
  onPaidSuccess,
}: PaymentModalProps) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!paymentId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/${paymentId}/status`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();

        if (data.status === "paid") {
          clearInterval(interval);
          setOpen(false);
          await onPaidSuccess();
        }
      } catch (err) {
        console.error("Error polling payment status", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [paymentId, onPaidSuccess]);

  return (
    <Dialog open={open} disableEscapeKeyDown>
      <DialogContent sx={{ textAlign: "center", p: 4 }}>
        <Typography variant="h6" gutterBottom>
          Esperando confirmación del pago...
        </Typography>
        <CircularProgress size={48} sx={{ mt: 2 }} />
      </DialogContent>
    </Dialog>
  );
}
