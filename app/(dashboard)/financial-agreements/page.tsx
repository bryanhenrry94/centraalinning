"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Container,
  Typography,
  Chip,
  Button,
  Stack,
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogContent,
  Paper,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import CloseIcon from "@mui/icons-material/Close";

import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import {
  ListColumn,
  ResponsiveListTable,
} from "@/shared/ui/responsive-list-table";
import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";
import { PaymentType } from "@/modules/payment/services/payment.validators";

import {
  getAllFinancialAgreementsForTenant,
  initiateFollowUpFromFinancialAgreement,
} from "@/modules/financial-agreement/actions/financial-agreement.actions";
import { getFinancialAgreementStatusInfo } from "@/modules/financial-agreement/utils/financial-agreement-status";

type FinancialAgreementListItem = Awaited<
  ReturnType<typeof getAllFinancialAgreementsForTenant>
>[number];

// Mismo criterio que contracts/page.tsx: solo se puede (re)iniciar el
// vervolgingsproces si está REGISTERED, y si ya escaló antes, solo mientras
// el DebtClaim resultante siga OPEN (todavía no se confirmó el pago).
const canStartFollowUp = (item: FinancialAgreementListItem) =>
  item.status === "REGISTERED" &&
  (!item.escalatedToDebtClaim || item.escalatedToDebtClaim.status === "OPEN");

