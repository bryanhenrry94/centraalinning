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
  Button,
} from "@mui/material";

import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { notifyError } from "@/shared/ui/notifications";
import { useTenant } from "@/modules/auth/hooks/useTenant";
import { UserRole } from "@/shared/constants/user-role";

import {
  getAllLegalProcessesForTenant,
  getMyLegalProcessesAsBailiff,
} from "@/modules/legal-process/actions/legal-process.actions";
import {
  getAllCaseTransfersForTenant,
  getMyCaseTransfersAsLawyer,
  getMyCaseTransfersAsBailiff,
} from "@/modules/legal-process/actions/case-transfer.actions";
import { getLegalProcessStatusInfo } from "@/modules/legal-process/utils/legal-process-status";
import { getCaseTransferStatusInfo } from "@/modules/legal-process/utils/case-transfer-status";
import { CaseTransferStatus } from "@/modules/legal-process/constants/case-transfer-status";

// Mismas condiciones que showVerdictButton en transfers/[id]/page.tsx: solo
// el alguacil asignado registra el vonnis, y solo mientras el expediente
// esté aceptado (directo) o el abogado ya haya finalizado su trabajo.
const VERDICT_ELIGIBLE_STATUSES: CaseTransferStatus[] = [
  CaseTransferStatus.ACCEPTED,
  CaseTransferStatus.WORK_COMPLETED,
];

// Mismo estilo que HEAD_SX en collection-table.tsx / latest-transfers-table.tsx
// (tabla de consulta AOP): header secondary.main + letra blanca.
const HEAD_SX = {
  backgroundColor: "secondary.main",
  color: "#fff",
  fontWeight: "bold",
  whiteSpace: "nowrap" as const,
  textAlign: "center" as const,
};

type CaseTransferListItem = Awaited<
  ReturnType<typeof getAllCaseTransfersForTenant>
>[number];
type LegalProcessListItem = Awaited<
  ReturnType<typeof getAllLegalProcessesForTenant>
>[number];

// Fila unificada para la tabla: un CaseTransfer (todavía sin vonnis) o un
// LegalProcess (GOP real, ya con vonnis) normalizados a la misma forma.
type Row = {
  id: string;
  kind: "transfer" | "gop";
  href: string;
  reference: string;
  debtorName: string;
  lawyerName: string;
  bailiffName: string;
  amount: number;
  statusLabel: string;
  statusColor: ReturnType<typeof getCaseTransferStatusInfo>["color"];
  date: Date;
  // Solo relevante para kind: "transfer" — permite mostrar "Vonnis
  // registreren" directo en la tabla sin pasar por el detalle.
  bailiffId: string | null;
  status: string;
};

