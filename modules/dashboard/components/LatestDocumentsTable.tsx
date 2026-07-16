"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  Box,
  Card,
  CardActionArea,
  Chip,
  IconButton,
  Pagination,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { useRouter } from "next/navigation";

type DocumentRow = {
  id: string;
  source: string;
  date: Date;
  reference_number: string;
  name: string;
  amount: number;
  status: string;
  statusColor:
    | "default"
    | "primary"
    | "secondary"
    | "error"
    | "info"
    | "success"
    | "warning";
  href: string;
};

interface LatestDocumentsTableProps {
  rows: DocumentRow[];
  title?: string;
  paginated?: boolean;
}

const MOBILE_PAGE_SIZE = 10;

export const LatestDocumentsTable = ({
  rows,
  paginated = false,
}: LatestDocumentsTableProps) => {
  const theme = useTheme();
  const router = useRouter();
  const [mobilePage, setMobilePage] = useState(1);

  const columns: GridColDef<(typeof rows)[number]>[] = [
    {
      field: "date",
      headerName: "Datum",
      width: 100,
      flex: 1,
      renderCell: (params) => {
        return formatDate(params.value);
      },
    },
    {
      field: "reference_number",
      headerName: "Referentie",
      width: 120,
      flex: 1,
    },
    {
      field: "name",
      headerName: "Naam",
      width: 200,
      flex: 1,
    },
    {
      field: "amount",
      headerName: "Totaal",
      width: 110,
      flex: 1,
      align: "right" as const,
      headerAlign: "right" as const,
      renderCell: (params) => {
        return formatCurrency(params.value);
      },
    },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      flex: 1,
      align: "center" as const,
      headerAlign: "center" as const,
      renderCell: (params) => {
        return (
          <Chip
            label={params.value}
            color={params.row.statusColor}
            variant="filled"
            size="small"
            sx={{
              fontWeight: 600,
              width: "100%",
            }}
          />
        );
      },
    },
    {
      field: "actions",
      headerName: "Actie",
      width: 80,
      flex: 0.5,
      align: "center" as const,
      headerAlign: "center" as const,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <IconButton
          size="small"
          aria-label="Bekijken"
          onClick={() => router.push(params.row.href)}
        >
          <VisibilityIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  const pageCount = Math.max(1, Math.ceil(rows.length / MOBILE_PAGE_SIZE));
  const pageRows = paginated
    ? rows.slice(
        (mobilePage - 1) * MOBILE_PAGE_SIZE,
        mobilePage * MOBILE_PAGE_SIZE,
      )
    : rows;

  return (
    <>
      {/* Mobiel: kaartenlijst. De DataGrid past niet op smalle schermen
          zonder horizontaal scrollen, dus we tonen beide varianten en
          wisselen puur via CSS (geen useMediaQuery) om SSR-hydratatie-
          mismatches te vermijden. */}
      <Stack spacing={1.5} sx={{ display: { xs: "flex", sm: "none" } }}>
        {pageRows.length === 0 && (
          <Paper
            elevation={0}
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              p: 3,
              textAlign: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Geen documenten gevonden.
            </Typography>
          </Paper>
        )}

        {pageRows.map((row) => (
          <Card
            key={row.id}
            elevation={0}
            sx={{ border: `1px solid ${theme.palette.divider}` }}
          >
            <CardActionArea onClick={() => router.push(row.href)}>
              <Box sx={{ p: 2 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  spacing={1}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      component="div"
                    >
                      {row.source.split(" - ")[0]}
                    </Typography>
                    <Typography variant="subtitle2" fontWeight={700} noWrap>
                      {row.name}
                    </Typography>
                  </Box>
                  <Chip
                    label={row.status}
                    color={row.statusColor}
                    size="small"
                    sx={{ fontWeight: 600, flexShrink: 0 }}
                  />
                </Stack>

                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  mt={1.5}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" noWrap component="div">
                      {row.reference_number || "-"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(row.date.toISOString())}
                    </Typography>
                  </Box>

                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {formatCurrency(row.amount)}
                    </Typography>
                    <ChevronRightRoundedIcon
                      fontSize="small"
                      sx={{ color: theme.palette.text.disabled }}
                    />
                  </Stack>
                </Stack>
              </Box>
            </CardActionArea>
          </Card>
        ))}

        {paginated && pageCount > 1 && (
          <Pagination
            count={pageCount}
            page={mobilePage}
            onChange={(_, page) => setMobilePage(page)}
            size="small"
            siblingCount={0}
            sx={{ alignSelf: "center", mt: 1 }}
          />
        )}
      </Stack>

      <Paper
        elevation={0}
        sx={{
          display: { xs: "none", sm: "flex" },
          border: `1px solid ${theme.palette.divider}`,
          height: "100%",
          padding: 2,
          flexDirection: "column",
          justifyContent: "space-between",
          bgcolor: "white",
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          hideFooter={!paginated}
          autoHeight={paginated}
          pageSizeOptions={paginated ? [10, 25, 50, 100] : undefined}
          initialState={
            paginated
              ? { pagination: { paginationModel: { pageSize: 25 } } }
              : undefined
          }
          disableColumnMenu
          disableRowSelectionOnClick
          sx={{
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: theme.palette.grey[100],
              borderBottom: `1px solid ${theme.palette.divider}`,
            },
            "& .MuiDataGrid-cell": {
              borderBottom: `1px solid ${theme.palette.divider}`,
            },
            bgcolor: "white",
          }}
        />
      </Paper>
    </>
  );
};
