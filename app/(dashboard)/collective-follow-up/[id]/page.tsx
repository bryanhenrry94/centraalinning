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
import { UserRole } from "@/shared/constants/user-role";
import LoadingUI from "@/shared/ui/loading-ui";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import {
  getCollectiveCollectionById,
  getCollectiveCollectionNegotiations,
  keepCopActive,
} from "@/modules/collective-follow-up/actions/collective-collection.actions";
import { getCollectiveCollectionStatusInfo } from "@/modules/collective-follow-up/utils/collective-collection-status";
import { CopTimeline } from "@/modules/collective-follow-up/components/cop-timeline";
import { DebtorRequestAgreementDialog } from "@/modules/collective-follow-up/components/debtor-request-agreement-dialog";
import { NegotiationDecisionDialog } from "@/modules/collective-follow-up/components/negotiation-decision-dialog";
import { TransferToGopDialog } from "@/modules/collective-follow-up/components/transfer-to-gop-dialog";
import { CloseCopDialog } from "@/modules/collective-follow-up/components/close-cop-dialog";

type Collection = Awaited<ReturnType<typeof getCollectiveCollectionById>>;
type Negotiation = Awaited<ReturnType<typeof getCollectiveCollectionNegotiations>>[number];

type DialogKind = "request-agreement" | "decide-negotiation" | "transfer" | "close" | null;

const OPEN_STATUSES = ["ACTIVE", "AWAITING_DEBTOR_RESPONSE"];

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
  const openNegotiation = negotiations.find((n) => n.status === "OPEN");
  const isOpen = OPEN_STATUSES.includes(collection.status);

  const canRequestAgreement = isDebtor && isOpen && !openNegotiation;
  const canDecideNegotiation = isStaff && !!openNegotiation;
  const canChooseFollowUpOptions = isStaff && isOpen && !openNegotiation;

  const person = collection.debtClaim.debtor.person;
  const debtorName = person
    ? `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() || person.business_name || "-"
    : "-";

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
      <AppBreadcrumbs
        items={[
          { label: "Collectieve Opvolging", href: "/collective-follow-up" },
          { label: "Details" },
        ]}
      />

      <Stack spacing={3}>
        <Box>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={1}
          >
            <Typography variant="h4" fontWeight={700}>
              {collection.debtClaim.reference || "Collectieve Opvolging"}
            </Typography>
            <Chip label={statusInfo.label} color={statusInfo.color} sx={{ fontWeight: 700 }} />
          </Stack>
        </Box>

        <Card>
          <CardHeader title="Dossierinformatie" />
          <Divider />
          <CardContent>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="body2" color="text.secondary">Debiteur</Typography>
                <Typography variant="body1">{debtorName}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="body2" color="text.secondary">Bedrag</Typography>
                <Typography variant="body1">{formatCurrency(collection.debtClaim.principalAmount)}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="body2" color="text.secondary">Gestart op</Typography>
                <Typography variant="body1">{formatDate(collection.startedAt.toString())}</Typography>
              </Grid>
              {collection.employerTenantId && (
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Typography variant="body2" color="text.secondary">Werkgever gevonden op</Typography>
                  <Typography variant="body1">
                    {collection.employerMatchedAt ? formatDate(collection.employerMatchedAt.toString()) : "-"}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>

        {openNegotiation && (
          <Card>
            <CardHeader title="Aangevraagde betalingsregeling" />
            <Divider />
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Voorgesteld bedrag: {formatCurrency(Number(openNegotiation.proposalAmount))}
              </Typography>
              {openNegotiation.notes && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {openNegotiation.notes}
                </Typography>
              )}
              {canDecideNegotiation && (
                <Button
                  variant="contained"
                  sx={{ mt: 2 }}
                  onClick={() => setDialog("decide-negotiation")}
                >
                  Betalingsregeling beoordelen
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {(canRequestAgreement || canChooseFollowUpOptions) && (
          <Card>
            <CardHeader title="Acties" />
            <Divider />
            <CardContent>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {canRequestAgreement && (
                  <Button variant="contained" onClick={() => setDialog("request-agreement")}>
                    Betalingsregeling aanvragen
                  </Button>
                )}
                {canChooseFollowUpOptions && (
                  <>
                    <Button variant="outlined" onClick={handleKeepActive}>
                      Actief houden
                    </Button>
                    <Button variant="outlined" onClick={() => setDialog("transfer")}>
                      Overdragen aan gerechtelijke opvolging
                    </Button>
                    <Button variant="outlined" color="error" onClick={() => setDialog("close")}>
                      Sluiten
                    </Button>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

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

        <Card>
          <CardHeader title="Tijdlijn" />
          <Divider />
          <CardContent>
            <CopTimeline debtClaimId={collection.debtClaimId} refreshKey={refreshKey} />
          </CardContent>
        </Card>
      </Stack>

      <DebtorRequestAgreementDialog
        open={dialog === "request-agreement"}
        onClose={() => setDialog(null)}
        collectionId={collectionId}
        onRequested={refresh}
      />

      {openNegotiation && (
        <NegotiationDecisionDialog
          open={dialog === "decide-negotiation"}
          onClose={() => setDialog(null)}
          negotiationId={openNegotiation.id}
          proposalAmount={Number(openNegotiation.proposalAmount)}
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
    </Container>
  );
};

export default CollectiveCollectionDetailPage;
