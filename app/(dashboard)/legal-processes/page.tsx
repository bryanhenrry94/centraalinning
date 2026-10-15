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
  Button,
  Card,
  TextField,
  MenuItem,
  Menu,
  ListItemIcon,
  ListItemText,
  Select,
  InputAdornment,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DescriptionIcon from "@mui/icons-material/Description";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";

import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { notifyError } from "@/shared/ui/notifications";
import { useTenant } from "@/modules/auth/hooks/useTenant";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { UserRole } from "@/shared/constants/user-role";
import {
  ListColumn,
  ResponsiveListTable,
} from "@/shared/ui/responsive-list-table";
import { RegisterBailiffOutcomeDialog } from "@/modules/legal-process/components/register-bailiff-outcome-dialog";

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
const LIST_PAGE_SIZE = 10;

const PERIOD_OPTIONS = [
  { value: "ALL", label: "Alle" },
  { value: "7D", label: "Laatste 7 dagen" },
  { value: "30D", label: "Laatste 30 dagen" },
  { value: "90D", label: "Laatste 90 dagen" },
  { value: "YEAR", label: "Dit jaar" },
] as const;
type PeriodFilter = (typeof PERIOD_OPTIONS)[number]["value"];

function isWithinPeriod(date: Date, period: PeriodFilter): boolean {
  if (period === "ALL") return true;
  const now = new Date();
  if (period === "YEAR") return date.getFullYear() === now.getFullYear();
  const days = period === "7D" ? 7 : period === "30D" ? 30 : 90;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  return date >= cutoff;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

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
  // registreren"/"Dossier afronden" directo en la tabla sin pasar por el
  // detalle. "Dossier afronden" (RegisterBailiffOutcomeDialog) solo aplica a
  // la ruta directa deurwaarder (sin advocaat) — ver lawyerId.
  bailiffId: string | null;
  lawyerId: string | null;
  status: string;
  updatedAt: Date;
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
    // El número GOP (secuencia única, ver CaseTransferService.generateGopNumber)
    // ya existe desde que el dossier queda destinado a un deurwaarder, antes
    // incluso de que exista el LegalProcess — preferirlo sobre la referencia
    // interna del DebtClaim para que el mismo dossier muestre siempre el
    // mismo número en toda su evolución.
    reference: item.gopNumber || item.debtClaim.reference || "-",
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
    lawyerId: item.lawyerId,
    status: item.status,
    updatedAt: item.updatedAt,
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
    lawyerId: null,
    status: item.status,
    // LegalProcess no tiene updatedAt propio — closedAt es la señal de
    // cambio más reciente disponible; si sigue abierto, cae a startedAt.
    updatedAt: item.closedAt ?? item.startedAt,
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

  const [loading, setLoading] = useState(true);
  const [transferRows, setTransferRows] = useState<Row[]>([]);
  const [legalProcessRows, setLegalProcessRows] = useState<Row[]>([]);

  // Filtros propios van het "Mijn dossiers"-scherm voor de advocaat (zie
  // mockup): zoeken, status en datumbereik, met paginering — vervangt daar
  // de pending/all tabs van bailiff/tenant-admin.
  const [lawyerSearch, setLawyerSearch] = useState("");
  const [lawyerStatus, setLawyerStatus] = useState<string>("ALL");
  const [lawyerDateFrom, setLawyerDateFrom] = useState("");
  const [lawyerDateTo, setLawyerDateTo] = useState("");
  const [lawyerPage, setLawyerPage] = useState(1);
  const debouncedLawyerSearch = useDebounce(lawyerSearch, 400);

  // Menú de acciones (3 puntos) de la columna "Acties" del deurwaarder —
  // mismo patrón que financial-agreements/page.tsx.
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);
  const menuOpen = Boolean(anchorEl);
  const [outcomeDialogOpen, setOutcomeDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Zoeken/status/periode + paginering voor het deurwaarder/tenant-admin
  // "Mijn dossiers"-scherm (mockup sponsor) — los filtros propios de het
  // advocaat-scherm (lawyerSearch/...) quedan separados arriba.
  const [listSearch, setListSearch] = useState("");
  // "?tab=pending" venía de los links existentes en los dashboards legacy
  // de abogado/alguacil ("Wachten op acceptatie") — ya no hay pestañas, pero
  // esos links siguen funcionando como un filtro de Status preseleccionado.
  const [listStatus, setListStatus] = useState(
    searchParams.get("tab") === "pending" ? CaseTransferStatus.PENDING_ACCEPTANCE : "ALL",
  );
  const [listPeriod, setListPeriod] = useState<PeriodFilter>("ALL");
  const [listPage, setListPage] = useState(1);
  const debouncedListSearch = useDebounce(listSearch, 400);

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

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
  }, [tenant?.id, session, isLawyer, isBailiffRole, refreshKey]);

  // "Todos los archivos" muestra siempre los 9 (incluidos los pendientes de
  // acceptatie) — ya no hay pestañas que excluyan filas; si el usuario
  // quiere ver solo los pendientes, filtra por Status (listStatus más abajo).
  const filteredRows = useMemo(() => {
    return [...transferRows, ...legalProcessRows].sort(
      (a, b) => b.date.valueOf() - a.date.valueOf(),
    );
  }, [transferRows, legalProcessRows]);

  const listStatusOptions = useMemo(() => {
    const seen = new Map<string, string>();
    filteredRows.forEach((row) => {
      if (!seen.has(row.status)) seen.set(row.status, row.statusLabel);
    });
    return Array.from(seen.entries());
  }, [filteredRows]);

  const listFilteredRows = useMemo(() => {
    const query = debouncedListSearch.trim().toLowerCase();
    return filteredRows.filter((row) => {
      if (listStatus !== "ALL" && row.status !== listStatus) return false;
      if (!isWithinPeriod(row.date, listPeriod)) return false;
      if (query) {
        const haystack =
          `${row.reference} ${row.debtorName} ${row.tenantName}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [filteredRows, listStatus, listPeriod, debouncedListSearch]);

  useEffect(() => {
    setListPage(1);
  }, [listStatus, listPeriod, debouncedListSearch]);

  const listTotalPages = Math.max(
    1,
    Math.ceil(listFilteredRows.length / LIST_PAGE_SIZE),
  );
  const listPagedRows = listFilteredRows.slice(
    (listPage - 1) * LIST_PAGE_SIZE,
    listPage * LIST_PAGE_SIZE,
  );
  const listRangeStart =
    listFilteredRows.length === 0 ? 0 : (listPage - 1) * LIST_PAGE_SIZE + 1;
  const listRangeEnd = Math.min(
    listPage * LIST_PAGE_SIZE,
    listFilteredRows.length,
  );

  const handleExportList = () => {
    const header = [
      "Dossiernummer",
      "Deelnemer / Schuldeiser",
      "Debiteur / Gedaagde",
      "Bedrag (USD)",
      "Status",
      "Overgedragen op",
      "Laatst bijgewerkt",
    ];
    const rows = listFilteredRows.map((row) => [
      row.reference,
      row.tenantName,
      row.debtorName,
      formatCurrency(row.amount),
      row.statusLabel,
      formatDate(row.date.toString()),
      formatDate(row.updatedAt.toString()),
    ]);
    downloadCsv(`dossiers-${new Date().toISOString().slice(0, 10)}.csv`, [
      header,
      ...rows,
    ]);
  };

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
          const haystack =
            `${row.reference} ${row.debtorName} ${row.tenantName}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.valueOf() - a.date.valueOf());
  }, [
    transferRows,
    lawyerStatus,
    lawyerDateFrom,
    lawyerDateTo,
    debouncedLawyerSearch,
  ]);

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
    lawyerFilteredRows.length === 0
      ? 0
      : (lawyerPage - 1) * LAWYER_PAGE_SIZE + 1;
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
      {
        key: "reference",
        label: "Dossiernummer",
        render: (row) => row.reference,
      },
      {
        key: "tenantName",
        label: "Deelnemer / Schuldeiser",
        render: (row) => row.tenantName,
      },
      {
        key: "debtorName",
        label: "Debiteur / Gedaagde",
        render: (row) => row.debtorName,
      },
      {
        key: "amount",
        label: "Bedrag (USD)",
        align: "right",
        render: (row) => formatCurrency(row.amount),
      },
      {
        key: "status",
        label: "Status",
        render: (row) => (
          <Chip
            size="small"
            label={row.statusLabel}
            color={row.statusColor}
            sx={{ minWidth: 150 }}
          />
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
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color="text.secondary"
                >
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
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color="text.secondary"
                >
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
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color="text.secondary"
                >
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
                Toont {lawyerRangeStart} - {lawyerRangeEnd} van{" "}
                {lawyerFilteredRows.length} dossiers
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
                  onClick={() =>
                    setLawyerPage((p) => Math.min(lawyerTotalPages, p + 1))
                  }
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
      maxWidth="xl"
      disableGutters
      sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
    >
      <AppBreadcrumbs items={[{ label: "Mijn dossiers" }]} />

      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Mijn dossiers
        </Typography>

        <Card sx={{ p: { xs: 1.5, sm: 3 } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            mb={3}
            alignItems={{ md: "flex-end" }}
          >
            <Stack sx={{ flex: 2 }} spacing={0.5}>
              <Typography
                variant="caption"
                fontWeight={600}
                color="text.secondary"
              >
                Zoeken
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Zoek op dossiernummer, debiteur of deelnemer..."
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>

            <Stack sx={{ flex: 1, minWidth: 160 }} spacing={0.5}>
              <Typography
                variant="caption"
                fontWeight={600}
                color="text.secondary"
              >
                Status
              </Typography>
              <Select
                fullWidth
                size="small"
                value={listStatus}
                onChange={(e) => setListStatus(e.target.value)}
              >
                <MenuItem value="ALL">Alle</MenuItem>
                {listStatusOptions.map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </Stack>

            <Stack sx={{ flex: 1, minWidth: 160 }} spacing={0.5}>
              <Typography
                variant="caption"
                fontWeight={600}
                color="text.secondary"
              >
                Periode
              </Typography>
              <Select
                fullWidth
                size="small"
                value={listPeriod}
                onChange={(e) => setListPeriod(e.target.value as PeriodFilter)}
              >
                {PERIOD_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </Stack>

            <Button
              variant="outlined"
              startIcon={<FileDownloadOutlinedIcon />}
              onClick={handleExportList}
              sx={{ textTransform: "none", height: 40, whiteSpace: "nowrap" }}
            >
              Exporteren
            </Button>
          </Stack>

          {(() => {
            const columns: ListColumn<Row>[] = [
              {
                key: "reference",
                label: "Dossiernummer",
                render: (row) => row.reference,
              },
              {
                key: "tenantName",
                label: "Deelnemer / Schuldeiser",
                align: "left",
                render: (row) => row.tenantName,
              },
              {
                key: "debtorName",
                label: "Debiteur / Gedaagde",
                render: (row) => row.debtorName,
              },
              ...(!isBailiffRole
                ? [
                    {
                      key: "lawyerName",
                      label: "Advocaat",
                      render: (row: Row) => row.lawyerName,
                      hideOnMobile: true,
                    } satisfies ListColumn<Row>,
                    {
                      key: "bailiffName",
                      label: "Deurwaarder",
                      render: (row: Row) => row.bailiffName,
                      hideOnMobile: true,
                    } satisfies ListColumn<Row>,
                  ]
                : []),
              {
                key: "amount",
                label: "Bedrag (USD)",
                align: "right",
                render: (row) => formatCurrency(row.amount),
              },
              {
                key: "status",
                label: "Status",
                render: (row) => (
                  <Chip
                    size="small"
                    label={row.statusLabel}
                    color={row.statusColor}
                    sx={{ minWidth: 150 }}
                  />
                ),
              },
              {
                key: "date",
                label: "Overgedragen op",
                render: (row) => formatDate(row.date.toString()),
                hideOnMobile: true,
              },
              {
                key: "updatedAt",
                label: "Laatst bijgewerkt",
                render: (row) => formatDate(row.updatedAt.toString()),
                hideOnMobile: true,
              },
              ...(isBailiffRole
                ? [
                    {
                      key: "actions",
                      label: "Acties",
                      render: (row: Row) => {
                        // "Details bekijken" siempre está disponible — el
                        // menú ya no se oculta solo porque Vonnis
                        // registreren/Dossier afronden no apliquen a esta fila.
                        return (
                          <IconButton
                            aria-label="Acties"
                            aria-haspopup="true"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAnchorEl(e.currentTarget);
                              setSelectedRow(row);
                            }}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        );
                      },
                    } satisfies ListColumn<Row>,
                  ]
                : []),
            ];

            return (
              <ResponsiveListTable
                columns={columns}
                rows={listPagedRows}
                getRowKey={(row) => `${row.kind}-${row.id}`}
                getRowHref={(row) => row.href}
                emptyMessage="Nog geen dossiers."
              />
            );
          })()}

          <Box
            mt={3}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="body2" color="text.secondary">
              Toont {listRangeStart} - {listRangeEnd} van{" "}
              {listFilteredRows.length} dossiers
            </Typography>

            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton
                size="small"
                disabled={listPage <= 1}
                onClick={() => setListPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <Button
                size="small"
                variant="contained"
                sx={{ minWidth: 36, textTransform: "none" }}
              >
                {listPage}
              </Button>
              <IconButton
                size="small"
                disabled={listPage >= listTotalPages}
                onClick={() =>
                  setListPage((p) => Math.min(listTotalPages, p + 1))
                }
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Box>
        </Card>
      </Stack>

      <Menu anchorEl={anchorEl} open={menuOpen} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            if (!selectedRow) return;
            handleMenuClose();
            router.push(selectedRow.href);
          }}
          disabled={!selectedRow}
        >
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Details bekijken</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (!selectedRow) return;
            handleMenuClose();
            router.push(`/verdicts/new?caseTransferId=${selectedRow.id}`);
          }}
          disabled={
            !selectedRow ||
            !selectedRow.bailiffId ||
            !VERDICT_ELIGIBLE_STATUSES.includes(
              selectedRow.status as CaseTransferStatus,
            )
          }
        >
          <ListItemIcon>
            <DescriptionIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Vonnis registreren</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            // No limpiar selectedRow acá: RegisterBailiffOutcomeDialog lo
            // necesita mientras está abierto (ver onFinalized/onClose abajo,
            // que sí lo limpian al cerrar el diálogo).
            setAnchorEl(null);
            setOutcomeDialogOpen(true);
          }}
          disabled={
            !selectedRow ||
            !selectedRow.bailiffId ||
            !!selectedRow.lawyerId ||
            selectedRow.status !== CaseTransferStatus.ACCEPTED
          }
        >
          <ListItemIcon>
            <TaskAltIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Dossier afronden</ListItemText>
        </MenuItem>
      </Menu>

      {selectedRow && (
        <RegisterBailiffOutcomeDialog
          open={outcomeDialogOpen}
          onClose={() => {
            setOutcomeDialogOpen(false);
            setSelectedRow(null);
          }}
          caseTransferId={selectedRow.id}
          onFinalized={() => {
            setOutcomeDialogOpen(false);
            setSelectedRow(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </Container>
  );
};

const LegalProcessesListPage: React.FC = () => (
  <Suspense fallback={<LoadingUI />}>
    <LegalProcessesListPageContent />
  </Suspense>
);

export default LegalProcessesListPage;
