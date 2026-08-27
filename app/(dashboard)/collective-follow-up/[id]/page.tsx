"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import PersonIcon from "@mui/icons-material/Person";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ShieldIcon from "@mui/icons-material/Shield";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import HandshakeIcon from "@mui/icons-material/Handshake";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ScheduleIcon from "@mui/icons-material/Schedule";
import CancelIcon from "@mui/icons-material/Cancel";
import GavelIcon from "@mui/icons-material/Gavel";
import InfoIcon from "@mui/icons-material/Info";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import LabelOutlinedIcon from "@mui/icons-material/LabelOutlined";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { UserRole } from "@/shared/constants/user-role";
import LoadingUI from "@/shared/ui/loading-ui";
import { formatCurrency, formatDate, formatDateTime } from "@/shared/utils/formatters";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { getDebts } from "@/modules/collection/actions/debtor.actions";
import {
  getCollectiveCollectionById,
  getCollectiveCollectionNegotiations,
  keepCopActive,
} from "@/modules/collective-follow-up/actions/collective-collection.actions";
import { getClaimTimelineForDebtClaim } from "@/modules/collection/actions/debt-claim.actions";
import { getCollectiveCollectionStatusInfo } from "@/modules/collective-follow-up/utils/collective-collection-status";
import { CopTimeline } from "@/modules/collective-follow-up/components/cop-timeline";
import { DebtorRequestAgreementDialog } from "@/modules/collective-follow-up/components/debtor-request-agreement-dialog";
import { NegotiationDecisionDialog } from "@/modules/collective-follow-up/components/negotiation-decision-dialog";
import { TransferToGopDialog } from "@/modules/collective-follow-up/components/transfer-to-gop-dialog";
import { CloseCopDialog } from "@/modules/collective-follow-up/components/close-cop-dialog";
import { CollectiveCollaborationDialog } from "@/modules/collective-follow-up/components/collective-collaboration-dialog";
import { resumeCollectiveCollectionStartPayment } from "@/modules/collective-follow-up/actions/collective-collection.actions";
import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";

type Collection = Awaited<ReturnType<typeof getCollectiveCollectionById>>;
type Negotiation = Awaited<ReturnType<typeof getCollectiveCollectionNegotiations>>[number];
type TimelineEntry = Awaited<ReturnType<typeof getClaimTimelineForDebtClaim>>[number];

type DialogKind =
  | "request-agreement"
  | "decide-negotiation"
  | "transfer"
  | "close"
  | "collaboration"
  | null;

const OPEN_STATUSES = ["ACTIVE", "AWAITING_DEBTOR_RESPONSE"];

const STATUS_HEADER_CONFIG: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  ACTIVE: { bg: "#E7F7EE", border: "#BBF0D2", text: "#16A34A", icon: <CheckCircleIcon fontSize="small" /> },
  AWAITING_DEBTOR_RESPONSE: { bg: "#FEF0E4", border: "#FBD9B4", text: "#F97316", icon: <ScheduleIcon fontSize="small" /> },
  PAYMENT_AGREEMENT_REQUESTED: { bg: "#FEF0E4", border: "#FBD9B4", text: "#F97316", icon: <ScheduleIcon fontSize="small" /> },
  PAYMENT_AGREEMENT_ACCEPTED: { bg: "#E7F7EE", border: "#BBF0D2", text: "#16A34A", icon: <CheckCircleIcon fontSize="small" /> },
  PAID_IN_FULL: { bg: "#E7F7EE", border: "#BBF0D2", text: "#16A34A", icon: <CheckCircleIcon fontSize="small" /> },
  TRANSFERRED: { bg: "#EFF6FF", border: "#BFDBFE", text: "#3B82F6", icon: <GavelIcon fontSize="small" /> },
  CLOSED: { bg: "#FDECEC", border: "#FCA5A5", text: "#DC2626", icon: <CancelIcon fontSize="small" /> },
  PENDING_PAYMENT: { bg: "#FEF0E4", border: "#FBD9B4", text: "#F97316", icon: <AttachMoneyIcon fontSize="small" /> },
};
const DEFAULT_STATUS_HEADER = { bg: "#F1F1F1", border: "#E0E0E0", text: "#6B7280", icon: <InfoIcon fontSize="small" /> };

const STATUS_SUBTITLE: Record<string, string> = {
  ACTIVE: "In samenwerking met deelnemers",
  AWAITING_DEBTOR_RESPONSE: "Wacht op reactie van de debiteur",
  PAYMENT_AGREEMENT_REQUESTED: "Betalingsregeling in beoordeling",
  PAYMENT_AGREEMENT_ACCEPTED: "Betalingsregeling actief",
  PAID_IN_FULL: "Vordering volledig betaald",
  TRANSFERRED: "Overgedragen aan gerechtelijke opvolging",
  CLOSED: "Gesloten zonder resultaat",
  PENDING_PAYMENT: "Wacht op betaling van de startvergoeding",
};

