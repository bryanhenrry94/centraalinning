"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  IconButton,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Button,
  Container,
} from "@mui/material";
import TablePagination from "@mui/material/TablePagination";

import SearchIcon from "@mui/icons-material/Search";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { useDebounce } from "@/hooks/useDebounce";

import VisibilityIcon from "@mui/icons-material/Visibility";
import { REASONS } from "@/constants/reason-blockades";

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

  const handleClicShowDetails = (contractId: string) => {
    router.push(`/blocks/${contractId}`);
  };

  const getLabelForReason = (reason: string) => {
    return REASONS.find((r) => r.value === reason)?.label || reason;
  };

  return (
    <Container maxWidth="lg">
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
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

      <Card sx={{ p: 3 }}>
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
            placeholder="Zoeken op schuldenaar ..."
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

        <TableContainer>
          <Table size="small" stickyHeader aria-label="sticky table">
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    minWidth: 120,
                    backgroundColor: "secondary.main",
                    color: "#fff",
                    fontWeight: "bold",
                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Blokkadenr.
                </TableCell>
                <TableCell
                  sx={{
                    minWidth: 120,
                    backgroundColor: "secondary.main",
                    color: "#fff",
                    fontWeight: "bold",
                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Registratiedatum
                </TableCell>
                <TableCell
                  sx={{
                    minWidth: 250,
                    backgroundColor: "secondary.main",
                    color: "#fff",
                    fontWeight: "bold",
                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Schuldenaar
                </TableCell>

                <TableCell
                  sx={{
                    minWidth: 150,
                    backgroundColor: "secondary.main",
                    color: "#fff",
                    fontWeight: "bold",
                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Bedrag
                </TableCell>

                <TableCell
                  sx={{
                    minWidth: 50,
                    backgroundColor: "secondary.main",
                    color: "#fff",
                    fontWeight: "bold",
                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Reden Blokkade
                </TableCell>

                <TableCell
                  sx={{
                    minWidth: 50,
                    backgroundColor: "secondary.main",
                    color: "#fff",
                    fontWeight: "bold",
                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Status
                </TableCell>

                <TableCell
                  sx={{
                    minWidth: 50,
                    backgroundColor: "secondary.main",
                    color: "#fff",
                    fontWeight: "bold",
                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Acties
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {blockades.map((blockade) => (
                <TableRow key={blockade.id}>
                  <TableCell sx={{ textAlign: "center" }}>
                    {blockade.reference_number}
                  </TableCell>
                  <TableCell>{formatDate(blockade.createdAt)}</TableCell>

                  <TableCell>
                    {blockade?.debtor?.person?.first_name}{" "}
                    {blockade?.debtor?.person?.last_name}
                  </TableCell>

                  <TableCell sx={{ textAlign: "center" }}>
                    <Typography variant="body2">
                      {formatCurrency(blockade.amount)}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ textAlign: "center" }}>
                    {getLabelForReason(blockade.reason)}
                  </TableCell>

                  <TableCell sx={{ textAlign: "center" }}>
                    {blockade.status === "ACTIVE" ? "Actief" : "Inactief"}
                  </TableCell>

                  <TableCell align="center">
                    <IconButton
                      aria-haspopup="true"
                      onClick={() => handleClicShowDetails(blockade.id)}
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
        </TableContainer>
      </Card>
    </Container>
  );
}
