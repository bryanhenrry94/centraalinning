"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chip,
  Container,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { formatDate } from "@/shared/utils/formatters";
import {
  ListColumn,
  ResponsiveListTable,
} from "@/shared/ui/responsive-list-table";
import { getAdminTenants } from "@/modules/admin/actions/admin.actions";
import { TenantDetailsDrawer } from "@/modules/tenant/components/TenantDetailsDrawer";

type TenantRow = Awaited<ReturnType<typeof getAdminTenants>>[number];

const PAGE_SIZE = 10;
const STATUS_OPTIONS = [
  { value: "ALL", label: "Alle" },
  { value: "ACTIVE", label: "Actief" },
  { value: "INACTIVE", label: "Inactief" },
];

// Venster van maximaal 5 paginaknoppen rond de huidige pagina — bij een
// deelnemerslijst van dit formaat is een volledige pager (eerste/laatste,
// ellipsis) overbodige complexiteit.
function getPageWindow(current: number, total: number, size = 5) {
  if (total <= size) return Array.from({ length: total }, (_, i) => i + 1);
  let start = Math.max(1, current - Math.floor(size / 2));
  const end = Math.min(total, start + size - 1);
  start = Math.max(1, end - size + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export default function AdminTenantsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [islandFilter, setIslandFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  useEffect(() => {
    getAdminTenants()
      .then(setRows)
      .catch(() => notifyError("Kon deelnemers niet laden"))
      .finally(() => setLoading(false));
  }, []);

  const islandOptions = useMemo(() => {
    const names = new Set(rows.map((r) => r.jurisdiction?.name ?? r.country_code));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      const island = r.jurisdiction?.name ?? r.country_code;
      const matchesSearch =
        !term ||
        r.name.toLowerCase().includes(term) ||
        r.code.toLowerCase().includes(term) ||
        (r.contact_email ?? "").toLowerCase().includes(term);
      const matchesIsland = islandFilter === "ALL" || island === islandFilter;
      const matchesStatus =
        statusFilter === "ALL" || (statusFilter === "ACTIVE" ? r.is_active : !r.is_active);
      return matchesSearch && matchesIsland && matchesStatus;
    });
  }, [rows, search, islandFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, islandFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = filteredRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredRows.length);

  if (loading) return <LoadingUI />;

  const columns: ListColumn<TenantRow>[] = [
    { key: "name", label: "Naam", align: "left", valueAlign: "left", render: (r) => r.name },
    { key: "code", label: "CFSB-nummer", render: (r) => r.code },
    {
      key: "country_code",
      label: "Eiland/Land",
      render: (r) => r.jurisdiction?.name ?? r.country_code,
    },
    {
      key: "is_active",
      label: "Status",
      render: (r) => (
        <Chip
          size="small"
          label={r.is_active ? "Actief" : "Inactief"}
          color={r.is_active ? "success" : "default"}
          sx={{ minWidth: 90, justifyContent: "center", fontWeight: 700 }}
        />
      ),
    },
    {
      key: "created_at",
      label: "Geregistreerd op",
      render: (r) => formatDate(r.created_at.toString()),
      width: 140,
    },
    {
      key: "actions",
      label: "",
      align: "right",
      width: 56,
      render: (r) => (
        <Stack
          direction="row"
          spacing={0.5}
          justifyContent="flex-end"
          onClick={(e) => e.stopPropagation()}
        >
          <IconButton
            size="small"
            aria-label="Bekijken"
            onClick={() => setSelectedId(r.id)}
          >
            <VisibilityRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
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
          { label: "CFSB Admin", href: "/admin" },
          { label: "Deelnemers" },
        ]}
      />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Deelnemers
        </Typography>

        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            sx={{ p: 2.5 }}
          >
            <TextField
              fullWidth
              size="small"
              placeholder="Zoeken op naam, CFSB-nummer of e-mail"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              select
              size="small"
              label="Eiland/Land"
              value={islandFilter}
              onChange={(e) => setIslandFilter(e.target.value)}
              sx={{ minWidth: { xs: "100%", md: 200 } }}
            >
              <MenuItem value="ALL">Alle</MenuItem>
              {islandOptions.map((island) => (
                <MenuItem key={island} value={island}>
                  {island}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: { xs: "100%", md: 180 } }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <ResponsiveListTable
            columns={columns}
            rows={pagedRows}
            getRowKey={(r) => r.id}
            onRowClick={(r) => setSelectedId(r.id)}
            selectedRowKey={selectedId ?? undefined}
            emptyMessage="Nog geen deelnemers geregistreerd."
            containerSx={{ border: "none", borderRadius: 0 }}
          />

          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems="center"
            spacing={1.5}
            sx={{ p: 2.5, borderTop: "1px solid", borderColor: "divider" }}
          >
            <Typography variant="body2" color="text.secondary">
              Toont {rangeStart} t/m {rangeEnd} van {filteredRows.length} resultaten
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconButton
                size="small"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => p - 1)}
                sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              {getPageWindow(currentPage, totalPages).map((p) => (
                <Button
                  key={p}
                  size="small"
                  variant={p === currentPage ? "contained" : "outlined"}
                  onClick={() => setPage(p)}
                  sx={{ minWidth: 36, px: 0, borderRadius: 1 }}
                >
                  {p}
                </Button>
              ))}
              <IconButton
                size="small"
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => p + 1)}
                sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
        </Paper>
      </Stack>

      <TenantDetailsDrawer
        open={!!selectedId}
        tenantId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </Container>
  );
}
