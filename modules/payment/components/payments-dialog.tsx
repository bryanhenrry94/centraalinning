import {
  Box,
  Chip,
  Dialog,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { formatCurrency } from "@/shared/utils/formatters";
import React, { useEffect } from "react";
import { Payment } from "@/modules/payment/services/payment.validators";
import { getPaymentsByInvoice } from "@/modules/payment/actions/payment.actions";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";

type ChipColor =
  | "default"
  | "warning"
  | "success"
  | "error"
  | "info"
  | "primary"
  | "secondary";

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: ChipColor }> = {
  pending: { label: "In behandeling", color: "warning" },
  paid: { label: "Betaald", color: "success" },
  failed: { label: "Afgewezen", color: "error" },
  expired: { label: "Verlopen", color: "default" },
  reversed: { label: "Teruggedraaid", color: "error" },
};

interface PaymentsDialogProps {
  open: boolean;
  onClose: () => void;
  debtId?: string;
}

export const PaymentsDialog: React.FC<PaymentsDialogProps> = ({
  open,
  onClose,
  debtId,
}) => {
  const [payments, setPayments] = React.useState<Payment[]>([]);

  useEffect(() => {
    if (debtId) {
      fetchPayments(debtId);
    }
  }, [debtId]);

  const fetchPayments = async (debtId: string) => {
    const response = await getPaymentsByInvoice(debtId);
    setPayments(response || []);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose}>
        <Box
          sx={{
            bgcolor: "secondary.main",
            color: "white",
            px: 2,
            py: 1.5,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            borderBottom: "1px solid #e0e0e0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
            BETALINGSOVERZICHT
          </Typography>
          <IconButton sx={{ color: "white" }}>
            <CloseIcon onClick={onClose} />
          </IconButton>
        </Box>
        <Box sx={{ p: 2, bgcolor: "background.paper" }}>
          {(() => {
            const columns: ListColumn<Payment>[] = [
              { key: "method", label: "Method", align: "center", render: (payment) => payment.method },
              { key: "reference_number", label: "Referentie", align: "center", render: (payment) => payment.reference_number },
              {
                key: "paid_at",
                label: "Datum betaald",
                align: "center",
                render: (payment) => (payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : "-"),
              },
              {
                key: "total_amount",
                label: "Betaald",
                align: "center",
                render: (payment) => formatCurrency(payment.total_amount),
              },
              {
                key: "status",
                label: "Status",
                align: "center",
                render: (payment) => {
                  const statusInfo = PAYMENT_STATUS_LABELS[payment.status] || {
                    label: payment.status,
                    color: "default" as ChipColor,
                  };
                  return <Chip label={statusInfo.label} color={statusInfo.color} size="small" />;
                },
              },
            ];

            return (
              <ResponsiveListTable
                columns={columns}
                rows={payments}
                getRowKey={(payment) => payment.id}
                emptyMessage="Geen betalingen gevonden."
              />
            );
          })()}
        </Box>
      </Dialog>
    </>
  );
};
