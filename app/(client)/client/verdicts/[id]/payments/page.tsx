"use client";

import * as React from "react";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Paper,
  Divider,
  Stack,
  Button,
  Container,
} from "@mui/material";
import ActionToolbar from "@/components/ui/breadcrums";
import PaymentList from "./payment-lists";
// Datos de prueba
const sampleData = [
  {
    id: "1",
    referenceType: "verdict",
    referenceId: "VONNIS-001",
    debtor: "Juan Pérez",
    installment: 1,
    amount: 300,
    paidAmount: 300,
    due_date: "2025-08-01",
    status: "paid",
  },
  {
    id: "2",
    referenceType: "verdict",
    referenceId: "VONNIS-001",
    debtor: "Juan Pérez",
    installment: 2,
    amount: 300,
    paidAmount: 0,
    due_date: "2025-09-01",
    status: "late",
  },
  {
    id: "3",
    referenceType: "invoice",
    referenceId: "INV-2025-001",
    debtor: "Comercial ABC",
    installment: null,
    amount: 1200,
    paidAmount: 600,
    due_date: "2025-09-15",
    status: "partially_paid",
  },
  {
    id: "4",
    referenceType: "invoice",
    referenceId: "INV-2025-002",
    debtor: "Servicios XYZ",
    installment: null,
    amount: 800,
    paidAmount: 800,
    due_date: "2025-09-20",
    status: "paid",
  },
];

// Componente para chip de estado
const StatusChip = ({ status }: { status: string }) => {
  const colors: Record<string, "default" | "success" | "error" | "warning"> = {
    pending: "default",
    partially_paid: "warning",
    paid: "success",
    late: "error",
  };

  const labels: Record<string, string> = {
    pending: "Pendiente",
    partially_paid: "Parcial",
    paid: "Pagado",
    late: "Atrasado",
  };

  return (
    <Chip
      label={labels[status] || status}
      color={colors[status] || "default"}
      size="small"
    />
  );
};

export default function AccountsPage() {
  // Handler temporal para el botón
  const handleRegisterPayment = (referenceId: string) => {
    alert(`Registrar nuevo pago para ${referenceId}`);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <ActionToolbar
        title="Consultar"
        navigation={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "Vonnis", href: "/dashboard/verdicts" },
        ]}
      />
      <Box sx={{ mt: 2 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Gestión de Cuentas por Cobrar
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Aquí puedes visualizar y dar seguimiento a las cuentas por cobrar.
          </Typography>
        </Box>

        <PaymentList />

        {/* Tabla única de cuentas por cobrar */}
        <Paper elevation={3} sx={{ p: 3, borderRadius: 3, overflow: "hidden" }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Button
              variant="contained"
              size="small"
              onClick={() => alert("Registrar nuevo pago")}
            >
              Registrar pago
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Tipo</TableCell>
                <TableCell>Referencia</TableCell>
                <TableCell>Deudor</TableCell>
                <TableCell>Cuota</TableCell>
                <TableCell align="right">Monto</TableCell>
                <TableCell align="right">Pagado</TableCell>
                <TableCell align="right">Saldo</TableCell>
                <TableCell>Vencimiento</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sampleData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    {row.referenceType === "verdict" ? "Vonnis" : "Factura"}
                  </TableCell>
                  <TableCell>{row.referenceId}</TableCell>
                  <TableCell>{row.debtor}</TableCell>
                  <TableCell>
                    {row.installment ? `#${row.installment}` : "-"}
                  </TableCell>
                  <TableCell align="right">${row.amount.toFixed(2)}</TableCell>
                  <TableCell align="right">
                    ${row.paidAmount.toFixed(2)}
                  </TableCell>
                  <TableCell align="right">
                    ${(row.amount - row.paidAmount).toFixed(2)}
                  </TableCell>
                  <TableCell>{row.due_date}</TableCell>
                  <TableCell>
                    <StatusChip status={row.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>
    </Container>
  );
}
