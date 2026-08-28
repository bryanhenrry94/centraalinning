"use client";

import { Box, Typography, Chip, Paper, Divider, Button, Container } from "@mui/material";
import ActionToolbar from "@/shared/ui/breadcrums";
import PaymentList from "./payment-lists";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
// Datos de prueba
const sampleData = [
  {
    id: "1",
    referenceType: "verdict",
    referenceId: "VONNIS-001",
    debtor: "Jan Janssen",
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
    debtor: "Jan Janssen",
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
    debtor: "Handel ABC",
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
    debtor: "Diensten XYZ",
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
    pending: "In afwachting",
    partially_paid: "Gedeeltelijk",
    paid: "Betaald",
    late: "Achterstallig",
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
  return (
    <Container
      maxWidth="lg"
      disableGutters
      sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
    >
      <ActionToolbar
        title="Raadplegen"
        navigation={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "Vonnis", href: "/dashboard/verdicts" },
        ]}
      />
      <Box sx={{ mt: 2 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Beheer van Vorderingen
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Hier kunt u de openstaande vorderingen bekijken en opvolgen.
          </Typography>
        </Box>

        <PaymentList />

        {/* Tabla única de cuentas por cobrar */}
        <Paper
          elevation={3}
          sx={{ p: { xs: 1.5, sm: 3 }, borderRadius: 3, overflow: "hidden" }}
        >
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
              onClick={() => alert("Nieuwe betaling registreren")}
            >
              Betaling registreren
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />

          {(() => {
            const columns: ListColumn<(typeof sampleData)[number]>[] = [
              { key: "type", label: "Type", render: (row) => (row.referenceType === "verdict" ? "Vonnis" : "Factuur") },
              { key: "referenceId", label: "Referentie", render: (row) => row.referenceId },
              { key: "debtor", label: "Debiteur", render: (row) => row.debtor },
              {
                key: "installment",
                label: "Termijn",
                render: (row) => (row.installment ? `#${row.installment}` : "-"),
                hideOnMobile: true,
              },
              { key: "amount", label: "Bedrag", align: "right", render: (row) => `$${row.amount.toFixed(2)}` },
              {
                key: "paidAmount",
                label: "Betaald",
                align: "right",
                render: (row) => `$${row.paidAmount.toFixed(2)}`,
                hideOnMobile: true,
              },
              {
                key: "balance",
                label: "Saldo",
                align: "right",
                render: (row) => `$${(row.amount - row.paidAmount).toFixed(2)}`,
              },
              { key: "due_date", label: "Vervaldatum", render: (row) => row.due_date, hideOnMobile: true },
              { key: "status", label: "Status", render: (row) => <StatusChip status={row.status} /> },
            ];
            return <ResponsiveListTable columns={columns} rows={sampleData} getRowKey={(row) => row.id} />;
          })()}
        </Paper>
      </Box>
    </Container>
  );
}
