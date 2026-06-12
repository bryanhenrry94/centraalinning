"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
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
  Menu,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { useDebounce } from "@/hooks/useDebounce";
import { StatusContractChip } from "./StatusContractChip";

export default function ContractsPage() {
  const router = useRouter();

  const [contracts, setContracts] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    search: "",
    status: "ALL",
    page: 1,
  });

  const id = React.useId();
  const buttonId = `${id}-button`;
  const menuId = `${id}-menu`;
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const debouncedSearch = useDebounce(filters.search, 1000);

  useEffect(() => {
    fetchContracts({
      ...filters,
      search: debouncedSearch,
    });
  }, [debouncedSearch, filters.status, filters.page]);

  const fetchContracts = async (params: any) => {
    try {
      const query = new URLSearchParams({
        status: params.status,
        search: params.search,
        page: String(params.page),
      });

      const response = await fetch(`/api/contracts?${query.toString()}`);
      const data = await response.json();
      setContracts(data);
    } catch (error) {
      console.error("Error fetching contracts:", error);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({
      ...prev,
      search: e.target.value,
      page: 1, // Reset to first page on new search
    }));
  };

  const handleClicShowDetails = (contractId: string) => {
    router.push(`/contracts/${contractId}`);
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
            Financiële afspraak registreren
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Vul de gegevens van de betrokken partijen in en registreer uw
            financiële afspraak.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<DescriptionOutlinedIcon />}
          size="large"
          sx={{ textTransform: "none" }}
          onClick={() => router.push("/contracts/new")}
        >
          Nieuwe overeenkomst
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
            placeholder="Zoeken op partij of nummer..."
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
          <Select
            size="small"
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                status: e.target.value,
                page: 1,
              }))
            }
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="ALL">Status: Alle</MenuItem>

            <MenuItem value="DRAFT">Concept</MenuItem>

            <MenuItem value="PENDING_PAYMENT">
              In afwachting van betaling
            </MenuItem>

            <MenuItem value="REGISTERED">Geregistreerd</MenuItem>

            <MenuItem value="CANCELLED">Geannuleerd</MenuItem>
          </Select>
        </Stack>

        <TableContainer>
          <Table size="small" stickyHeader aria-label="sticky table">
            <TableHead>
              <TableRow>
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
                  Registratienummer
                </TableCell>

                <TableCell
                  sx={{
                    minWidth: 300,
                    backgroundColor: "secondary.main",
                    color: "#fff",
                    fontWeight: "bold",
                    border: "1px solid #bdbdbd",
                  }}
                  align="center"
                >
                  Partij
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
                  Registratiedatum
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
              {contracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell>{contract.reference_number}</TableCell>

                  <TableCell>
                    <Typography variant="body2">
                      {contract.parties
                        .map((party: any) => party.fullname)
                        .join(" / ")}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ textAlign: "center" }}>
                    {formatDate(contract.contract_date)}
                  </TableCell>

                  <TableCell sx={{ textAlign: "center" }}>
                    {formatCurrency(contract.amount)}
                  </TableCell>

                  <TableCell sx={{ textAlign: "center" }}>
                    <StatusContractChip status={contract.status} width={175} />
                  </TableCell>

                  <TableCell align="center">
                    <IconButton
                      id={buttonId}
                      aria-controls={open ? menuId : undefined}
                      aria-haspopup="true"
                      aria-expanded={open}
                      onClick={handleClick}
                    >
                      <MoreVertIcon />
                    </IconButton>
                    <Menu
                      id={menuId}
                      anchorEl={anchorEl}
                      open={open}
                      onClose={handleClose}
                      slotProps={{
                        list: {
                          "aria-labelledby": buttonId,
                        },
                      }}
                    >
                      <MenuItem
                        onClick={() => handleClicShowDetails(contract.id)}
                      >
                        Consultar
                      </MenuItem>
                      <MenuItem onClick={handleClose}>
                        Activar Vordering
                      </MenuItem>
                    </Menu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box
          mt={3}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="body2" color="text.secondary">
            Totaal {contracts.length} overeenkomst
          </Typography>
        </Box>
      </Card>
    </Container>
  );
}
