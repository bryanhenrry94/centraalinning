import {
  Box,
  Dialog,
  IconButton,
  Modal,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { formatCurrency } from "@/utils/formatters";
import React, { useEffect } from "react";
import { Payment } from "@/lib/validations/payment";
import { getPayments } from "@/actions/payment";

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
    const response = await getPayments({ debtClaim_id: debtId });

    if (response.success) {
      setPayments(response.data || []);
    } else {
      setPayments([]);
    }
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
          <TableContainer component={Paper}>
            <Table
              stickyHeader
              sx={{
                "& .MuiTableCell-root": {
                  border: "1px solid #e0e0e0",
                },
              }}
              aria-label="tabla de embargo"
              size="small"
            >
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      minWidth: 50,
                      backgroundColor: "paper.main",
                      color: "#000",
                      fontWeight: "bold",
                      border: "1px solid #bdbdbd",
                    }}
                    align="center"
                  >
                    Method
                  </TableCell>
                  <TableCell
                    sx={{
                      minWidth: 50,
                      backgroundColor: "paper.main",
                      color: "#000",
                      fontWeight: "bold",
                      border: "1px solid #bdbdbd",
                    }}
                    align="center"
                  >
                    Referentie
                  </TableCell>
                  <TableCell
                    sx={{
                      minWidth: 50,
                      backgroundColor: "paper.main",
                      color: "#000",
                      fontWeight: "bold",
                      border: "1px solid #bdbdbd",
                    }}
                    align="center"
                  >
                    Datum betaald
                  </TableCell>
                  <TableCell
                    sx={{
                      minWidth: 50,
                      backgroundColor: "paper.main",
                      color: "#000",
                      fontWeight: "bold",
                      border: "1px solid #bdbdbd",
                    }}
                    align="center"
                  >
                    Betaald
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Aquí irían las filas de datos dinámicos */}
                {payments.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      align="center"
                      sx={{ fontStyle: "italic" }}
                    >
                      Geen betalingen gevonden.
                    </TableCell>
                  </TableRow>
                )}
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell align="center">{payment.method}</TableCell>
                    <TableCell align="center">
                      {payment.reference_number}
                    </TableCell>
                    <TableCell align="center">
                      {payment.paid_at
                        ? new Date(payment.paid_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell align="center">
                      {formatCurrency(payment.total_amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Dialog>
    </>
  );
};
