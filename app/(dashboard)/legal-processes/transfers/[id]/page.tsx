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
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { UserRole } from "@/shared/constants/user-role";

import {
  getCaseTransferById,
  extendCaseTransferAcceptanceDeadline,
  rejectOverdueCaseTransfer,
  getCaseTransferAgreements,
  decideCaseTransferAgreement,
} from "@/modules/legal-process/actions/case-transfer.actions";
import { getCaseTransferStatusInfo } from "@/modules/legal-process/utils/case-transfer-status";
import { CaseTransferStatus } from "@/modules/legal-process/constants/case-transfer-status";
import { GopTimeline } from "@/modules/legal-process/components/gop-timeline";
import { CaseTransferDocuments } from "@/modules/legal-process/components/case-transfer-documents";
import { RejectTransferDialog } from "@/modules/legal-process/components/reject-transfer-dialog";
import { AcceptTransferDialog } from "@/modules/legal-process/components/accept-transfer-dialog";
import { CancelTransferDialog } from "@/modules/legal-process/components/cancel-transfer-dialog";
import { FinalizeLawyerWorkDialog } from "@/modules/legal-process/components/finalize-lawyer-work-dialog";
import { TransferToBailiffDialog } from "@/modules/legal-process/components/transfer-to-bailiff-dialog";
import { PowerOfAttorneyDialog } from "@/modules/legal-process/components/power-of-attorney-dialog";
import { ProposeCaseTransferAgreementDialog } from "@/modules/legal-process/components/propose-case-transfer-agreement-dialog";
import { AgreementDecisionDialog } from "@/modules/agreement/components/agreement-decision-dialog";
import { AgreementResponse } from "@/modules/agreement/services/agreement.validators";

type CaseTransferDetail = Awaited<ReturnType<typeof getCaseTransferById>>;

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

