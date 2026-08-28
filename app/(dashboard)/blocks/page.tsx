"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  Chip,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  Button,
  Container,
} from "@mui/material";
import TablePagination from "@mui/material/TablePagination";

import SearchIcon from "@mui/icons-material/Search";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { useDebounce } from "@/shared/hooks/useDebounce";

import { REASONS } from "@/modules/blockade/constants/reason-blockades";
import { getBlockadeStatusInfo } from "@/modules/blockade/utils/blockade-status";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";

export default function BlocksPage() {
  const router = useRouter();

  const [blockades, setBlockades] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    search: "",
    status: "ALL",
    page: 0,
  });


  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  const debouncedSearch = useDebounce(filters.search, 1000);

  useEffect(() => {
    fetchBlockades({
      ...filters,
      search: debouncedSearch,
      page: page, // MUI empieza en 0
      limit: rowsPerPage,
    });
  }, [debouncedSearch, filters.status, filters.page]);

  const fetchBlockades = async (params: any) => {
    try {
      const query = new URLSearchParams({
        search: params.search,
        page: String(params.page), // MUI empieza en 0
        limit: String(params.limit),
      });

      const response = await fetch(`/api/blockades?${query.toString()}`);

      console.log("Response from API:", response);

      const data = await response.json();

      setBlockades(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error("Error fetching blockades:", error);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({
      ...prev,
      search: e.target.value,
      page: 0, // Reset to first page on new search
    }));
  };

  const getLabelForReason = (reason: string) => {
    return REASONS.find((r) => r.value === reason)?.label || reason;
  };

  return (
    <Container
      maxWidth="lg"
      disableGutters
      sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 2,
          mb: { xs: 2, sm: 4 },
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Blokkades
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Hier vindt u een overzicht van alle geregistreerde economische
            blokkades en hun status.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<DescriptionOutlinedIcon />}
          size="large"
          sx={{ textTransform: "none" }}
          onClick={() => router.push("/blocks/new")}
        >
          Nieuwe blokkade
        </Button>
      </Box>

      <Card sx={{ p: { xs: 1.5, sm: 3 } }}>
        <Stack
          direction={{
            xs: "column",
            md: "row",
          }}
          spacing={2}
          mb={3}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Zoeken op debiteur..."
            value={filters.search}
            onChange={handleSearchChange}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Stack>

        {(() => {
          const columns: ListColumn<(typeof blockades)[number]>[] = [
            { key: "reference", label: "Blokkadenr.", render: (b) => b.originDebtClaim?.reference || "-" },
            { key: "createdAt", label: "Registratiedatum", render: (b) => formatDate(b.createdAt) },
            {
              key: "debtor",
              label: "Schuldenaar",
              render: (b) => `${b.debtor?.person?.first_name ?? ""} ${b.debtor?.person?.last_name ?? ""}`.trim() || "-",
            },
            {
              key: "amount",
              label: "Bedrag",
              align: "right",
              render: (b) => formatCurrency(Number(b.originDebtClaim?.principalAmount) || 0),
            },
            { key: "reason", label: "Reden blokkade", render: (b) => getLabelForReason(b.reason), hideOnMobile: true },
            {
              key: "status",
              label: "Status",
              render: (b) => {
                const statusInfo = getBlockadeStatusInfo(b.status);
                return <Chip size="small" label={statusInfo.label} color={statusInfo.color} />;
              },
            },
          ];

          return (
            <ResponsiveListTable
              columns={columns}
              rows={blockades}
              getRowKey={(b) => b.id}
              getRowHref={(b) => `/blocks/${b.id}`}
              emptyMessage="Geen blokkades gevonden."
            />
          );
        })()}
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, newPage) => {
            setPage(newPage);

            fetchBlockades({
              search: debouncedSearch,
              page: newPage,
              limit: rowsPerPage,
            });
          }}
          onRowsPerPageChange={(event) => {
            const newSize = parseInt(event.target.value, 10);

            setRowsPerPage(newSize);
            setPage(0);

            fetchBlockades({
              search: debouncedSearch,
              page: 0,
              limit: newSize,
            });
          }}
        />
      </Card>
    </Container>
  );
}
