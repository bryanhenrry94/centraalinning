"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Chip,
  Container,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError, notifyInfo } from "@/shared/ui/notifications";
import { formatDate } from "@/shared/utils/formatters";
import {
  ListColumn,
  ResponsiveListTable,
} from "@/shared/ui/responsive-list-table";
import { getAdminPersons } from "@/modules/admin/actions/admin.actions";
import { useRouter } from "next/navigation";

type PersonRow = Awaited<ReturnType<typeof getAdminPersons>>[number];

const personName = (p: PersonRow) =>
  `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.business_name || "-";

const TYPE_OPTIONS = [
  { value: "ALL", label: "Alle types" },
  { value: "COMPANY", label: "Bedrijf" },
  { value: "INDIVIDUAL", label: "Natuurlijk persoon" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// Venster van maximaal 5 paginaknoppen rond de huidige pagina.
function getPageWindow(current: number, total: number, size = 5) {
  if (total <= size) return Array.from({ length: total }, (_, i) => i + 1);
  let start = Math.max(1, current - Math.floor(size / 2));
  const end = Math.min(total, start + size - 1);
  start = Math.max(1, end - size + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export default function AdminPersonsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PersonRow[]>([]);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [islandFilter, setIslandFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  useEffect(() => {
    getAdminPersons()
      .then(setRows)
      .catch(() => notifyError("Kon personenregister niet laden"))
      .finally(() => setLoading(false));
  }, []);

  const islandOptions = useMemo(() => {
    const names = new Set(
      rows
        .map((r) => r.jurisdiction?.name ?? r.country_code)
        .filter((v): v is string => !!v),
    );
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      const island = r.jurisdiction?.name ?? r.country_code ?? "";
      const matchesSearch =
        !term ||
        (r.personal_number ?? "").toLowerCase().includes(term) ||
        personName(r).toLowerCase().includes(term) ||
        (r.email ?? "").toLowerCase().includes(term) ||
        (r.phone ?? "").toLowerCase().includes(term);
      const matchesType = typeFilter === "ALL" || r.person_type === typeFilter;
      const matchesIsland = islandFilter === "ALL" || island === islandFilter;
      return matchesSearch && matchesType && matchesIsland;
    });
  }, [rows, search, typeFilter, islandFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, islandFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  if (loading) return <LoadingUI />;

  const columns: ListColumn<PersonRow>[] = [
    {
      key: "personal_number",
      label: "CFSB-ID",
      align: "left",
      valueAlign: "left",
      render: (r) => (
        <Typography variant="body2" fontWeight={700}>
          {r.personal_number ?? "-"}
        </Typography>
      ),
    },
    {
      key: "name",
      label: "Naam",
      align: "left",
      valueAlign: "left",
      render: (r) => personName(r),
    },
    {
      key: "type",
      label: "Type",
      render: (r) => (
        <Chip
          size="small"
          label={r.person_type === "COMPANY" ? "Bedrijf" : "Natuurlijk persoon"}
          sx={
            r.person_type === "COMPANY"
              ? { bgcolor: "#DBEAFE", color: "#1D4ED8", fontWeight: 700 }
              : { bgcolor: "#CCFBF1", color: "#0F766E", fontWeight: 700 }
          }
        />
      ),
    },
    {
      key: "island",
      label: "Eiland/Land",
      render: (r) => r.jurisdiction?.name ?? r.country_code ?? "-",
    },
    {
      key: "email",
      label: "E-mail",
      align: "left",
      render: (r) => r.email || "-",
    },
    {
      key: "phone",
      label: "Telefoon",
      align: "left",
      render: (r) => r.phone || "-",
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
            onClick={() => router.push(`/admin/persons/${r.id}`)}
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
          { label: "Identiteitenregister" },
        ]}
      />

      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Stack>
          <Typography variant="h4" fontWeight={700}>
            Identiteitenregister
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Overzicht van alle geregistreerde personen en bedrijven binnen CFSB.
          </Typography>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{ p: 2.5 }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Zoeken op CFSB-ID, naam, e-mail of telefoon..."
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
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            sx={{ minWidth: { xs: "100%", md: 180 } }}
          >
            {TYPE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            value={islandFilter}
            onChange={(e) => setIslandFilter(e.target.value)}
            sx={{ minWidth: { xs: "100%", md: 180 } }}
          >
            <MenuItem value="ALL">Alle eilanden</MenuItem>
            {islandOptions.map((island) => (
              <MenuItem key={island} value={island}>
                {island}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <ResponsiveListTable
          columns={columns}
          rows={pagedRows}
          getRowKey={(r) => r.id ?? r.personal_number ?? r.identification}
          getRowHref={(r) => `/admin/persons/${r.id}`}
          emptyMessage="Nog geen identiteiten geregistreerd."
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
            Totaal: {filteredRows.length} identiteiten
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconButton
                size="small"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => p - 1)}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              {getPageWindow(currentPage, totalPages).map((p) => (
                <Button
                  key={p}
                  size="small"
                  variant={p === currentPage ? "contained" : "outlined"}
                  color={p === currentPage ? "secondary" : "inherit"}
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
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Stack>
            <TextField
              select
              size="small"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              sx={{ minWidth: 130 }}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <MenuItem key={size} value={size}>
                  {size} per pagina
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
}
