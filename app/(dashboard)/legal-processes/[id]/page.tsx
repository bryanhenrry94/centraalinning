"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
  Button,
} from "@mui/material";

import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { UserRole } from "@/shared/constants/user-role";

import {
  getLegalProcessById,
  reactivateGop,
  closeGop,
  getGopAgreements,
  getGopPrincipalObligation,
  decideGopAgreement,
} from "@/modules/legal-process/actions/legal-process.actions";
import {
  getLegalProcessStatusInfo,
  getGopInactiveReasonLabel,
} from "@/modules/legal-process/utils/legal-process-status";
import { LegalProcessStatus } from "@/modules/legal-process/constants/legal-process-status";
import { GopTimeline } from "@/modules/legal-process/components/gop-timeline";
import { LegalProcessDocuments } from "@/modules/legal-process/components/legal-process-documents";
import { ExecutionMeasureDialog } from "@/modules/legal-process/components/execution-measure-dialog";
import { InterestUpdateDialog } from "@/modules/legal-process/components/interest-update-dialog";
import { BailiffCostDialog } from "@/modules/legal-process/components/bailiff-cost-dialog";
import { MarkInactiveDialog } from "@/modules/legal-process/components/mark-inactive-dialog";
import { ChangeBailiffDialog } from "@/modules/legal-process/components/change-bailiff-dialog";
import { CreateAgreementDialog } from "@/modules/legal-process/components/create-agreement-dialog";
import { RegisterPaymentDialog } from "@/modules/legal-process/components/register-payment-dialog";
import { FinalizeBailiffWorkDialog } from "@/modules/legal-process/components/finalize-bailiff-work-dialog";
import { AdjustVerdictAmountsDialog } from "@/modules/legal-process/components/adjust-verdict-amounts-dialog";
import { GopPaymentConfirmations } from "@/modules/legal-process/components/gop-payment-confirmations";
import { GopExecutionMeasures } from "@/modules/legal-process/components/gop-execution-measures";
import { AgreementDecisionDialog } from "@/modules/agreement/components/agreement-decision-dialog";
import { AgreementResponse } from "@/modules/agreement/services/agreement.validators";

type LegalProcessDetail = Awaited<ReturnType<typeof getLegalProcessById>>;

function InfoField({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          textTransform: "uppercase",
          letterSpacing: 0.4,
          display: "block",
        }}
      >
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value ?? "-"}
      </Typography>
    </Box>
  );
}

const LegalProcessDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const roles = (session?.user?.roles as string[] | undefined) ?? [];
  const isStaff = roles.some((r) =>
    [
      UserRole.TENANT_ADMIN,
      UserRole.AGENT,
      UserRole.EMPLOYEE,
      UserRole.PLATFORM_OWNER,
    ].includes(r as UserRole),
  );
  const isBailiffRole = roles.includes(UserRole.BAILIFF);

  const [loading, setLoading] = useState(true);
  const [legalProcess, setLegalProcess] = useState<LegalProcessDetail | null>(
    null,
  );
  const [agreements, setAgreements] = useState<
    Awaited<ReturnType<typeof getGopAgreements>>
  >([]);
  const [obligation, setObligation] = useState<Awaited<
    ReturnType<typeof getGopPrincipalObligation>
  > | null>(null);
  const [selectedAgreement, setSelectedAgreement] =
    useState<AgreementResponse | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [dialog, setDialog] = useState<
    | null
    | "execution-measure"
    | "interest-update"
    | "bailiff-cost"
    | "mark-inactive"
    | "change-bailiff"
    | "create-agreement"
    | "register-payment"
    | "finalize-bailiff-work"
    | "decide-agreement"
    | "adjust-verdict"
  >(null);

  const load = useCallback(async () => {
    if (!params.id) return;
    try {
      setLoading(true);
      const data = await getLegalProcessById(params.id as string);
      setLegalProcess(data);
      if (data) {
        const [agreementsData, obligationData] = await Promise.all([
          getGopAgreements(data.id),
          getGopPrincipalObligation(data.debtClaimId),
        ]);
        setAgreements(agreementsData);
        setObligation(obligationData);
      }
    } catch (error) {
      notifyError("Kon dossier niet laden");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = () => {
    setRefreshKey((k) => k + 1);
    load();
  };

  if (loading) return <LoadingUI />;
  if (!legalProcess) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography>Dossier niet gevonden.</Typography>
      </Container>
    );
  }

  const statusInfo = getLegalProcessStatusInfo(legalProcess.status);
  const latestVerdict = legalProcess.verdicts[legalProcess.verdicts.length - 1];
  const debtorName = legalProcess.debtClaim.debtor?.person
    ? `${legalProcess.debtClaim.debtor.person.first_name ?? ""} ${legalProcess.debtClaim.debtor.person.last_name ?? ""}`.trim()
    : "-";

  const handleReactivate = async () => {
    try {
      await reactivateGop(legalProcess.id);
      notifySuccess("GOP gereactiveerd");
      refresh();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Actie mislukt");
    }
  };

  const handleClose = async () => {
    try {
      await closeGop(legalProcess.id);
      notifySuccess("GOP gesloten");
      refresh();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Actie mislukt");
    }
  };

  const canManageOperations =
    (isStaff || isBailiffRole) &&
    [LegalProcessStatus.GOP_ACTIVE, LegalProcessStatus.GOP_INACTIVE].includes(
      legalProcess.status as LegalProcessStatus,
    );

  // El cierre exige haber facturado los costos del alguacil y pagado la
  // comisión CFSB (5%) sobre ese monto — mismo gate que el trabajo del
  // abogado en el flujo de CaseTransfer.
  const isBailiffWorkFinalized = !!legalProcess.gopCompletedGateAt;

  // Decidir (aceptar, modificar o rechazar) un acuerdo de pago: el
  // participante siempre puede; el alguacil asignado solo si el
  // CaseTransfer de origen tiene volmacht (power of attorney) otorgada.
  const hasPowerOfAttorney = !!legalProcess.caseTransfer?.hasPowerOfAttorney;
  const canDecideAgreements = isStaff || (isBailiffRole && hasPowerOfAttorney);

  return (
    <Container
      maxWidth="lg"
      disableGutters
      sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
    >
      <AppBreadcrumbs
        items={[
          { label: "Gerechtelijke opvolging", href: "/legal-processes" },
          { label: "Details" },
        ]}
      />

      <Stack spacing={3}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={1}
        >
          <Typography variant="h4" fontWeight={700}>
            {legalProcess.referenceNumber || legalProcess.debtClaim.reference}
          </Typography>
          <Chip
            label={statusInfo.label}
            color={statusInfo.color}
            sx={{ fontWeight: 700 }}
          />
        </Stack>

        <Card>
          <CardHeader title="Dossierinformatie" />
          <CardContent>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Debiteur" value={debtorName} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField
                  label="Vordering"
                  value={legalProcess.debtClaim.reference}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField
                  label="Bedrag"
                  value={formatCurrency(
                    Number(legalProcess.debtClaim.principalAmount) || 0,
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField
                  label="Advocaat"
                  value={
                    legalProcess.caseTransfer?.lawyer
                      ? `${legalProcess.caseTransfer.lawyer.firstName} ${legalProcess.caseTransfer.lawyer.lastName}`
                      : "-"
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField
                  label="Deurwaarder"
                  value={legalProcess.bailiff?.fullname ?? "-"}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField
                  label="Gestart op"
                  value={formatDate(legalProcess.startedAt.toString())}
                />
              </Grid>
              {legalProcess.status === LegalProcessStatus.GOP_INACTIVE && (
                <>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <InfoField
                      label="Reden (geen executiemogelijkheid)"
                      value={
                        legalProcess.inactiveReason
                          ? getGopInactiveReasonLabel(
                              legalProcess.inactiveReason,
                            )
                          : "-"
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <InfoField
                      label="Datum van bevinding"
                      value={
                        legalProcess.inactiveFoundAt
                          ? formatDate(legalProcess.inactiveFoundAt.toString())
                          : "-"
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <InfoField
                      label="Controledatum"
                      value={
                        legalProcess.reviewDate
                          ? formatDate(legalProcess.reviewDate.toString())
                          : "-"
                      }
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </CardContent>
        </Card>

        {legalProcess.verdicts.length > 0 && (
          <Card>
            <CardHeader title="Vonnissen" />
            <CardContent>
              {(() => {
                const columns: ListColumn<(typeof legalProcess.verdicts)[number]>[] = [
                  { key: "registration_number", label: "Vonnisnummer", render: (v) => v.registration_number },
                  { key: "court", label: "Rechtbank", render: (v) => v.court || "-", hideOnMobile: true },
                  {
                    key: "sentence_date",
                    label: "Datum",
                    render: (v) => formatDate(v.sentence_date.toString()),
                  },
                  {
                    key: "sentence_amount",
                    label: "Bedrag",
                    align: "right",
                    render: (v) => formatCurrency(v.sentence_amount),
                  },
                  {
                    key: "prescription_due_date",
                    label: "Verjaringsdatum",
                    render: (v) => (v.prescription_due_date ? formatDate(v.prescription_due_date.toString()) : "-"),
                    hideOnMobile: true,
                  },
                ];
                return (
                  <ResponsiveListTable columns={columns} rows={legalProcess.verdicts} getRowKey={(v) => v.id} />
                );
              })()}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader title="Open & betalingsregeling" />
          <Divider />
          <CardContent>
            <Grid container spacing={2.5} mb={2}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField
                  label="Openstaand saldo"
                  value={
                    obligation
                      ? formatCurrency(Number(obligation.balanceAmount))
                      : "Nog geen betalingen"
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Chip
                  size="small"
                  sx={{ fontWeight: 700 }}
                  color={hasPowerOfAttorney ? "success" : "default"}
                  label={
                    hasPowerOfAttorney
                      ? "Volmacht verleend aan de deurwaarder"
                      : "Geen volmacht — de deelnemer beslist altijd"
                  }
                />
              </Grid>
            </Grid>
            {agreements.length > 0 &&
              (() => {
                const columns: ListColumn<(typeof agreements)[number]>[] = [
                  { key: "total_amount", label: "Bedrag", align: "right", render: (a) => formatCurrency(a.total_amount) },
                  { key: "installments_count", label: "Termijnen", render: (a) => a.installments_count },
                  { key: "status", label: "Status", render: (a) => a.status },
                  {
                    key: "rejection_reason",
                    label: "Reden afwijzing",
                    render: (a) => a.rejection_reason ?? "-",
                    hideOnMobile: true,
                  },
                ];
                return (
                  <ResponsiveListTable
                    columns={columns}
                    rows={agreements}
                    getRowKey={(a) => a.id}
                    onRowClick={(a) => {
                      setSelectedAgreement(a);
                      setDialog("decide-agreement");
                    }}
                  />
                );
              })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Betalingen" />
          <Divider />
          <CardContent>
            <GopPaymentConfirmations
              legalProcessId={legalProcess.id}
              currentUserId={session?.user?.id}
              isStaff={isStaff}
              isBailiffRole={isBailiffRole}
              onChanged={refresh}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Executiemaatregelen" />
          <Divider />
          <CardContent>
            <GopExecutionMeasures
              legalProcessId={legalProcess.id}
              canManage={isStaff || isBailiffRole}
              onChanged={refresh}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Documenten" />
          <Divider />
          <CardContent>
            <LegalProcessDocuments
              legalProcessId={legalProcess.id}
              canUpload={isStaff || isBailiffRole}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Audit trail" />
          <Divider />
          <CardContent>
            <GopTimeline
              debtClaimId={legalProcess.debtClaimId}
              refreshKey={refreshKey}
            />
          </CardContent>
        </Card>

        {canManageOperations && (
          <Card>
            <CardHeader title="Acties" />
            <Divider />
            <CardContent>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  variant="outlined"
                  onClick={() =>
                    router.push(
                      `/verdicts/new?legalProcessId=${legalProcess.id}`,
                    )
                  }
                >
                  Aanvullend vonnis registreren
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setDialog("execution-measure")}
                >
                  Executiemaatregel
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setDialog("interest-update")}
                >
                  Rente-update
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setDialog("bailiff-cost")}
                >
                  Deurwaarderskosten
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setDialog("adjust-verdict")}
                >
                  Vonnisbedragen aanpassen
                </Button>
                {legalProcess.status === LegalProcessStatus.GOP_ACTIVE && (
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={() => setDialog("mark-inactive")}
                  >
                    Geen executiemogelijkheid
                  </Button>
                )}
                {legalProcess.status === LegalProcessStatus.GOP_INACTIVE && (
                  <Button
                    variant="outlined"
                    color="success"
                    onClick={handleReactivate}
                  >
                    Reactiveren
                  </Button>
                )}
                <Button
                  variant="outlined"
                  onClick={() => setDialog("change-bailiff")}
                >
                  Deurwaarder wijzigen
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setDialog("create-agreement")}
                >
                  Betalingsregeling registreren
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setDialog("register-payment")}
                >
                  Betaling registreren
                </Button>
                {isBailiffWorkFinalized ? (
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleClose}
                  >
                    Sluiten (vonnis volledig voldaan)
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={() => setDialog("finalize-bailiff-work")}
                  >
                    Trabajo finalizado (costos + comisión CFSB)
                  </Button>
                )}
              </Stack>
              {!isBailiffWorkFinalized && (
                <Typography variant="body2" color="text.secondary" mt={1.5}>
                  Antes de poder cerrar el expediente, registre los costos
                  facturados al debiteur y pague la comisión del CFSB (5%) sobre
                  ese monto.
                </Typography>
              )}
            </CardContent>
          </Card>
        )}
      </Stack>

      {latestVerdict && (
        <>
          <ExecutionMeasureDialog
            open={dialog === "execution-measure"}
            onClose={() => setDialog(null)}
            verdictId={latestVerdict.id}
            onRegistered={refresh}
          />
          <InterestUpdateDialog
            open={dialog === "interest-update"}
            onClose={() => setDialog(null)}
            verdictId={latestVerdict.id}
            onRegistered={refresh}
          />
          <BailiffCostDialog
            open={dialog === "bailiff-cost"}
            onClose={() => setDialog(null)}
            verdictId={latestVerdict.id}
            onRegistered={refresh}
          />
          <AdjustVerdictAmountsDialog
            open={dialog === "adjust-verdict"}
            onClose={() => setDialog(null)}
            verdictId={latestVerdict.id}
            currentSentenceAmount={latestVerdict.sentence_amount}
            currentProcesalCost={latestVerdict.procesal_cost ?? 0}
            onAdjusted={refresh}
          />
        </>
      )}
      <MarkInactiveDialog
        open={dialog === "mark-inactive"}
        onClose={() => setDialog(null)}
        legalProcessId={legalProcess.id}
        onRegistered={refresh}
      />
      <ChangeBailiffDialog
        open={dialog === "change-bailiff"}
        onClose={() => setDialog(null)}
        legalProcessId={legalProcess.id}
        currentBailiffId={legalProcess.bailiffId}
        onRegistered={refresh}
      />
      <CreateAgreementDialog
        open={dialog === "create-agreement"}
        onClose={() => setDialog(null)}
        legalProcessId={legalProcess.id}
        onRegistered={refresh}
      />
      <RegisterPaymentDialog
        open={dialog === "register-payment"}
        onClose={() => setDialog(null)}
        legalProcessId={legalProcess.id}
        balanceAmount={
          obligation ? Number(obligation.balanceAmount) : undefined
        }
        onRegistered={refresh}
      />
      <FinalizeBailiffWorkDialog
        open={dialog === "finalize-bailiff-work"}
        onClose={() => setDialog(null)}
        legalProcessId={legalProcess.id}
        onFinalized={refresh}
      />
      <AgreementDecisionDialog
        open={dialog === "decide-agreement"}
        onClose={() => setDialog(null)}
        agreement={selectedAgreement}
        canDecide={canDecideAgreements}
        onDecide={(agreementId, decision) =>
          decideGopAgreement(legalProcess.id, agreementId, decision)
        }
        onDecided={refresh}
      />
    </Container>
  );
};

export default LegalProcessDetailPage;
