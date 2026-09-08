"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Container,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Box,
  Chip,
  Grid,
  Stack,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  Button,
  Dialog,
  DialogContent,
  Paper,
  IconButton,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import ArticleIcon from "@mui/icons-material/Article";
import CloseIcon from "@mui/icons-material/Close";

import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";
import { PaymentType } from "@/modules/payment/services/payment.validators";

import {
  getFinancialAgreementById,
  initiateFollowUpFromFinancialAgreement,
} from "@/modules/financial-agreement/actions/financial-agreement.actions";
import { getFinancialAgreementStatusInfo } from "@/modules/financial-agreement/utils/financial-agreement-status";

type FinancialAgreementDetail = Awaited<ReturnType<typeof getFinancialAgreementById>>;

function InfoField({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ textTransform: "uppercase", letterSpacing: 0.4, display: "block" }}
      >
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value ?? "-"}
      </Typography>
    </Box>
  );
}

const FinancialAgreementDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [financialAgreement, setFinancialAgreement] = useState<FinancialAgreementDetail | null>(null);
  const [starting, setStarting] = useState(false);
  const [aopPaymentDialog, setAopPaymentDialog] = useState<{
    open: boolean;
    obligationId: string | null;
    amount: number;
  }>({ open: false, obligationId: null, amount: 0 });

  const load = useCallback(async () => {
    if (!params.id) return;
    try {
      setLoading(true);
      const data = await getFinancialAgreementById(params.id as string);
      setFinancialAgreement(data);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Kon FAR niet laden");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  // "Vervolgen": crea el DebtClaim + verplichting (OPEN) y abre el diálogo
  // de pago — el AOP recién se activa cuando el webhook confirma ese pago,
  // mismo patrón que ContractService.initiateFollowUp.
  const handleStartFollowUp = async () => {
    if (!financialAgreement) return;
    setStarting(true);
    try {
      const result = await initiateFollowUpFromFinancialAgreement(financialAgreement.id);
      setAopPaymentDialog({ open: true, obligationId: result.obligationId, amount: result.amount });
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Kon het vervolgingsproces niet starten.");
    } finally {
      setStarting(false);
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
    notifyError("De betaling is mislukt. U kunt het opnieuw proberen via 'Vervolgen'.");
    load();
  };

  if (loading) return <LoadingUI />;
  if (!financialAgreement) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography>FAR niet gevonden.</Typography>
      </Container>
    );
  }

  const statusInfo = getFinancialAgreementStatusInfo(financialAgreement.status);
  const debtorName = financialAgreement.debtor?.person
    ? `${financialAgreement.debtor.person.first_name ?? ""} ${financialAgreement.debtor.person.last_name ?? ""}`.trim()
    : "-";

  return (
    <Container maxWidth="md" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs
        items={[
          { label: "FAR — Financiële Afspraken Registreren", href: "/financial-agreements" },
          { label: "Details" },
        ]}
      />

      <Stack spacing={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Typography variant="h4" fontWeight={700}>
            {financialAgreement.farNumber}
          </Typography>
          <Chip label={statusInfo.label} color={statusInfo.color} sx={{ fontWeight: 700 }} />
        </Stack>

        {financialAgreement.status === "REGISTERED" && !financialAgreement.escalatedToDebtClaimId && (
          <Alert
            severity="success"
            action={
              <Button color="inherit" size="small" onClick={handleStartFollowUp} disabled={starting}>
                {starting ? "Bezig..." : "Vervolgen"}
              </Button>
            }
          >
            Este acuerdo financiero está registrado y estable. No tiene seguimiento activo ni
            recordatorios. Si hay incumplimiento, puede iniciar manualmente un expediente (AOP) nuevo
            con su propia tarifa — nunca una conversión automática de este registro.
          </Alert>
        )}

        {financialAgreement.escalatedToDebtClaimId && (
          <Alert
            severity="warning"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => router.push(`/collections/${financialAgreement.escalatedToDebtClaimId}`)}
              >
                Expediente bekijken
              </Button>
            }
          >
            Dit FAR heeft een administratief vervolgingsproces (AOP) gestart
            {financialAgreement.escalatedAt ? ` op ${formatDate(financialAgreement.escalatedAt.toString())}` : ""}.
          </Alert>
        )}

        <Card>
          <CardHeader title="Gegevens" />
          <Divider />
          <CardContent>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Debiteur" value={debtorName} />
              </Grid>
              {financialAgreement.reference && (
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <InfoField label="Factuurnummer" value={financialAgreement.reference} />
                </Grid>
              )}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Bedrag" value={formatCurrency(financialAgreement.amount)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Munteenheid" value={financialAgreement.currency} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Aangemaakt op" value={formatDate(financialAgreement.createdAt.toString())} />
              </Grid>
              {financialAgreement.registeredAt && (
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <InfoField
                    label="Geregistreerd op"
                    value={formatDate(financialAgreement.registeredAt.toString())}
                  />
                </Grid>
              )}
              {financialAgreement.contract && (
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <InfoField
                    label="Overeenkomst"
                    value={financialAgreement.contract.reference_number}
                  />
                </Grid>
              )}
              {financialAgreement.invoiceDate && (
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <InfoField
                    label="Factuurdatum"
                    value={formatDate(financialAgreement.invoiceDate.toString())}
                  />
                </Grid>
              )}
              {financialAgreement.dueDate && (
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <InfoField
                    label="Vervaldatum"
                    value={formatDate(financialAgreement.dueDate.toString())}
                  />
                </Grid>
              )}
              <Grid size={{ xs: 12 }}>
                <InfoField label="Omschrijving" value={financialAgreement.description || "-"} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title={`Documenten (${financialAgreement.documents?.length ?? 0})`} />
          <Divider />
          <CardContent>
            {!financialAgreement.documents || financialAgreement.documents.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Geen documenten toegevoegd.
              </Typography>
            ) : (
              <List disablePadding>
                {financialAgreement.documents.map((doc, index) => (
                  <Box key={doc.id}>
                    <ListItem
                      disablePadding
                      secondaryAction={
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<DownloadIcon />}
                          href={`/api/financial-agreements/documents/${doc.id}/download`}
                        >
                          Downloaden
                        </Button>
                      }
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}>
                        <ArticleIcon color="action" fontSize="small" />
                        <ListItemText
                          primary={doc.originalName}
                          secondary={formatDate(doc.createdAt.toString())}
                        />
                      </Box>
                    </ListItem>
                    {index < financialAgreement.documents.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Stack>

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

export default FinancialAgreementDetailPage;