const FinancialAgreementsPage: React.FC = () => {
  const router = useRouter();
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FinancialAgreementListItem[]>([]);

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedItem, setSelectedItem] = useState<FinancialAgreementListItem | null>(null);
  const menuOpen = Boolean(anchorEl);

  const [aopPaymentDialog, setAopPaymentDialog] = useState<{
    open: boolean;
    obligationId: string | null;
    amount: number;
  }>({ open: false, obligationId: null, amount: 0 });

  const load = useCallback(async () => {
    if (!session?.user?.tenant_id) return;
    try {
      setLoading(true);
      const data = await getAllFinancialAgreementsForTenant(
        session.user.tenant_id,
      );
      setItems(data);
    } catch (error) {
      notifyError(
        error instanceof Error ? error.message : "Kon FAR-overzicht niet laden",
      );
    } finally {
      setLoading(false);
    }
  }, [session?.user?.tenant_id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

  // Ver ContractService.initiateFollowUp: crea el DebtClaim + verplichting
  // (OPEN) y abre el diálogo de pago; el AOP recién se activa cuando el
  // webhook confirma ese pago.
  const handleStartFollowUp = async (item: FinancialAgreementListItem) => {
    handleMenuClose();
    try {
      const result = await initiateFollowUpFromFinancialAgreement(item.id);
      setAopPaymentDialog({ open: true, obligationId: result.obligationId, amount: result.amount });
    } catch (error) {
      notifyError(
        error instanceof Error ? error.message : "Kon het vervolgingsproces niet starten.",
      );
    }
  };

  const closeAopPaymentDialog = () => setAopPaymentDialog({ open: false, obligationId: null, amount: 0 });

  const handleCreateAopTransaction = async (): Promise<{
    success: boolean;
    error?: string;
    paymentId?: string;
    paymentUrl?: string;
  }> => {
    if (!aopPaymentDialog.obligationId) {
      return { success: false, error: "Geen betaalverplichting gevonden" };
    }

    const res = await fetch("/api/payments/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: aopPaymentDialog.amount,
        currency: "USD",
        description: "Administratieve opvolging starten (vanuit FAR)",
        payment_type: PaymentType.COLLECTION,
        obligationId: aopPaymentDialog.obligationId,
      }),
    });

    if (!res.ok) {
      return { success: false, error: "Fout bij het aanmaken van de betaling" };
    }

    const data = await res.json();
    return { success: true, paymentId: data.paymentId, paymentUrl: data.paymentUrl };
  };

  const handleAopPaymentConfirmed = async () => {
    closeAopPaymentDialog();
    notifySuccess("Vervolgingsproces gestart.");
    load();
  };

  const handleAopPaymentFailed = async () => {
    closeAopPaymentDialog();
    notifyError("De betaling is mislukt. U kunt het opnieuw proberen via 'Administratieve opvolging starten'.");
    load();
  };

  if (loading) return <LoadingUI />;

  return (
    <Container
      maxWidth="lg"
      disableGutters
      sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
    >
      <AppBreadcrumbs
        items={[{ label: "FAR — Financiële Afspraken Registreren" }]}
      />

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
        gap={1}
        flexWrap="wrap"
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            FAR — Financiële Afspraken Registreren
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push("/financial-agreements/new")}
        >
          Nieuwe FAR registreren
        </Button>
      </Stack>

      {(() => {
        const columns: ListColumn<FinancialAgreementListItem>[] = [
          {
            key: "farNumber",
            label: "Dossiernummer",
            render: (item) => item.farNumber,
          },
          {
            key: "reference",
            label: "Factuurnummer",
            render: (item) => item.reference ?? "-",
          },
          {
            key: "debtor",
            label: "Debiteur",
            render: (item) =>
              item.debtor?.person
                ? `${item.debtor.person.first_name ?? ""} ${item.debtor.person.last_name ?? ""}`.trim()
                : "-",
          },
          {
            key: "amount",
            label: "Bedrag",
            align: "right",
            render: (item) => formatCurrency(item.amount),
          },
          {
            key: "status",
            label: "Status",
            render: (item) => {
              const statusInfo = getFinancialAgreementStatusInfo(item.status);
              return (
                <Chip
                  label={statusInfo.label}
                  color={statusInfo.color}
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              );
            },
          },
          {
            key: "createdAt",
            label: "Aangemaakt",
            render: (item) => formatDate(item.createdAt.toString()),
            hideOnMobile: true,
          },
          {
            key: "actions",
            label: "Acties",
            render: (item) => (
              <IconButton
                aria-label="Acties"
                aria-haspopup="true"
                onClick={(event) => {
                  event.stopPropagation();
                  setAnchorEl(event.currentTarget);
                  setSelectedItem(item);
                }}
              >
                <MoreVertIcon />
              </IconButton>
            ),
          },
        ];

        return (
          <ResponsiveListTable
            columns={columns}
            rows={items}
            getRowKey={(item) => item.id}
            getRowHref={(item) => `/financial-agreements/${item.id}`}
            emptyMessage="Nog geen financiële afspraken geregistreerd."
          />
        );
      })()}

      <Menu anchorEl={anchorEl} open={menuOpen} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            if (!selectedItem) return;
            handleStartFollowUp(selectedItem);
          }}
          disabled={!selectedItem || !canStartFollowUp(selectedItem)}
        >
          <ListItemIcon>
            <RestartAltIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Administratieve opvolging starten</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog open={aopPaymentDialog.open} onClose={closeAopPaymentDialog} maxWidth="xs" fullWidth>
        <Box
          sx={{
            bgcolor: "secondary.main",
            color: "white",
            px: 2,
            py: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6" fontWeight={700} color="white">
            Betaling bevestigen
          </Typography>
          <IconButton onClick={closeAopPaymentDialog} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: { xs: 2, sm: 4 } }}>
          <Stack spacing={3} alignItems="center">
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Deze service vereist betaling voordat de administratieve opvolging (AOP) wordt
              geactiveerd.
            </Typography>

            <Paper variant="outlined" sx={{ width: "100%", p: 2, borderRadius: 2, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Te betalen bedrag
              </Typography>
              <Typography variant="h4" fontWeight={700} color="primary.main">
                {formatCurrency(aopPaymentDialog.amount)}
              </Typography>
            </Paper>

            <Stack direction="row" spacing={2} width="100%">
              <Button fullWidth variant="outlined" color="inherit" onClick={closeAopPaymentDialog}>
                Annuleren
              </Button>
              <PaymentIntent
                onCreateTransaction={handleCreateAopTransaction}
                onPaymentConfirmed={handleAopPaymentConfirmed}
                onPaymentFailed={handleAopPaymentFailed}
              />
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default FinancialAgreementsPage;
