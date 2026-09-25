"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chip,
  Container,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
import { getAdminDebtClaims } from "@/modules/admin/actions/admin.actions";
import { ChipColor } from "@/modules/collection/utils/debt-claim-status";

type ClaimRow = Awaited<ReturnType<typeof getAdminDebtClaims>>[number];

// Solo para este listado (CFSB Admin > Alle dossiers) — no reemplaza
// DEBT_CLAIM_STATUS_CONFIG (modules/collection/utils/debt-claim-status.ts),
// que otras pantallas siguen usando con sus propias etiquetas.
// IN_PROGRESS usa color="primary": el naranja de marca (brand[400] en
// shared/theme/colors.ts), no el "warning" del theme (que en realidad está
// en hue amarillo, no naranja).
const CASE_FILE_STATUS_CONFIG: Record<string, { label: string; color: ChipColor }> = {
  OPEN: { label: "Open", color: "success" },
  IN_PROGRESS: { label: "In behandeling", color: "primary" },
  SETTLED: { label: "Vereffend", color: "info" },
  CLOSED: { label: "Gesloten", color: "default" },
  CANCELLED: { label: "Geannuleerd", color: "error" },
};

const getStatusInfo = (status: string) =>
  CASE_FILE_STATUS_CONFIG[status] ?? { label: status, color: "default" as ChipColor };

export default function AdminCaseFilesPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    getAdminDebtClaims()
      .then(setRows)
      .catch(() => notifyError("Kon dossiers niet laden"))
      .finally(() => setLoading(false));
  }, []);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (!term) return true;
      return (
        (r.reference ?? "").toLowerCase().includes(term) ||
        r.tenantName.toLowerCase().includes(term) ||
        r.debtorName.toLowerCase().includes(term)
      );
    });
  }, [rows, search, statusFilter]);

  if (loading) return <LoadingUI />;

  const columns: ListColumn<ClaimRow>[] = [
    { key: "reference", label: "Referentie", render: (r) => r.reference || "-" },
    { key: "tenantName", label: "Deelnemer", render: (r) => r.tenantName },
    { key: "debtorName", label: "Debiteur", render: (r) => r.debtorName },
    { key: "principalAmount", label: "Bedrag", align: "right", render: (r) => formatCurrency(r.principalAmount) },
    {
      key: "status",
      label: "Status",
      render: (r) => {
        const { label, color } = getStatusInfo(r.status);
        return <Chip size="small" label={label} color={color} sx={{ minWidth: 116, justifyContent: "center" }} />;
      },
    },
    { key: "createdAt", label: "Gestart op", render: (r) => formatDate(r.createdAt.toString()), hideOnMobile: true },
  ];

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "CFSB Admin", href: "/admin" }, { label: "Alle dossiers" }]} />
      <Stack spacing={3}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          spacing={2}
        >
          <Typography variant="h4" fontWeight={700}>
            Alle dossiers
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ width: { xs: "100%", sm: "auto" } }}>
            <TextField
              size="small"
              placeholder="Zoeken..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: { sm: 240 } }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              select
              size="small"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: { sm: 180 } }}
            >
              <MenuItem value="ALL">Alle statussen</MenuItem>
              {Object.entries(CASE_FILE_STATUS_CONFIG).map(([value, { label }]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Stack>
        <ResponsiveListTable
          columns={columns}
          rows={filteredRows}
          getRowKey={(r) => r.id}
          getRowHref={(r) => `/admin/case-files/${r.id}`}
          emptyMessage="Geen dossiers gevonden."
        />
      </Stack>
    </Container>
  );
}
