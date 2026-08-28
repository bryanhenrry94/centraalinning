"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  TextField,
  Button,
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
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";

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
          {loading ? (
            <Stack spacing={1}>
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} variant="rounded" height={48} />
              ))}
            </Stack>
          ) : (
            (() => {
              const columns: ListColumn<DebtorResponse>[] = [
                {
                  key: "identification",
                  label: "Identificatie",
                  render: (option) => option.person?.identification,
                },
                {
                  key: "name",
                  label: "Naam",
                  render: (option) => `${option.person?.first_name} ${option.person?.last_name}`,
                },
                { key: "phone", label: "Telefoon", render: (option) => option.person?.phone, hideOnMobile: true },
                { key: "address", label: "Adres", render: (option) => option.person?.address, hideOnMobile: true },
                { key: "email", label: "E-mail", render: (option) => option.person?.email },
                {
                  key: "actions",
                  label: "",
                  render: (option) => (
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
                  ),
                },
              ];

              return (
                <ResponsiveListTable
                  columns={columns}
                  rows={options}
                  getRowKey={(option) => option.id}
                  emptyMessage="Geen resultaten gevonden"
                />
              );
            })()
          )}

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
