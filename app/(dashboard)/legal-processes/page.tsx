"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Box,
  Container,
  Typography,
  Chip,
  Stack,
  Tabs,
  Tab,
  Button,
  Card,
  TextField,
  MenuItem,
  Select,
  InputAdornment,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { notifyError } from "@/shared/ui/notifications";
import { useTenant } from "@/modules/auth/hooks/useTenant";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { UserRole } from "@/shared/constants/user-role";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";

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

// Estados que un abogado puede filtrar desde "Mijn dossiers" — PENDING_PAYMENT
// queda fuera: es un status legacy de antes de que de overdracht gratis werd
// (zie CaseTransferService.requestTransfer), geen nieuwe rij krijgt dat nog.
const LAWYER_FILTERABLE_STATUSES: CaseTransferStatus[] = [
  CaseTransferStatus.PENDING_ACCEPTANCE,
  CaseTransferStatus.ACCEPTED,
  CaseTransferStatus.WORK_COMPLETED,
  CaseTransferStatus.REJECTED,
  CaseTransferStatus.CANCELLED,
];

const LAWYER_PAGE_SIZE = 10;

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
  tenantName: string;
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
    tenantName: item.debtClaim.tenant?.name ?? "-",
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
    tenantName: item.debtClaim.tenant?.name ?? "-",
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

  // Filtros propios van het "Mijn dossiers"-scherm voor de advocaat (zie
  // mockup): zoeken, status en datumbereik, met paginering — vervangt daar
  // de pending/all tabs van bailiff/tenant-admin.
  const [lawyerSearch, setLawyerSearch] = useState("");
  const [lawyerStatus, setLawyerStatus] = useState<string>("ALL");
  const [lawyerDateFrom, setLawyerDateFrom] = useState("");
  const [lawyerDateTo, setLawyerDateTo] = useState("");
  const [lawyerPage, setLawyerPage] = useState(1);
  const debouncedLawyerSearch = useDebounce(lawyerSearch, 400);

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
        row.status === CaseTransferStatus.PENDING_ACCEPTANCE,
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

  // "Mijn dossiers" voor de advocaat toont altijd alle eigen overdrachten
  // (geen tabs) en past zoeken/status/datum lokaal toe.
  const lawyerFilteredRows = useMemo(() => {
    const query = debouncedLawyerSearch.trim().toLowerCase();
    const from = lawyerDateFrom ? new Date(lawyerDateFrom) : null;
    const to = lawyerDateTo ? new Date(lawyerDateTo) : null;

    return [...transferRows]
      .filter((row) => {
        if (lawyerStatus !== "ALL" && row.status !== lawyerStatus) return false;
        if (from && row.date < from) return false;
        if (to) {
          const inclusiveTo = new Date(to);
          inclusiveTo.setHours(23, 59, 59, 999);
          if (row.date > inclusiveTo) return false;
        }
        if (query) {
          const haystack = `${row.reference} ${row.debtorName} ${row.tenantName}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.valueOf() - a.date.valueOf());
  }, [transferRows, lawyerStatus, lawyerDateFrom, lawyerDateTo, debouncedLawyerSearch]);

  useEffect(() => {
    setLawyerPage(1);
  }, [lawyerStatus, lawyerDateFrom, lawyerDateTo, debouncedLawyerSearch]);

  const lawyerTotalPages = Math.max(
    1,
    Math.ceil(lawyerFilteredRows.length / LAWYER_PAGE_SIZE),
  );
  const lawyerPagedRows = lawyerFilteredRows.slice(
    (lawyerPage - 1) * LAWYER_PAGE_SIZE,
    lawyerPage * LAWYER_PAGE_SIZE,
  );
  const lawyerRangeStart =
    lawyerFilteredRows.length === 0 ? 0 : (lawyerPage - 1) * LAWYER_PAGE_SIZE + 1;
  const lawyerRangeEnd = Math.min(
    lawyerPage * LAWYER_PAGE_SIZE,
    lawyerFilteredRows.length,
  );

  const clearLawyerFilters = () => {
    setLawyerSearch("");
    setLawyerStatus("ALL");
    setLawyerDateFrom("");
    setLawyerDateTo("");
  };

  if (loading) return <LoadingUI />;

  if (isLawyer) {
    const columns: ListColumn<Row>[] = [
      { key: "reference", label: "Dossiernummer", render: (row) => row.reference },
      { key: "tenantName", label: "Deelnemer / Schuldeiser", render: (row) => row.tenantName },
      { key: "debtorName", label: "Debiteur / Gedaagde", render: (row) => row.debtorName },
      { key: "amount", label: "Bedrag (USD)", align: "right", render: (row) => formatCurrency(row.amount) },
      {
        key: "status",
        label: "Status",
        render: (row) => (
          <Chip size="small" label={row.statusLabel} color={row.statusColor} sx={{ minWidth: 150 }} />
        ),
      },
      {
        key: "date",
        label: "Geregistreerd op",
        render: (row) => formatDate(row.date.toString()),
        hideOnMobile: true,
      },
    ];

    return (
      <Container
        maxWidth="lg"
        disableGutters
        sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
      >
        <AppBreadcrumbs
          items={[
            { label: "Mijn dossiers", href: "/legal-processes" },
            { label: "Dossier overzicht" },
          ]}
        />

        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Mijn dossiers
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Overzicht van alle aan u overgedragen dossiers.
            </Typography>
          </Box>

          <Card sx={{ p: { xs: 1.5, sm: 3 } }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              mb={3}
              alignItems={{ md: "flex-end" }}
            >
              <Stack sx={{ flex: 2 }} spacing={0.5}>
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  Zoeken
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Dossiernummer, debiteur of bedrijfsnaam..."
                  value={lawyerSearch}
                  onChange={(e) => setLawyerSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Stack>

              <Stack sx={{ flex: 1 }} spacing={0.5}>
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  Status
                </Typography>
                <Select
                  fullWidth
                  size="small"
                  value={lawyerStatus}
                  onChange={(e) => setLawyerStatus(e.target.value)}
                >
                  <MenuItem value="ALL">Alle statussen</MenuItem>
                  {LAWYER_FILTERABLE_STATUSES.map((status) => (
                    <MenuItem key={status} value={status}>
                      {getCaseTransferStatusInfo(status).label}
                    </MenuItem>
                  ))}
                </Select>
              </Stack>

              <Stack sx={{ flex: 1 }} spacing={0.5}>
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  Datum
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    size="small"
                    type="date"
                    value={lawyerDateFrom}
                    onChange={(e) => setLawyerDateFrom(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <Typography color="text.secondary">-</Typography>
                  <TextField
                    size="small"
                    type="date"
                    value={lawyerDateTo}
                    onChange={(e) => setLawyerDateTo(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Stack>
              </Stack>

              <Button
                variant="outlined"
                startIcon={<FilterAltOutlinedIcon />}
                onClick={clearLawyerFilters}
                sx={{ textTransform: "none", height: 40 }}
              >
                Filters
              </Button>
            </Stack>

            <ResponsiveListTable
              columns={columns}
              rows={lawyerPagedRows}
              getRowKey={(row) => `${row.kind}-${row.id}`}
              getRowHref={(row) => row.href}
              emptyMessage="Nog geen dossiers."
            />

            <Box
              mt={3}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="body2" color="text.secondary">
                Toont {lawyerRangeStart} - {lawyerRangeEnd} van {lawyerFilteredRows.length} dossiers
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center">
                <IconButton
                  size="small"
                  disabled={lawyerPage <= 1}
                  onClick={() => setLawyerPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <Button
                  size="small"
                  variant="contained"
                  sx={{ minWidth: 36, textTransform: "none" }}
                >
                  {lawyerPage}
                </Button>
                <IconButton
                  size="small"
                  disabled={lawyerPage >= lawyerTotalPages}
                  onClick={() => setLawyerPage((p) => Math.min(lawyerTotalPages, p + 1))}
                >
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Box>
          </Card>
        </Stack>
      </Container>
    );
  }

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

        {showPendingTabs && (
          <Tabs value={tab} onChange={(_, value) => setTab(value)}>
            <Tab value="all" label="Alle dossiers" />
            <Tab value="pending" label="Wachten op acceptatie" />
          </Tabs>
        )}

        {(() => {
          const columns: ListColumn<Row>[] = [
            { key: "reference", label: "Referentie", render: (row) => row.reference },
            { key: "debtorName", label: "Debiteur", render: (row) => row.debtorName },
            { key: "lawyerName", label: "Advocaat", render: (row) => row.lawyerName, hideOnMobile: true },
            { key: "bailiffName", label: "Deurwaarder", render: (row) => row.bailiffName, hideOnMobile: true },
            { key: "amount", label: "Bedrag", align: "right", render: (row) => formatCurrency(row.amount) },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <Chip size="small" label={row.statusLabel} color={row.statusColor} sx={{ minWidth: 150 }} />
              ),
            },
            {
              key: "date",
              label: "Gestart op",
              render: (row) => formatDate(row.date.toString()),
              hideOnMobile: true,
            },
            ...(isBailiffRole
              ? [
                  {
                    key: "actions",
                    label: "Acties",
                    render: (row: Row) =>
                      row.kind === "transfer" &&
                      !!row.bailiffId &&
                      VERDICT_ELIGIBLE_STATUSES.includes(row.status as CaseTransferStatus) ? (
                        <Button
                          size="small"
                          variant="contained"
                          sx={{ textTransform: "none", lineHeight: 1.2, minWidth: "auto" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/verdicts/new?caseTransferId=${row.id}`);
                          }}
                        >
                          Vonnis registreren
                        </Button>
                      ) : null,
                  } satisfies ListColumn<Row>,
                ]
              : []),
          ];

          return (
            <ResponsiveListTable
              columns={columns}
              rows={filteredRows}
              getRowKey={(row) => `${row.kind}-${row.id}`}
              getRowHref={(row) => row.href}
              emptyMessage="Nog geen dossiers."
            />
          );
        })()}
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
