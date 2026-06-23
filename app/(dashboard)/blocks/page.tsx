"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  IconButton,
  InputAdornment,
  MenuItem,
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
  ListItemIcon,
  ListItemText,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/utils/formatters";
import { useDebounce } from "@/hooks/useDebounce";

import VisibilityIcon from "@mui/icons-material/Visibility";

export default function BlocksPage() {
  const router = useRouter();

  const [blockades, setBlockades] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    search: "",
    status: "ALL",
    page: 1,
  });

  const id = React.useId();
  const buttonId = `${id}-button`;
  const menuId = `${id}-menu`;

  const [selectedBlockade, setSelectedBlockade] = useState<any | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const open = Boolean(anchorEl);

  const handleClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    blockade: any,
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedBlockade(blockade);
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

      const response = await fetch(`/api/blockades?${query.toString()}`);
      const data = await response.json();
      setBlockades(data);
    } catch (error) {
      console.error("Error fetching blockades:", error);
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
    router.push(`/blocks/${contractId}`);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSelectedBlockade(null);
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
            Blokkade
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Hier kan je een overzicht vinden van alle geregistreerde
            overeenkomsten en de status van hun administratieve opvolging.
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
                    minWidth: 350,
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
                  Motivo
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
                  <TableCell>
                    {blockade?.debtor?.person?.first_name}{" "}
                    {blockade?.debtor?.person?.last_name}
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">
                      {formatCurrency(blockade.amount)}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ textAlign: "center" }}>
                    {blockade.reason === "UNPAID_PAYMENT"
                      ? "Niet nagekomen betalingsverplichting"
                      : "-"}
                  </TableCell>

                  <TableCell align="center">
                    <IconButton
                      id={buttonId}
                      aria-controls={open ? menuId : undefined}
                      aria-haspopup="true"
                      aria-expanded={open}
                      onClick={(event) => handleClick(event, blockade)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

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
            onClick={() => {
              if (!selectedBlockade) return;

              handleClicShowDetails(selectedBlockade.id);
              handleClose();
            }}
          >
            <ListItemIcon>
              <VisibilityIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Raadplegen</ListItemText>
          </MenuItem>
        </Menu>

        <Box
          mt={3}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="body2" color="text.secondary">
            Totaal {blockades.length} overeenkomst
          </Typography>
        </Box>
      </Card>
    </Container>
  );
}