// Item de la fila "Dossierinformatie" — icono en círculo de color + label + valor.
const InfoItem: React.FC<{
  icon: React.ReactNode;
  bg: string;
  color: string;
  label: string;
  children: React.ReactNode;
}> = ({ icon, bg, color, label, children }) => (
  <Stack direction="row" spacing={1.5} alignItems="flex-start">
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        bgcolor: bg,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      {children}
    </Box>
  </Stack>
);

const CollectiveCollectionDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  const collectionId = params.id as string;
  const isDebtor = !!session?.user?.roles?.includes(UserRole.DEBTOR);
  const isStaff = !isDebtor;

  const [loading, setLoading] = useState(true);
  const [collection, setCollection] = useState<Collection>(null);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    if (!collectionId) return;
    try {
      setLoading(true);
      const [collectionData, negotiationsData] = await Promise.all([
        getCollectiveCollectionById(collectionId),
        getCollectiveCollectionNegotiations(collectionId),
      ]);
      setCollection(collectionData);
      setNegotiations(negotiationsData);

      if (collectionData) {
        const [timelineData, debtsResult] = await Promise.all([
          getClaimTimelineForDebtClaim(collectionData.debtClaimId),
          getDebts({ debtor_id: collectionData.debtClaim.debtorId }),
        ]);
        setTimeline(timelineData);
        const debt = debtsResult.data?.find((d) => d.id === collectionData.debtClaimId);
        setBalance(debt ? debt.balance : null);
      }
    } catch (error) {
      console.error("Error fetching collective collection detail:", error);
      notifyError("Er is een fout opgetreden bij het laden van het dossier");
    } finally {
      setLoading(false);
    }
  }, [collectionId]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = () => {
    setRefreshKey((k) => k + 1);
    load();
  };

  const startedByName = useMemo(() => {
    const startedEntries = timeline
      .filter((e) => e.event === "COL_STARTED")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const first = startedEntries[0];
    return first?.createdBy?.fullname || first?.createdBy?.email || null;
  }, [timeline]);

  const debtorNotifiedAt = useMemo(
    () => timeline.find((e) => e.event === "COL_DEBTOR_NOTIFIED")?.createdAt ?? null,
    [timeline],
  );

  const lastUpdateAt = timeline[0]?.createdAt ?? collection?.startedAt ?? null;

  if (loading) {
    return <LoadingUI />;
  }

  if (!collection) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>Dossier niet gevonden.</Typography>
      </Container>
    );
  }

  const statusInfo = getCollectiveCollectionStatusInfo(collection.status);
  const headerStatus = STATUS_HEADER_CONFIG[collection.status] ?? DEFAULT_STATUS_HEADER;
  const openNegotiation = negotiations.find((n) => n.status === "OPEN");
  const isOpen = OPEN_STATUSES.includes(collection.status);

  const canRequestAgreement = isDebtor && isOpen && !openNegotiation;
  const canDecideNegotiation = isStaff && !!openNegotiation;
  const canChooseFollowUpOptions = isStaff && isOpen && !openNegotiation;
  // Gesloten zonder oplossing: geen scherm met meerdere opties meer, alleen
  // nog de ene beschikbare vervolgstap (feedback sponsor, sectie 9).
  const isClosedWithoutResult = isStaff && collection.status === "CLOSED";

  const person = collection.debtClaim.debtor.person;
  const debtorName = person
    ? `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() || person.business_name || "-"
    : "-";

  const handleCreateResumePayment = async () => {
    try {
      const result = await resumeCollectiveCollectionStartPayment(collectionId);
      return { success: true, paymentId: result.paymentId, paymentUrl: result.paymentUrl };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kon de betaling niet ophalen";
      notifyError(message);
      return { success: false, error: message };
    }
  };

  const handleResumePaymentConfirmed = async () => {
    notifySuccess("Betaling bevestigd. De Collectieve Opvolging wordt geactiveerd.");
    refresh();
  };

  const handleKeepActive = async () => {
    try {
      await keepCopActive(collectionId);
      notifySuccess("De Collectieve Opvolging blijft actief.");
      refresh();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Actie mislukt");
    }
  };

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <Stack spacing={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="body2" fontWeight={700} color="text.secondary" sx={{ mb: 0.5 }}>
              Collectieve Opvolging – Overzicht
            </Typography>
            <Typography variant="h4" fontWeight={700}>
              {collection.debtClaim.reference || "Collectieve Opvolging"}
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.5,
                py: 0.5,
                borderRadius: 999,
                bgcolor: headerStatus.bg,
                border: "1px solid",
                borderColor: headerStatus.border,
                color: headerStatus.text,
              }}
            >
              {headerStatus.icon}
              <Typography variant="body2" fontWeight={700} sx={{ color: "inherit" }}>
                {statusInfo.label}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              Sinds {formatDate(collection.startedAt.toString())}
            </Typography>
          </Box>
        </Stack>

        <Card>
          <CardContent>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <InfoItem icon={<PersonIcon />} bg="#EFF6FF" color="#3B82F6" label="Debiteur">
                  <Typography variant="body1" fontWeight={700}>{debtorName}</Typography>
                  {person?.personal_number && (
                    <Chip
                      size="small"
                      label={person.personal_number}
                      sx={{
                        mt: 0.5,
                        fontWeight: 600,
                        bgcolor: "#FEF0E4",
                        borderColor: "#FBD9B4",
                        color: "#F97316",
                      }}
                      variant="outlined"
                    />
                  )}
                </InfoItem>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <InfoItem icon={<AttachMoneyIcon />} bg="#E7F7EE" color="#16A34A" label="Openstaand bedrag">
                  <Typography variant="body1" fontWeight={700}>
                    {formatCurrency(balance ?? collection.debtClaim.principalAmount)}
                  </Typography>
                </InfoItem>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <InfoItem icon={<CalendarTodayIcon />} bg="#F3F0FF" color="#8B5CF6" label="Gestart op">
                  <Typography variant="body1" fontWeight={700}>{formatDate(collection.startedAt.toString())}</Typography>
                  {startedByName && (
                    <Typography variant="caption" color="text.secondary">door {startedByName}</Typography>
                  )}
                </InfoItem>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <InfoItem icon={<ShieldIcon />} bg="#FEF0E4" color="#F97316" label="Status">
                  <Typography variant="body1" fontWeight={700}>{statusInfo.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {STATUS_SUBTITLE[collection.status] ?? ""}
                  </Typography>
                </InfoItem>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {isStaff && collection.status === "PENDING_PAYMENT" && (
          <Card sx={{ borderColor: "#FBD9B4", bgcolor: "#FFF7ED" }} variant="outlined">
            <CardContent>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} justifyContent="space-between">
                <Box>
                  <Typography variant="body1" fontWeight={700}>
                    Startvergoeding nog niet betaald
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    De Collectieve Opvolging wordt pas actief zodra de startvergoeding (5%) via Sentoo is
                    bevestigd. Rond de betaling af om verder te gaan.
                  </Typography>
                </Box>
                <Box sx={{ minWidth: { sm: 200 } }}>
                  <PaymentIntent
                    onCreateTransaction={handleCreateResumePayment}
                    onPaymentConfirmed={handleResumePaymentConfirmed}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardHeader title="Tijdlijn" />
              <Divider />
              <CardContent>
                <CopTimeline debtClaimId={collection.debtClaimId} refreshKey={refreshKey} />
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={3}>
              {isStaff && (
                <Card>
                  <CardHeader title="Collectieve medewerking" />
                  <Divider />
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <WorkOutlineIcon fontSize="small" color={collection.employerTenantId ? "success" : "disabled"} />
                        <Typography variant="body2" sx={{ flex: 1 }}>Werkgever gevonden</Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {collection.employerTenantId ? "Ja" : "Nee"}
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <PersonIcon fontSize="small" color={debtorNotifiedAt ? "success" : "disabled"} />
                        <Typography variant="body2" sx={{ flex: 1 }}>Debiteur geïnformeerd</Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {debtorNotifiedAt ? "Ja" : "Nee"}
                        </Typography>
                      </Stack>
                    </Stack>
                    <Button
                      fullWidth
                      variant="outlined"
                      endIcon={<ChevronRightIcon />}
                      sx={{ mt: 2, justifyContent: "space-between", textTransform: "none" }}
                      onClick={() => setDialog("collaboration")}
                    >
                      Bekijk details
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader title="Dossierdetails" />
                <Divider />
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <LabelOutlinedIcon fontSize="small" color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          Referentie
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {collection.debtClaim.reference || collection.debtClaimId}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <PersonIcon fontSize="small" color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          Dossier gestart door
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {startedByName || "-"}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <AccessTimeIcon fontSize="small" color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          Laatste update
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {lastUpdateAt ? formatDateTime(lastUpdateAt.toString()) : "-"}
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>

        {collection.transferredToCaseTransferId && (
          <Card>
            <CardContent>
              <Button
                variant="outlined"
                onClick={() =>
                  router.push(`/legal-processes/transfers/${collection.transferredToCaseTransferId}`)
                }
              >
                Bekijk overgedragen dossier
              </Button>
            </CardContent>
          </Card>
        )}

        {isClosedWithoutResult && (
          <Card variant="outlined" sx={{ borderColor: "#FCA5A5", bgcolor: "#FEF2F2" }}>
            <CardContent>
              <Typography variant="body1" fontWeight={700}>
                Collectieve Opvolging beëindigd zonder oplossing.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                Beschikbare vervolgstap
              </Typography>
              <Button
                variant="contained"
                startIcon={<SwapHorizIcon />}
                onClick={() => setDialog("transfer")}
              >
                Dossier overdragen
              </Button>
            </CardContent>
          </Card>
        )}

        {(isStaff || canRequestAgreement) && !isClosedWithoutResult && (
          <Card>
            <CardContent>
              {openNegotiation && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Aangevraagde betalingsregeling — voorgesteld bedrag:{" "}
                    {formatCurrency(Number(openNegotiation.proposalAmount))}
                  </Typography>
                  {!!openNegotiation.installmentsCount && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      {openNegotiation.installmentsCount} termijnen van{" "}
                      {formatCurrency(Number(openNegotiation.installmentAmount ?? 0))}
                      {openNegotiation.startDate &&
                        ` — vanaf ${formatDate(openNegotiation.startDate.toString())}`}
                      {openNegotiation.endDate &&
                        ` tot ${formatDate(openNegotiation.endDate.toString())}`}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {openNegotiation.submittedByRole === "EMPLOYER"
                      ? "Ingediend door de werkgever, namens de debiteur."
                      : "Ingediend door de debiteur zelf."}
                  </Typography>
                  {openNegotiation.notes && (
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {openNegotiation.notes}
                    </Typography>
                  )}
                </Box>
              )}
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                {canDecideNegotiation && (
                  <Button variant="contained" onClick={() => setDialog("decide-negotiation")}>
                    Betalingsregeling beoordelen
                  </Button>
                )}
                {isStaff && (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={<SwapHorizIcon />}
                      disabled={!canChooseFollowUpOptions}
                      onClick={() => setDialog("transfer")}
                    >
                      Dossier overdragen
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<TrackChangesIcon />}
                      onClick={() => setDialog("collaboration")}
                    >
                      Bekijk collectieve reacties
                    </Button>
                    {canChooseFollowUpOptions && (
                      <Button variant="text" onClick={handleKeepActive}>
                        Actief houden
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<PersonOffIcon />}
                      disabled={!canChooseFollowUpOptions}
                      onClick={() => setDialog("close")}
                    >
                      Sluiten
                    </Button>
                  </>
                )}
                {canRequestAgreement && (
                  <Button
                    variant="contained"
                    startIcon={<HandshakeIcon />}
                    onClick={() => setDialog("request-agreement")}
                  >
                    Betalingsregeling aanvragen
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>

      <DebtorRequestAgreementDialog
        open={dialog === "request-agreement"}
        onClose={() => setDialog(null)}
        collectionId={collectionId}
        outstandingAmount={balance ?? collection.debtClaim.principalAmount}
        onRequested={refresh}
      />

      {openNegotiation && (
        <NegotiationDecisionDialog
          open={dialog === "decide-negotiation"}
          onClose={() => setDialog(null)}
          negotiationId={openNegotiation.id}
          proposalAmount={Number(openNegotiation.proposalAmount)}
          installmentsCount={openNegotiation.installmentsCount}
          installmentAmount={
            openNegotiation.installmentAmount != null ? Number(openNegotiation.installmentAmount) : null
          }
          startDate={openNegotiation.startDate}
          endDate={openNegotiation.endDate}
          onDecided={refresh}
        />
      )}

      <TransferToGopDialog
        open={dialog === "transfer"}
        onClose={() => setDialog(null)}
        collectionId={collectionId}
        debtClaimId={collection.debtClaimId}
        onTransferred={refresh}
      />

      <CloseCopDialog
        open={dialog === "close"}
        onClose={() => setDialog(null)}
        collectionId={collectionId}
        onClosed={refresh}
      />

      <CollectiveCollaborationDialog
        open={dialog === "collaboration"}
        onClose={() => setDialog(null)}
        collectionId={collectionId}
        employerFound={!!collection.employerTenantId}
        employerTenantName={collection.employerTenant?.name}
        employerMatchedAt={collection.employerMatchedAt?.toString() ?? null}
      />
    </Container>
  );
};

export default CollectiveCollectionDetailPage;