function debtorNameOf(item: {
  debtClaim: {
    debtor?: {
      person?: { first_name?: string | null; last_name?: string | null } | null;
    } | null;
  };
}) {
  const person = item.debtClaim.debtor?.person;
  return person
    ? `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim()
    : "-";
}

function toTransferRow(item: CaseTransferListItem): Row {
  const statusInfo = getCaseTransferStatusInfo(item.status);
  return {
    id: item.id,
    kind: "transfer",
    href: `/legal-processes/transfers/${item.id}`,
    reference: item.debtClaim.reference || "-",
    debtorName: debtorNameOf(item),
    lawyerName: item.lawyer
      ? `${item.lawyer.firstName} ${item.lawyer.lastName}`
      : "-",
    bailiffName: item.bailiff?.fullname ?? "-",
    amount: Number(item.debtClaim.principalAmount) || 0,
    statusLabel: statusInfo.label,
    statusColor: statusInfo.color,
    date: item.createdAt,
    bailiffId: item.bailiffId,
    status: item.status,
  };
}

function toLegalProcessRow(item: LegalProcessListItem): Row {
  const statusInfo = getLegalProcessStatusInfo(item.status);
  return {
    id: item.id,
    kind: "gop",
    href: `/legal-processes/${item.id}`,
    reference: item.referenceNumber || item.debtClaim.reference || "-",
    debtorName: debtorNameOf(item),
    lawyerName: item.caseTransfer?.lawyer
      ? `${item.caseTransfer.lawyer.firstName} ${item.caseTransfer.lawyer.lastName}`
      : "-",
    bailiffName: item.bailiff?.fullname ?? "-",
    amount: Number(item.debtClaim.principalAmount) || 0,
    statusLabel: statusInfo.label,
    statusColor: statusInfo.color,
    date: item.startedAt,
    bailiffId: null,
    status: item.status,
  };
}

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
  const [transferRows, setTransferRows] = useState<Row[]>([]);
  const [legalProcessRows, setLegalProcessRows] = useState<Row[]>([]);
  const [tab, setTab] = useState<"pending" | "all">(
    searchParams.get("tab") === "pending" ? "pending" : "all",
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        let transfers: CaseTransferListItem[] = [];
        let legalProcesses: LegalProcessListItem[] = [];

        if (isLawyer) {
          transfers = await getMyCaseTransfersAsLawyer();
        } else if (isBailiffRole) {
          [transfers, legalProcesses] = await Promise.all([
            getMyCaseTransfersAsBailiff(),
            getMyLegalProcessesAsBailiff(),
          ]);
        } else if (tenant?.id) {
          [transfers, legalProcesses] = await Promise.all([
            getAllCaseTransfersForTenant(tenant.id),
            getAllLegalProcessesForTenant(tenant.id),
          ]);
        }

        setTransferRows(transfers.map(toTransferRow));
        setLegalProcessRows(legalProcesses.map(toLegalProcessRow));
      } catch (error) {
        notifyError("Kon dossiers niet laden");
      } finally {
        setLoading(false);
      }
    };

    if (session) load();
  }, [tenant?.id, session, isLawyer, isBailiffRole]);

  const filteredRows = useMemo(() => {
    const pendingTransfers = transferRows.filter(
      (row) =>
        row.statusLabel ===
        getCaseTransferStatusInfo(CaseTransferStatus.PENDING_ACCEPTANCE).label,
    );

    if (!showPendingTabs) {
      return [...transferRows, ...legalProcessRows].sort(
        (a, b) => b.date.valueOf() - a.date.valueOf(),
      );
    }

    if (tab === "pending") return pendingTransfers;

    const nonPendingTransfers = transferRows.filter(
      (row) => !pendingTransfers.includes(row),
    );
    return [...nonPendingTransfers, ...legalProcessRows].sort(
      (a, b) => b.date.valueOf() - a.date.valueOf(),
    );
  }, [transferRows, legalProcessRows, showPendingTabs, tab]);

  if (loading) return <LoadingUI />;

  return (
    <Container
      maxWidth="lg"
      disableGutters
      sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
    >
      <AppBreadcrumbs items={[{ label: "Mijn dossiers" }]} />

      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Mijn dossiers
        </Typography>

        <TableContainer component={Paper}>
          <Table size="small" stickyHeader aria-label="legal processes table">
            <TableHead>
              <TableRow>
                <TableCell sx={HEAD_SX}>Referentie</TableCell>
                <TableCell sx={HEAD_SX}>Debiteur</TableCell>
                <TableCell sx={HEAD_SX}>Advocaat</TableCell>
                <TableCell sx={HEAD_SX}>Deurwaarder</TableCell>
                <TableCell sx={HEAD_SX}>Bedrag</TableCell>
                <TableCell sx={HEAD_SX}>Status</TableCell>
                <TableCell sx={HEAD_SX}>Gestart op</TableCell>
                {isBailiffRole && <TableCell sx={HEAD_SX}>Acties</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isBailiffRole ? 8 : 7}>
                    <Typography variant="body2" color="text.secondary" py={2}>
                      Nog geen dossiers.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {filteredRows.map((row) => (
                <TableRow
                  key={`${row.kind}-${row.id}`}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => router.push(row.href)}
                >
                  <TableCell align="center">{row.reference}</TableCell>
                  <TableCell align="center">{row.debtorName}</TableCell>
                  <TableCell align="center">{row.lawyerName}</TableCell>
                  <TableCell align="center">{row.bailiffName}</TableCell>
                  <TableCell align="right">
                    {formatCurrency(row.amount)}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      label={row.statusLabel}
                      color={row.statusColor}
                      sx={{ minWidth: 150 }}
                    />
                  </TableCell>
                  <TableCell align="center">{formatDate(row.date.toString())}</TableCell>
                  {isBailiffRole && (
                    <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                      {row.kind === "transfer" &&
                        !!row.bailiffId &&
                        VERDICT_ELIGIBLE_STATUSES.includes(
                          row.status as CaseTransferStatus,
                        ) && (
                          <Button
                            size="small"
                            variant="contained"
                            sx={{
                              textTransform: "none",
                              lineHeight: 1.2,
                              minWidth: "auto",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/verdicts/new?caseTransferId=${row.id}`,
                              );
                            }}
                          >
                            Vonnis registreren
                          </Button>
                        )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
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
