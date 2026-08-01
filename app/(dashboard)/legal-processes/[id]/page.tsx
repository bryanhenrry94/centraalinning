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
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";

import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { UserRole } from "@/shared/constants/user-role";

import {
  getLegalProcessById,
  acceptLegalProcessTransfer,
  reactivateGop,
  closeGop,
  getGopAgreements,
  getGopPrincipalObligation,
} from "@/modules/legal-process/actions/legal-process.actions";
import { getLegalProcessStatusInfo } from "@/modules/legal-process/utils/legal-process-status";
import { LegalProcessStatus } from "@/modules/legal-process/constants/legal-process-status";
import { GopTimeline } from "@/modules/legal-process/components/gop-timeline";
import { LegalProcessDocuments } from "@/modules/legal-process/components/legal-process-documents";
import { RegisterVerdictDialog } from "@/modules/legal-process/components/register-verdict-dialog";
import { RejectTransferDialog } from "@/modules/legal-process/components/reject-transfer-dialog";
import { ExecutionMeasureDialog } from "@/modules/legal-process/components/execution-measure-dialog";
import { InterestUpdateDialog } from "@/modules/legal-process/components/interest-update-dialog";
import { BailiffCostDialog } from "@/modules/legal-process/components/bailiff-cost-dialog";
import { MarkInactiveDialog } from "@/modules/legal-process/components/mark-inactive-dialog";
import { ChangeBailiffDialog } from "@/modules/legal-process/components/change-bailiff-dialog";
import { CancelGopDialog } from "@/modules/legal-process/components/cancel-gop-dialog";
import { CreateAgreementDialog } from "@/modules/legal-process/components/create-agreement-dialog";
import { RegisterPaymentDialog } from "@/modules/legal-process/components/register-payment-dialog";

type LegalProcessDetail = Awaited<ReturnType<typeof getLegalProcessById>>;

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

const LegalProcessDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const roles = (session?.user?.roles as string[] | undefined) ?? [];
  const isStaff = roles.some((r) =>
    [UserRole.TENANT_ADMIN, UserRole.AGENT, UserRole.EMPLOYEE, UserRole.PLATFORM_OWNER].includes(
      r as UserRole,
    ),
  );
  const isLawyer = roles.includes(UserRole.LAWYER);
  const isBailiffRole = roles.includes(UserRole.BAILIFF);

  const [loading, setLoading] = useState(true);
  const [legalProcess, setLegalProcess] = useState<LegalProcessDetail | null>(null);
  const [agreements, setAgreements] = useState<Awaited<ReturnType<typeof getGopAgreements>>>([]);
  const [obligation, setObligation] = useState<Awaited<
    ReturnType<typeof getGopPrincipalObligation>
  > | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [dialog, setDialog] = useState<
    | null
    | "register-verdict"
    | "reject"
    | "execution-measure"
    | "interest-update"
    | "bailiff-cost"
    | "mark-inactive"
    | "change-bailiff"
    | "cancel"
    | "create-agreement"
    | "register-payment"
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

  const handleAccept = async () => {
    try {
      await acceptLegalProcessTransfer(legalProcess.id);
      notifySuccess("Dossier geaccepteerd");
      refresh();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Actie mislukt");
    }
  };

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

  // El abogado/alguacil decide aceptar o rechazar la transferencia al final
  // de la página, después de haber visto toda la información del expediente.
  const canDecideTransfer =
    legalProcess.status === LegalProcessStatus.PENDING_ACCEPTANCE &&
    (legalProcess.lawyer ? isLawyer : isBailiffRole);

  // Solo el alguacil asignado registra la sentencia — el personal del
  // tenant ya no puede hacerlo en su nombre.
  const showVerdictButton =
    legalProcess.status === LegalProcessStatus.IN_PROCEDURE && isBailiffRole;

  // Solo el participante puede cancelar el GOP, y únicamente mientras no
  // haya ninguna sentencia registrada.
  const showCancelButton =
    isStaff &&
    legalProcess.status === LegalProcessStatus.IN_PROCEDURE &&
    legalProcess.verdicts.length === 0;

  const hasActionsCard = showVerdictButton || canManageOperations || showCancelButton;

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs
        items={[{ label: "Gerechtelijke opvolging", href: "/legal-processes" }, { label: "Details" }]}
      />

      <Stack spacing={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Typography variant="h4" fontWeight={700}>
            {legalProcess.referenceNumber || legalProcess.debtClaim.reference}
          </Typography>
          <Chip label={statusInfo.label} color={statusInfo.color} sx={{ fontWeight: 700 }} />
        </Stack>

        <Card>
          <CardHeader title="Dossierinformatie" />
          <CardContent>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Debiteur" value={debtorName} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Vordering" value={legalProcess.debtClaim.reference} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField
                  label="Bedrag"
                  value={formatCurrency(Number(legalProcess.debtClaim.principalAmount) || 0)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField
                  label="Advocaat"
                  value={
                    legalProcess.lawyer
                      ? `${legalProcess.lawyer.firstName} ${legalProcess.lawyer.lastName}`
                      : "-"
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Deurwaarder" value={legalProcess.bailiff?.fullname ?? "-"} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Gestart op" value={formatDate(legalProcess.startedAt.toString())} />
              </Grid>
              {legalProcess.status === LegalProcessStatus.GOP_INACTIVE && (
                <>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <InfoField label="Reden inactief" value={legalProcess.inactiveReason ?? "-"} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <InfoField
                      label="Revisiedatum"
                      value={
                        legalProcess.reviewDate ? formatDate(legalProcess.reviewDate.toString()) : "-"
                      }
                    />
                  </Grid>
                </>
              )}
              {legalProcess.status === LegalProcessStatus.REJECTED && (
                <Grid size={{ xs: 12 }}>
                  <InfoField label="Reden afwijzing" value={legalProcess.rejectionReason ?? "-"} />
                </Grid>
              )}
              {legalProcess.status === LegalProcessStatus.GOP_CANCELLED && (
                <Grid size={{ xs: 12 }}>
                  <InfoField label="Reden annulering" value={legalProcess.cancelReason ?? "-"} />
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>

        {legalProcess.verdicts.length > 0 && (
          <Card>
            <CardHeader title="Vonnissen" />
            <CardContent>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Vonnisnummer</TableCell>
                    <TableCell>Rechtbank</TableCell>
                    <TableCell>Datum</TableCell>
                    <TableCell align="right">Bedrag</TableCell>
                    <TableCell>Verjaringsdatum</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {legalProcess.verdicts.map((verdict) => (
                    <TableRow key={verdict.id}>
                      <TableCell>{verdict.registration_number}</TableCell>
                      <TableCell>{verdict.court || "-"}</TableCell>
                      <TableCell>{formatDate(verdict.sentence_date.toString())}</TableCell>
                      <TableCell align="right">{formatCurrency(verdict.sentence_amount)}</TableCell>
                      <TableCell>
                        {verdict.prescription_due_date
                          ? formatDate(verdict.prescription_due_date.toString())
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader title="Saldo & betalingsregeling" />
          <Divider />
          <CardContent>
            <Grid container spacing={2.5} mb={agreements.length > 0 ? 2 : 0}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField
                  label="Openstaand saldo"
                  value={
                    obligation ? formatCurrency(Number(obligation.balanceAmount)) : "Nog geen betalingen"
                  }
                />
              </Grid>
            </Grid>
            {agreements.length > 0 && (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Bedrag</TableCell>
                    <TableCell>Termijnen</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Reden afwijzing</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {agreements.map((agreement) => (
                    <TableRow key={agreement.id}>
                      <TableCell>{formatCurrency(agreement.total_amount)}</TableCell>
                      <TableCell>{agreement.installments_count}</TableCell>
                      <TableCell>{agreement.status}</TableCell>
                      <TableCell>{agreement.rejection_reason ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
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
            <GopTimeline debtClaimId={legalProcess.debtClaimId} refreshKey={refreshKey} />
          </CardContent>
        </Card>

        {/* Acties staan onderaan: eerst alle informatie bekijken, dan beslissen. */}
        {hasActionsCard && (
          <Card>
            <CardHeader title="Acties" />
            <Divider />
            <CardContent>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {showVerdictButton && (
                  <Button variant="contained" onClick={() => setDialog("register-verdict")}>
                    Vonnis registreren
                  </Button>
                )}

                {canManageOperations && (
                  <>
                    <Button variant="outlined" onClick={() => setDialog("execution-measure")}>
                      Executiemaatregel
                    </Button>
                    <Button variant="outlined" onClick={() => setDialog("interest-update")}>
                      Rente-update
                    </Button>
                    <Button variant="outlined" onClick={() => setDialog("bailiff-cost")}>
                      Deurwaarderskosten
                    </Button>
                    {legalProcess.status === LegalProcessStatus.GOP_ACTIVE && (
                      <Button
                        variant="outlined"
                        color="warning"
                        onClick={() => setDialog("mark-inactive")}
                      >
                        Zonder resultaat
                      </Button>
                    )}
                    {legalProcess.status === LegalProcessStatus.GOP_INACTIVE && (
                      <Button variant="outlined" color="success" onClick={handleReactivate}>
                        Reactiveren
                      </Button>
                    )}
                    <Button variant="outlined" onClick={() => setDialog("change-bailiff")}>
                      Deurwaarder wijzigen
                    </Button>
                    <Button variant="outlined" onClick={() => setDialog("create-agreement")}>
                      Betalingsregeling registreren
                    </Button>
                    <Button variant="outlined" onClick={() => setDialog("register-payment")}>
                      Betaling registreren
                    </Button>
                    <Button variant="contained" color="success" onClick={handleClose}>
                      Sluiten (vonnis volledig voldaan)
                    </Button>
                  </>
                )}

                {showCancelButton && (
                  <Button variant="outlined" color="error" onClick={() => setDialog("cancel")}>
                    GOP annuleren
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        {canDecideTransfer && (
          <Card>
            <CardHeader title="Beslissing dossieroverdracht" />
            <Divider />
            <CardContent>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Bekijk alle informatie hierboven en beslis vervolgens of u dit dossier accepteert of
                afwijst.
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button variant="contained" onClick={handleAccept}>
                  Dossier accepteren
                </Button>
                <Button variant="outlined" color="error" onClick={() => setDialog("reject")}>
                  Dossier afwijzen
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>

      <RegisterVerdictDialog
        open={dialog === "register-verdict"}
        onClose={() => setDialog(null)}
        legalProcessId={legalProcess.id}
        defaultBailiffId={legalProcess.bailiffId}
        onRegistered={refresh}
      />
      <RejectTransferDialog
        open={dialog === "reject"}
        onClose={() => setDialog(null)}
        legalProcessId={legalProcess.id}
        onRegistered={refresh}
      />
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
      <CancelGopDialog
        open={dialog === "cancel"}
        onClose={() => setDialog(null)}
        legalProcessId={legalProcess.id}
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
        balanceAmount={obligation ? Number(obligation.balanceAmount) : undefined}
        onRegistered={refresh}
      />
    </Container>
  );
};

export default LegalProcessDetailPage;
