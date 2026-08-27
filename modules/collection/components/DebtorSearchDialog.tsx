"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Box,
  Stack,
  Typography,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { DebtorResponse } from "@/modules/collection/services/debtor.validators";
import TouchAppIcon from "@mui/icons-material/TouchApp";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";

interface DebtorSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (account: DebtorResponse) => void;
}

export function DebtorSearchDialog({
  open,
  onOpenChange,
  onSelect,
}: DebtorSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<DebtorResponse[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = useCallback(async (currentPage = 1, search = "") => {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/debtors/search?page=${currentPage}&pageSize=5&q=${encodeURIComponent(
          search,
        )}`,
      );
      const data = await response.json();

      setOptions(data.data);
      setPage(data.pagination.page);
      setTotalPages(data.pagination.totalPages);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchData(1);
    }
  }, [open, fetchData]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setPage(1);
      setOptions([]);
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle
        sx={{
          bgcolor: "secondary.main",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontWeight: 600,
        }}
      >
        Schuldenaar zoeken
        <IconButton onClick={() => onOpenChange(false)} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Box sx={{ p: 2 }}>
        <Stack spacing={3}>
          {/* Zoekvak */}
          <Stack direction="row" spacing={2}>
            <TextField
              placeholder="Naam of code..."
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setQuery(e.target.value)
              }
              fullWidth
              size="small"
              variant="outlined"
            />

            <Button
              type="button"
              onClick={() => fetchData(1, query)}
              variant="contained"
              startIcon={<SearchIcon />}
              sx={{ whiteSpace: "nowrap" }}
            >
              Zoeken
            </Button>
          </Stack>

          {/* Tabla */}
          <TableContainer>
            <Table sx={{ minWidth: 400 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                  <TableCell sx={{ width: 120, fontWeight: 600 }}>
                    Identificatie
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, minWidth: 150 }}>
                    Naam
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Telefoon</TableCell>
                  <TableCell sx={{ fontWeight: 600, minWidth: 150 }}>
                    Adres
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>E-mail</TableCell>
                  <TableCell
                    sx={{ width: 120, fontWeight: 600 }}
                    align="right"
                  />
                </TableRow>
              </TableHead>

              <TableBody>
                {loading
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton variant="text" width={80} />
                        </TableCell>

                        <TableCell align="right">
                          <Skeleton variant="text" width={100} />
                        </TableCell>

                        <TableCell>
                          <Skeleton variant="text" width={80} />
                        </TableCell>

                        <TableCell>
                          <Skeleton variant="text" width="100%" />
                        </TableCell>

                        <TableCell>
                          <Skeleton variant="text" width="100%" />
                        </TableCell>
                      </TableRow>
                    ))
                  : options.map((option: DebtorResponse) => (
                      <TableRow key={option.id} hover>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {option.person?.identification}
                        </TableCell>

                        <TableCell>{`${option.person?.first_name} ${option.person?.last_name}`}</TableCell>
                        <TableCell>{option.person?.phone}</TableCell>
                        <TableCell>{option.person?.address}</TableCell>
                        <TableCell>{option.person?.email}</TableCell>

                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              onSelect(option);
                              onOpenChange(false);
                            }}
                            startIcon={<TouchAppIcon />}
                            sx={{ textTransform: "none" }}
                          >
                            Selecteren
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                {options.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      <Stack alignItems="center" spacing={1}>
                        <Typography variant="body2" color="textSecondary">
                          Geen resultaten gevonden
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Paginación */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="body2" color="textSecondary">
              Pagina {page} van {totalPages}
            </Typography>

            <Stack direction="row" spacing={1}>
              <IconButton
                size="small"
                disabled={page <= 1 || loading}
                onClick={() => fetchData(page - 1, query)}
              >
                <ChevronLeftIcon />
              </IconButton>

              <IconButton
                size="small"
                disabled={page >= totalPages || loading}
                onClick={() => fetchData(page + 1, query)}
              >
                <ChevronRightIcon />
              </IconButton>
            </Stack>
          </Stack>
        </Stack>
      </Box>
    </Dialog>
  );
}
