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
  Alert,
} from "@mui/material";

import { DebtClaimView } from "@/modules/collection/services/collection.validators";
import { computeDebtClaimBalances } from "@/modules/collection/utils/debt-claim-balance";
import { Payment } from "@/modules/payment/services/payment.validators";
import { getDebtClaimViewById } from "@/modules/collection/actions/debt-claim.actions";
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
  getChargeStatusInfo,
  getObligationStatusInfo,
  getObligationTypeLabel,
  getObligationBeneficiaryLabel,
} from "@/modules/collection/utils/debt-claim-status";
import { getLegalProcessByDebtClaimId } from "@/modules/legal-process/actions/legal-process.actions";
import { TransferToLawyerDialog } from "@/modules/legal-process/components/transfer-to-lawyer-dialog";
import { CaseFileList } from "@/modules/case-file/components/case-file-list";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import GavelIcon from "@mui/icons-material/Gavel";
import GroupIcon from "@mui/icons-material/Group";
import {
  getCollectiveCollectionByDebtClaimId,
  checkCanStartCop,
} from "@/modules/collective-follow-up/actions/collective-collection.actions";
import { StartCopDialog } from "@/modules/collective-follow-up/components/start-cop-dialog";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { AopGuidanceBanner } from "@/modules/collection/components/aop-guidance-banner";
import { getAgreementsByDebtClaimId } from "@/modules/agreement/actions/agreement.actions";
import { AgreementResponse } from "@/modules/agreement/services/agreement.validators";
import { isAgreementPending } from "@/modules/agreement/constants/agreement-status";
import { AgreementRequestDialog } from "@/modules/agreement/components/agreement-request-dialog";

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
  const [legalProcessId, setLegalProcessId] = useState<string | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [collectiveCollectionId, setCollectiveCollectionId] = useState<
    string | null
  >(null);
  const [canStartCop, setCanStartCop] = useState<{
    allowed: boolean;
    reason?: string;
  }>({
    allowed: false,
  });
  const [startCopDialogOpen, setStartCopDialogOpen] = useState(false);
  const [pendingAgreements, setPendingAgreements] = useState<AgreementResponse[]>([]);
  const [decideAgreementId, setDecideAgreementId] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) {
      notifyError("Geen dossier-ID opgegeven");
      router.back();
      return;
    }

    loadData(params.id as string);
  }, []);

  const loadData = async (debtClaimId: string) => {
    try {
      setLoading(true);

      const [
        claim,
        paymentsData,
        notificationsData,
        legalProcess,
        collectiveCollection,
        copEligibility,
        agreements,
      ] = await Promise.all([
        getDebtClaimViewById(debtClaimId),
        getPaymentsByInvoice(debtClaimId),
        getAopStepsForClaim(debtClaimId),
        getLegalProcessByDebtClaimId(debtClaimId),
        getCollectiveCollectionByDebtClaimId(debtClaimId),
        checkCanStartCop(debtClaimId),
        getAgreementsByDebtClaimId(debtClaimId),
      ]);

      setCollection(claim ?? null);
      setPayments(paymentsData ?? []);
      setNotifications(notificationsData ?? []);
      setLegalProcessId(legalProcess?.id ?? null);
      setCollectiveCollectionId(collectiveCollection?.id ?? null);
      setCanStartCop(copEligibility);
      setPendingAgreements(agreements.filter((a) => isAgreementPending(a.status)));
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
  const currentStepNotification = notifications?.find(
    (n) => n.step === collection?.aopStep,
  );
  const { receivableBalance, participantCfsbCost } = computeDebtClaimBalances(
    collection?.obligations ?? [],
  );

  return (
    <Container
      maxWidth="lg"
      disableGutters
      sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
    >
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

            <Stack direction="row" spacing={1} alignItems="center">
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
              {legalProcessId ? (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<GavelIcon />}
                  onClick={() =>
                    router.push(`/legal-processes/${legalProcessId}`)
                  }
                >
                  GOP-dossier
                </Button>
              ) : (
                <Tooltip
                  title={
                    collection?.aopStep === "BLK_NOTIFICATION"
                      ? ""
                      : "Vereist AOP-fase Blokkade voordat het dossier kan worden overgedragen aan gerechtelijke opvolging."
                  }
                >
                  <span>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<SwapHorizIcon />}
                      disabled={collection?.aopStep !== "BLK_NOTIFICATION"}
                      onClick={() => setTransferDialogOpen(true)}
                    >
                      Dossieroverdracht
                    </Button>
                  </span>
                </Tooltip>
              )}
              {collectiveCollectionId ? (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<GroupIcon />}
                  onClick={() =>
                    router.push(
                      `/collective-follow-up/${collectiveCollectionId}`,
                    )
                  }
                >
                  COP-dossier
                </Button>
              ) : (
                <Tooltip
                  title={canStartCop.allowed ? "" : (canStartCop.reason ?? "")}
                >
                  <span>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<GroupIcon />}
                      disabled={!canStartCop.allowed}
                      onClick={() => setStartCopDialogOpen(true)}
                    >
                      Collectieve Opvolging starten
                    </Button>
                  </span>
                </Tooltip>
              )}
            </Stack>
          </Stack>
        </Box>

        {pendingAgreements.map((agreement) => (
          <Alert
            key={agreement.id}
            severity="warning"
            action={
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                onClick={() => setDecideAgreementId(agreement.id)}
              >
                Bekijken
              </Button>
            }
          >
            <strong>Actie vereist</strong> — {collection?.debtor?.fullname || "De debiteur"} heeft
            een betalingsregeling aangevraagd voor dossier {collection?.reference}.
          </Alert>
        ))}

        <AopGuidanceBanner
          aopStep={collection?.aopStep ?? null}
          stepDeadline={currentStepNotification?.deadline}
          hasLegalProcess={!!legalProcessId}
          hasCollectiveCollection={!!collectiveCollectionId}
        />

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
                  <InfoField
                    label="Hoofdsom te ontvangen"
                    value={formatCurrency(receivableBalance)}
                  />
                </Grid>

                {participantCfsbCost > 0 && (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <InfoField
                      label="AOP-activatie aan CFSB betaald"
                      value={formatCurrency(participantCfsbCost)}
                    />
                  </Grid>
                )}

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
                          <TableCell align="right">{payment.method}</TableCell>
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
                            value={workflowStatusInfo.label}
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

          <Card>
            <CardContent>
              <Typography
                gutterBottom
                sx={{ color: "text.secondary", fontSize: 14 }}
              >
                Kosten & boetes
              </Typography>

              {!collection?.charges || collection.charges.length === 0 ? (
                <Typography variant="body2" color="text.secondary" py={2}>
                  Nog geen kosten of boetes geregistreerd
                </Typography>
              ) : isMobile ? (
                <Stack divider={<Divider />} spacing={1.5} sx={{ mt: 1 }}>
                  {collection.charges.map((charge) => {
                    const chargeStatusInfo = getChargeStatusInfo(charge.status);
                    return (
                      <Box key={charge.id} sx={{ py: 0.5 }}>
                        <InfoField
                          label="Omschrijving"
                          value={charge.concept}
                        />
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="flex-start"
                          sx={{ mt: 1.5 }}
                        >
                          <InfoField
                            label="Bedrag"
                            value={formatCurrency(charge.amount)}
                          />
                          <InfoField
                            label="Status"
                            value={
                              <Chip
                                size="small"
                                label={chargeStatusInfo.label}
                                color={chargeStatusInfo.color}
                              />
                            }
                          />
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Omschrijving</TableCell>
                        <TableCell>Dienst</TableCell>
                        <TableCell align="right">Bedrag</TableCell>
                        <TableCell align="right">Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {collection.charges.map((charge) => {
                        const chargeStatusInfo = getChargeStatusInfo(
                          charge.status,
                        );
                        return (
                          <TableRow key={charge.id}>
                            <TableCell>{charge.concept}</TableCell>
                            <TableCell>{charge.service}</TableCell>
                            <TableCell align="right">
                              {formatCurrency(charge.amount)}
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                size="small"
                                label={chargeStatusInfo.label}
                                color={chargeStatusInfo.color}
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

          <Card>
            <CardContent>
              <Typography
                gutterBottom
                sx={{ color: "text.secondary", fontSize: 14 }}
              >
                Openstaande verplichtingen
              </Typography>

              {!collection?.obligations ||
              collection.obligations.length === 0 ? (
                <Typography variant="body2" color="text.secondary" py={2}>
                  Nog geen verplichtingen geregistreerd
                </Typography>
              ) : isMobile ? (
                <Stack divider={<Divider />} spacing={1.5} sx={{ mt: 1 }}>
                  {collection.obligations.map((obligation) => {
                    const obligationStatusInfo = getObligationStatusInfo(
                      obligation.status,
                    );
                    return (
                      <Box key={obligation.id} sx={{ py: 0.5 }}>
                        <InfoField
                          label="Type"
                          value={`${getObligationTypeLabel(obligation.type)} (${getObligationBeneficiaryLabel(obligation.beneficiary)})`}
                        />
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="flex-start"
                          sx={{ mt: 1.5 }}
                        >
                          <InfoField
                            label="Saldo"
                            value={formatCurrency(obligation.balanceAmount)}
                          />
                          <InfoField
                            label="Status"
                            value={
                              <Chip
                                size="small"
                                label={obligationStatusInfo.label}
                                color={obligationStatusInfo.color}
                              />
                            }
                          />
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>Begunstigde</TableCell>
                        <TableCell align="right">Oorspronkelijk</TableCell>
                        <TableCell align="right">Betaald</TableCell>
                        <TableCell align="right">Saldo</TableCell>
                        <TableCell align="right">Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {collection.obligations.map((obligation) => {
                        const obligationStatusInfo = getObligationStatusInfo(
                          obligation.status,
                        );
                        return (
                          <TableRow key={obligation.id}>
                            <TableCell>
                              {getObligationTypeLabel(obligation.type)}
                            </TableCell>
                            <TableCell>
                              {getObligationBeneficiaryLabel(
                                obligation.beneficiary,
                              )}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(obligation.originalAmount)}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(obligation.paidAmount)}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(obligation.balanceAmount)}
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                size="small"
                                label={obligationStatusInfo.label}
                                color={obligationStatusInfo.color}
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

          <Card>
            <CardContent>
              <Typography
                gutterBottom
                sx={{ color: "text.secondary", fontSize: 14 }}
              >
                Digitaal dossier
              </Typography>
              {params.id && <CaseFileList debtClaimId={params.id as string} />}
            </CardContent>
          </Card>
        </Stack>
      </Stack>

      <AgreementRequestDialog
        open={!!decideAgreementId}
        agreementId={decideAgreementId}
        onClose={() => setDecideAgreementId(null)}
        onResolved={() => params.id && loadData(params.id as string)}
      />

      {params.id && (
        <TransferToLawyerDialog
          open={transferDialogOpen}
          onClose={() => setTransferDialogOpen(false)}
          debtClaimId={params.id as string}
          onTransferred={() => loadData(params.id as string)}
        />
      )}

      {params.id && (
        <StartCopDialog
          open={startCopDialogOpen}
          onClose={() => setStartCopDialogOpen(false)}
          debtClaimId={params.id as string}
          principalAmount={Number(collection?.principalAmount) || 0}
          onStarted={(collectionId) => {
            setCollectiveCollectionId(collectionId);
            router.push(`/collective-follow-up/${collectionId}`);
          }}
        />
      )}
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
