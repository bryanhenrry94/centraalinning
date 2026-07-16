"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Grid,
  Stack,
  CardHeader,
  Divider,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import { DebtClaimView } from "@/modules/collection/services/collection.validators";
import { Payment } from "@/modules/payment/services/payment.validators";
import { getDebtClaimViewById } from "@/modules/collection/actions/collection-case.actions";
import { notifyError } from "@/shared/ui/notifications";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { getPaymentsByInvoice } from "@/modules/payment/actions/payment.actions";
import { getAopStepsForClaim } from "@/modules/collection/actions/collection-notification.actions";
import { AOPStepNotification } from "@/modules/notification/services/notification.validators";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import {
  getDebtClaimStatusInfo,
  getAopStepInfo,
  getWorkflowStatusInfo,
} from "@/modules/collection/utils/debt-claim-status";

const CollectionViewPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [loading, setLoading] = useState(true);
  const [collection, setCollection] = useState<DebtClaimView | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notifications, setNotifications] = useState<
    AOPStepNotification[] | null
  >(null);

  useEffect(() => {
    if (!params.id) {
      notifyError("ID de collection no proporcionado");
      router.back();
      return;
    }

    loadData(params.id as string);
  }, []);

  const loadData = async (debtClaimId: string) => {
    try {
      setLoading(true);

      const [claim, paymentsData, notificationsData] = await Promise.all([
        getDebtClaimViewById(debtClaimId),
        getPaymentsByInvoice(debtClaimId),
        getAopStepsForClaim(debtClaimId),
      ]);

      setCollection(claim ?? null);
      setPayments(paymentsData ?? []);
      setNotifications(notificationsData ?? []);
    } catch (error) {
      console.error("Error fetching collection detail:", error);
      notifyError("Er is een fout opgetreden bij het laden van het dossier");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingUI />;
  }

  const statusInfo = getDebtClaimStatusInfo(collection?.status ?? "");
  const aopInfo = collection?.aopStep
    ? getAopStepInfo(collection.aopStep)
    : null;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <AppBreadcrumbs
        items={[
          { label: "Incasso", href: "/collections" },
          { label: "Details" },
        ]}
      />

      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={1}
          >
            <Box>
              <Typography variant="h4" fontWeight={700}>
                {collection?.reference || "Vordering"}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <Chip
                label={statusInfo.label}
                color={statusInfo.color}
                sx={{ fontWeight: 700 }}
              />
              {aopInfo && (
                <Chip
                  variant="outlined"
                  label={aopInfo.label}
                  color={aopInfo.color}
                  sx={{ fontWeight: 700 }}
                />
              )}
            </Stack>
          </Stack>
        </Box>

        {/* AOP information */}
        <Stack spacing={3}>
          <Card>
            <CardHeader>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Vorderingsinformatie
              </Typography>
            </CardHeader>
            <CardContent>
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <InfoField
                    label="Registratienummer"
                    value={collection?.reference || "-"}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <InfoField
                    label="Factuur-/contractnummer"
                    value={collection?.externalReference || "-"}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <InfoField
                    label="Datum vordering"
                    value={
                      collection?.createdAt
                        ? formatDate(collection.createdAt.toString())
                        : "-"
                    }
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <InfoField
                    label="Vorderingsbedrag"
                    value={formatCurrency(
                      Number(collection?.principalAmount) || 0,
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <InfoField label="Status" value={statusInfo.label} />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <InfoField
                    label="Huidige AOP-stap"
                    value={aopInfo?.label || "-"}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <InfoField
                    label="Debiteurnaam"
                    value={collection?.debtor?.fullname || "-"}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <InfoField
                    label="E-mail debiteur"
                    value={collection?.debtor?.email || "-"}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <InfoField
                    label="Beschrijving"
                    value={collection?.description || "-"}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Payments & notifications */}
          <Card>
            <CardContent>
              <Typography
                gutterBottom
                sx={{ color: "text.secondary", fontSize: 14 }}
              >
                Betalingen
              </Typography>

              {payments.length === 0 ? (
                <Typography variant="body2" color="text.secondary" py={2}>
                  Nog geen betalingen geregistreerd
                </Typography>
              ) : isMobile ? (
                <Stack divider={<Divider />} spacing={1.5} sx={{ mt: 1 }}>
                  {payments.map((payment) => (
                    <Box key={payment.id} sx={{ py: 0.5 }}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                      >
                        <InfoField
                          label="Betalingsdatum"
                          value={
                            payment.paid_at
                              ? formatDate(payment.paid_at.toString())
                              : "-"
                          }
                        />
                        <InfoField
                          label="Bedrag"
                          value={formatCurrency(payment.total_amount)}
                        />
                      </Stack>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        sx={{ mt: 1.5 }}
                      >
                        <InfoField
                          label="Betaalmethode"
                          value={payment.method}
                        />
                        <InfoField
                          label="Referentienummer"
                          value={payment.reference_number || "-"}
                        />
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Betalingsdatum</TableCell>
                        <TableCell align="right">Bedrag</TableCell>
                        <TableCell align="right">Betaalmethode</TableCell>
                        <TableCell align="right">Referentienummer</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {payment.paid_at
                              ? formatDate(payment.paid_at.toString())
                              : "-"}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(payment.total_amount)}
                          </TableCell>
                          <TableCell align="right">
                            {payment.method}
                          </TableCell>
                          <TableCell align="right">
                            {payment.reference_number || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography
                gutterBottom
                sx={{ color: "text.secondary", fontSize: 14 }}
              >
                Meldingen
              </Typography>

              {!notifications || notifications.length === 0 ? (
                <Typography variant="body2" color="text.secondary" py={2}>
                  Nog geen notificaties verzonden
                </Typography>
              ) : isMobile ? (
                <Stack divider={<Divider />} spacing={1.5} sx={{ mt: 1 }}>
                  {notifications.map((notification) => {
                    const stepInfo = getAopStepInfo(notification.step);
                    const workflowStatusInfo = getWorkflowStatusInfo(
                      notification.status,
                    );

                    return (
                      <Box key={notification.id} sx={{ py: 0.5 }}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="flex-start"
                        >
                          <InfoField
                            label="Datum"
                            value={
                              notification.sentAt
                                ? formatDate(notification.sentAt.toString())
                                : "-"
                            }
                          />
                          <InfoField
                            label="Stap"
                            value={stepInfo?.label || notification.step}
                          />
                        </Stack>
                        <Box sx={{ mt: 1.5 }}>
                          <InfoField
                            label="Status"
                            value={
                              <Chip
                                size="small"
                                label={workflowStatusInfo.label}
                                color={workflowStatusInfo.color}
                              />
                            }
                          />
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Datum</TableCell>
                        <TableCell align="right">Stap</TableCell>
                        <TableCell align="right">Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {notifications.map((notification) => {
                        const stepInfo = getAopStepInfo(notification.step);
                        const workflowStatusInfo = getWorkflowStatusInfo(
                          notification.status,
                        );

                        return (
                          <TableRow key={notification.id}>
                            <TableCell>
                              {notification.sentAt
                                ? formatDate(notification.sentAt.toString())
                                : "-"}
                            </TableCell>
                            <TableCell align="right">
                              {stepInfo?.label || notification.step}
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                size="small"
                                label={workflowStatusInfo.label}
                                color={workflowStatusInfo.color}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Stack>
    </Container>
  );
};

type InfoFieldProps = {
  label: string;
  value?: React.ReactNode;
};

function InfoField({ label, value }: InfoFieldProps) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          textTransform: "uppercase",
          letterSpacing: 0.4,
          display: "block",
          wordBreak: "break-word",
        }}
      >
        {label}
      </Typography>

      <Typography
        variant="body2"
        fontWeight={600}
        sx={{ wordBreak: "break-word" }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export default CollectionViewPage;