const CaseTransferDetailPage: React.FC = () => {
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
  const [caseTransfer, setCaseTransfer] = useState<CaseTransferDetail | null>(null);
  const [agreements, setAgreements] = useState<AgreementResponse[]>([]);
  const [selectedAgreement, setSelectedAgreement] = useState<AgreementResponse | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [dialog, setDialog] = useState<
    | null
    | "accept"
    | "reject"
    | "cancel"
    | "finalize-lawyer-work"
    | "transfer-to-bailiff"
    | "power-of-attorney"
    | "propose-agreement"
    | "decide-agreement"
  >(null);

  const load = useCallback(async () => {
    if (!params.id) return;
    try {
      setLoading(true);
      const [data, agreementsData] = await Promise.all([
        getCaseTransferById(params.id as string),
        getCaseTransferAgreements(params.id as string),
      ]);
      setCaseTransfer(data);
      setAgreements(agreementsData);
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
  if (!caseTransfer) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography>Dossier niet gevonden.</Typography>
      </Container>
    );
  }

  const statusInfo = getCaseTransferStatusInfo(caseTransfer.status);
  const debtorName = caseTransfer.debtClaim.debtor?.person
    ? `${caseTransfer.debtClaim.debtor.person.first_name ?? ""} ${caseTransfer.debtClaim.debtor.person.last_name ?? ""}`.trim()
    : "-";

  const handleExtendDeadline = async () => {
    try {
      await extendCaseTransferAcceptanceDeadline(caseTransfer.id);
      notifySuccess("Acceptatietermijn met 7 dagen verlengd");
      refresh();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Actie mislukt");
    }
  };

  const handleRejectOverdue = async () => {
    try {
      await rejectOverdueCaseTransfer(caseTransfer.id);
      notifySuccess("Dossier afgewezen. U kunt nu een andere advocaat/deurwaarder selecteren.");
      router.push(`/collections/${caseTransfer.debtClaimId}`);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Actie mislukt");
    }
  };

  // El abogado/alguacil decide aceptar o rechazar la transferencia al final
  // de la página, después de haber visto toda la información del expediente.
  const canDecideTransfer =
    caseTransfer.status === CaseTransferStatus.PENDING_ACCEPTANCE &&
    (caseTransfer.lawyer ? isLawyer : isBailiffRole);

  const isLawyerTrack = !!caseTransfer.lawyer;

  // Solo el alguacil asignado registra el vonnis — directo si nunca hubo
  // abogado, o después de que el abogado finalizó su trabajo y le transfirió
  // el expediente.
  const showVerdictButton =
    isBailiffRole &&
    !!caseTransfer.bailiffId &&
    (caseTransfer.status === CaseTransferStatus.ACCEPTED ||
      caseTransfer.status === CaseTransferStatus.WORK_COMPLETED);

  const showFinalizeLawyerWorkButton =
    isLawyer &&
    isLawyerTrack &&
    caseTransfer.status === CaseTransferStatus.ACCEPTED &&
    !caseTransfer.workCompletedAt;

  const showTransferToBailiffButton =
    isLawyer &&
    isLawyerTrack &&
    !!caseTransfer.workCompletedAt &&
    !caseTransfer.bailiffId;

  // Solo el participante puede cancelar, y únicamente mientras no exista un
  // GOP real (todavía no se registró ningún vonnis).
  const CANCELLABLE_STATUSES: CaseTransferStatus[] = [
    CaseTransferStatus.PENDING_ACCEPTANCE,
    CaseTransferStatus.ACCEPTED,
    CaseTransferStatus.WORK_COMPLETED,
  ];
  const showCancelButton = isStaff && CANCELLABLE_STATUSES.includes(caseTransfer.status);

  // Día 7: el plazo de aceptación venció sin respuesta — el participante
  // decide (nunca vence ni se rechaza automáticamente). Ver
  // CaseTransferService.sendAcceptanceReminders.
  const showAcceptanceDeadlineDecision =
    isStaff &&
    caseTransfer.status === CaseTransferStatus.PENDING_ACCEPTANCE &&
    !!caseTransfer.acceptanceDeadline &&
    new Date(caseTransfer.acceptanceDeadline) <= new Date();

  const hasActionsCard = showVerdictButton || showCancelButton;

  // Propuestas de acuerdo de pago: el participante, el abogado o el
  // alguacil asignado pueden proponer mientras el expediente esté aceptado.
  const isAssignedProfessional = (isLawyer && isLawyerTrack) || (isBailiffRole && !!caseTransfer.bailiffId);
  const canProposeAgreement =
    (isStaff || isAssignedProfessional) && caseTransfer.status === CaseTransferStatus.ACCEPTED;
  // Decidir (aceptar, modificar o rechazar) es del participante, salvo que
  // exista volmacht (power of attorney) otorgada al profesional asignado.
  const canDecideAgreements = isStaff || (isAssignedProfessional && caseTransfer.hasPowerOfAttorney);

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs
        items={[{ label: "Dossieroverdracht", href: "/legal-processes" }, { label: "Overdracht" }]}
      />

      <Stack spacing={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Typography variant="h4" fontWeight={700}>
            {caseTransfer.debtClaim.reference}
          </Typography>
          <Stack direction="row" spacing={1}>
            {caseTransfer.isEmergencyTransfer && (
              <Chip label="Noodoverdracht" color="error" sx={{ fontWeight: 700 }} />
            )}
            <Chip label={statusInfo.label} color={statusInfo.color} sx={{ fontWeight: 700 }} />
          </Stack>
        </Stack>

        <Card>
          <CardHeader title="Dossierinformatie" />
          <CardContent>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Debiteur" value={debtorName} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Vordering" value={caseTransfer.debtClaim.reference} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField
                  label="Bedrag"
                  value={formatCurrency(Number(caseTransfer.debtClaim.principalAmount) || 0)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField
                  label="Advocaat"
                  value={
                    caseTransfer.lawyer
                      ? `${caseTransfer.lawyer.firstName} ${caseTransfer.lawyer.lastName}`
                      : "-"
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Deurwaarder" value={caseTransfer.bailiff?.fullname ?? "-"} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Gestart op" value={formatDate(caseTransfer.createdAt.toString())} />
              </Grid>
              {caseTransfer.isEmergencyTransfer && (
                <Grid size={{ xs: 12 }}>
                  <InfoField label="Reden noodoverdracht" value={caseTransfer.emergencyReason ?? "-"} />
                </Grid>
              )}
              {caseTransfer.status === CaseTransferStatus.REJECTED && (
                <Grid size={{ xs: 12 }}>
                  <InfoField label="Reden afwijzing" value={caseTransfer.rejectionReason ?? "-"} />
                </Grid>
              )}
              {caseTransfer.status === CaseTransferStatus.CANCELLED && (
                <Grid size={{ xs: 12 }}>
                  <InfoField label="Reden annulering" value={caseTransfer.cancelReason ?? "-"} />
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Documenten" />
          <Divider />
          <CardContent>
            <CaseTransferDocuments
              caseTransferId={caseTransfer.id}
              canUpload={isStaff || isBailiffRole || isLawyer}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Betalingsregeling"
            action={
              <Stack direction="row" spacing={1}>
                {isStaff && (
                  <Button size="small" onClick={() => setDialog("power-of-attorney")}>
                    Volmacht beheren
                  </Button>
                )}
                {canProposeAgreement && (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => setDialog("propose-agreement")}
                  >
                    Voorstellen
                  </Button>
                )}
              </Stack>
            }
          />
          <Divider />
          <CardContent>
            <Chip
              size="small"
              sx={{ mb: 2, fontWeight: 700 }}
              color={caseTransfer.hasPowerOfAttorney ? "success" : "default"}
              label={
                caseTransfer.hasPowerOfAttorney
                  ? "Volmacht verleend aan de professional"
                  : "Geen volmacht — de deelnemer beslist altijd"
              }
            />
            {agreements.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Nog geen betalingsregeling voorgesteld.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {agreements.map((agreement) => (
                  <Box
                    key={agreement.id}
                    onClick={() => {
                      setSelectedAgreement(agreement);
                      setDialog("decide-agreement");
                    }}
                    sx={{
                      p: 1.5,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography variant="body2">
                      {formatCurrency(agreement.total_amount)} — {agreement.installments_count} termijnen
                    </Typography>
                    <Chip size="small" label={agreement.status} />
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Audit trail" />
          <Divider />
          <CardContent>
            <GopTimeline debtClaimId={caseTransfer.debtClaimId} refreshKey={refreshKey} />
          </CardContent>
        </Card>

        {hasActionsCard && (
          <Card>
            <CardHeader title="Acties" />
            <Divider />
            <CardContent>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {showVerdictButton && (
                  <Button
                    variant="contained"
                    onClick={() => router.push(`/verdicts/new?caseTransferId=${caseTransfer.id}`)}
                  >
                    Vonnis registreren
                  </Button>
                )}
                {showCancelButton && (
                  <Button variant="outlined" color="error" onClick={() => setDialog("cancel")}>
                    Overdracht annuleren
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        {(showFinalizeLawyerWorkButton || showTransferToBailiffButton) && (
          <Card>
            <CardHeader title="Afronding van het werk van de advocaat" />
            <Divider />
            <CardContent>
              {showFinalizeLawyerWorkButton && (
                <Stack spacing={2} alignItems="flex-start">
                  <Typography variant="body2" color="text.secondary">
                    Antes de transferir la sentencia al agente judicial, registre sus honorarios,
                    suba su factura y pague la comisión del CFSB (5%) sobre ese monto.
                  </Typography>
                  <Button variant="contained" onClick={() => setDialog("finalize-lawyer-work")}>
                    Finalizar trabajo
                  </Button>
                </Stack>
              )}
              {showTransferToBailiffButton && (
                <Stack spacing={2} alignItems="flex-start">
                  <Chip label="Trabajo finalizado" color="success" sx={{ fontWeight: 700 }} />
                  <Typography variant="body2" color="text.secondary">
                    Antes de continuar, adjunte el documento del Vonnis en la sección Documenten
                    (tipo &quot;Vonnis&quot;). Sin ese documento no se puede transferir el
                    expediente al agente judicial.
                  </Typography>
                  <Button variant="contained" onClick={() => setDialog("transfer-to-bailiff")}>
                    Transferir sentencia al agente judicial
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        )}

        {showAcceptanceDeadlineDecision && (
          <Card>
            <CardHeader title="Acceptatietermijn verstreken" />
            <Divider />
            <CardContent>
              <Typography variant="body2" color="text.secondary" mb={2}>
                De termijn van 7 dagen om het dossier te accepteren of af te wijzen is verstreken
                zonder reactie. Beslis of u 7 dagen extra toekent of een andere professional
                selecteert. Het dossier wordt niet automatisch gesloten of afgewezen.
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button variant="contained" onClick={handleExtendDeadline}>
                  7 dagen extra toekennen
                </Button>
                <Button variant="outlined" color="error" onClick={handleRejectOverdue}>
                  Andere professional kiezen
                </Button>
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
                <Button variant="contained" onClick={() => setDialog("accept")}>
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

      <AcceptTransferDialog
        open={dialog === "accept"}
        onClose={() => setDialog(null)}
        caseTransferId={caseTransfer.id}
        onRegistered={refresh}
      />
      <RejectTransferDialog
        open={dialog === "reject"}
        onClose={() => setDialog(null)}
        caseTransferId={caseTransfer.id}
        onRegistered={refresh}
      />
      <CancelTransferDialog
        open={dialog === "cancel"}
        onClose={() => setDialog(null)}
        caseTransferId={caseTransfer.id}
        onRegistered={refresh}
      />
      <FinalizeLawyerWorkDialog
        open={dialog === "finalize-lawyer-work"}
        onClose={() => setDialog(null)}
        caseTransferId={caseTransfer.id}
        onFinalized={refresh}
      />
      <TransferToBailiffDialog
        open={dialog === "transfer-to-bailiff"}
        onClose={() => setDialog(null)}
        caseTransferId={caseTransfer.id}
        onTransferred={refresh}
      />
      <PowerOfAttorneyDialog
        open={dialog === "power-of-attorney"}
        onClose={() => setDialog(null)}
        caseTransferId={caseTransfer.id}
        currentlyGranted={caseTransfer.hasPowerOfAttorney}
        onUpdated={refresh}
      />
      <ProposeCaseTransferAgreementDialog
        open={dialog === "propose-agreement"}
        onClose={() => setDialog(null)}
        caseTransferId={caseTransfer.id}
        onRegistered={refresh}
      />
      <AgreementDecisionDialog
        open={dialog === "decide-agreement"}
        onClose={() => setDialog(null)}
        agreement={selectedAgreement}
        canDecide={canDecideAgreements}
        onDecide={(agreementId, decision) =>
          decideCaseTransferAgreement(caseTransfer.id, agreementId, decision)
        }
        onDecided={refresh}
      />
    </Container>
  );
};

export default CaseTransferDetailPage;
