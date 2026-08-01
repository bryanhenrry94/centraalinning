"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Container,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Chip,
  Stack,
  Tabs,
  Tab,
} from "@mui/material";

import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { notifyError } from "@/shared/ui/notifications";
import { useTenant } from "@/modules/auth/hooks/useTenant";
import { UserRole } from "@/shared/constants/user-role";

import {
  getAllLegalProcessesForTenant,
  getMyLegalProcessesAsLawyer,
  getMyLegalProcessesAsBailiff,
} from "@/modules/legal-process/actions/legal-process.actions";
import { getLegalProcessStatusInfo } from "@/modules/legal-process/utils/legal-process-status";
import { LegalProcessStatus } from "@/modules/legal-process/constants/legal-process-status";

type LegalProcessListItem = Awaited<ReturnType<typeof getAllLegalProcessesForTenant>>[number];

const LegalProcessesListPageContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenant } = useTenant();
  const { data: session } = useSession();
  const roles = (session?.user?.roles as string[] | undefined) ?? [];
  const isLawyer = roles.includes(UserRole.LAWYER);
  const isBailiffRole = roles.includes(UserRole.BAILIFF);
  const showPendingTabs = isLawyer || isBailiffRole;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<LegalProcessListItem[]>([]);
  const [tab, setTab] = useState<"pending" | "all">(
    searchParams.get("tab") === "pending" ? "pending" : "all",
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        let data: LegalProcessListItem[] = [];
        if (roles.includes(UserRole.LAWYER)) {
          data = await getMyLegalProcessesAsLawyer();
        } else if (roles.includes(UserRole.BAILIFF)) {
          data = await getMyLegalProcessesAsBailiff();
        } else if (tenant?.id) {
          data = await getAllLegalProcessesForTenant(tenant.id);
        }
        setItems(data);
      } catch (error) {
        notifyError("Kon GOP-dossiers niet laden");
      } finally {
        setLoading(false);
      }
    };

    if (session) load();
  }, [tenant?.id, session]);

  const filteredItems = useMemo(() => {
    if (!showPendingTabs) return items;
    return items.filter((item) =>
      tab === "pending"
        ? item.status === LegalProcessStatus.PENDING_ACCEPTANCE
        : item.status !== LegalProcessStatus.PENDING_ACCEPTANCE,
    );
  }, [items, showPendingTabs, tab]);

  if (loading) return <LoadingUI />;

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "Gerechtelijke opvolging (GOP)" }]} />

      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Gerechtelijke opvolging
        </Typography>

        {showPendingTabs && (
          <Tabs value={tab} onChange={(_, value) => setTab(value)}>
            <Tab label="Nieuwe overdrachten" value="pending" />
            <Tab label="Mijn dossiers" value="all" />
          </Tabs>
        )}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Referentie</TableCell>
                <TableCell>Debiteur</TableCell>
                <TableCell>Advocaat</TableCell>
                <TableCell>Deurwaarder</TableCell>
                <TableCell align="right">Bedrag</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Gestart op</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography variant="body2" color="text.secondary" py={2}>
                      Nog geen GOP-dossiers.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {filteredItems.map((item) => {
                const statusInfo = getLegalProcessStatusInfo(item.status);
                const debtorName = item.debtClaim.debtor?.person
                  ? `${item.debtClaim.debtor.person.first_name ?? ""} ${item.debtClaim.debtor.person.last_name ?? ""}`.trim()
                  : "-";

                return (
                  <TableRow
                    key={item.id}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => router.push(`/legal-processes/${item.id}`)}
                  >
                    <TableCell>{item.referenceNumber || item.debtClaim.reference}</TableCell>
                    <TableCell>{debtorName}</TableCell>
                    <TableCell>
                      {item.lawyer ? `${item.lawyer.firstName} ${item.lawyer.lastName}` : "-"}
                    </TableCell>
                    <TableCell>{item.bailiff?.fullname ?? "-"}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(Number(item.debtClaim.principalAmount) || 0)}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={statusInfo.label} color={statusInfo.color} />
                    </TableCell>
                    <TableCell>{formatDate(item.startedAt.toString())}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    </Container>
  );
};

const LegalProcessesListPage: React.FC = () => (
  <Suspense fallback={<LoadingUI />}>
    <LegalProcessesListPageContent />
  </Suspense>
);

export default LegalProcessesListPage;
