"use client";

import {
  Box,
  Card,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { useRouter } from "next/navigation";
import React from "react";

// Patrón responsive único para toda la app: Table normal en desktop (sm+)
// con cabecera secondary.main, Stack de Cards apiladas en mobile (xs).
// Nace en modules/admin/ (CFSB Admin) y se promueve acá para que las
// pantallas de deelnemer/debiteur también lo reutilicen en vez de
// reimplementar el mismo par Table/Stack-de-cards en cada página.
const HEAD_SX = {
  backgroundColor: "secondary.main",
  color: "#fff",
  fontWeight: "bold",
  whiteSpace: "nowrap" as const,
};

export interface ListColumn<T> {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  render: (row: T) => React.ReactNode;
  // Columnas de baja prioridad se pueden ocultar en la card mobile para no
  // saturarla — por defecto todas se muestran.
  hideOnMobile?: boolean;
}

interface ResponsiveListTableProps<T> {
  columns: ListColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  getRowHref?: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function ResponsiveListTable<T>({
  columns,
  rows,
  getRowKey,
  getRowHref,
  onRowClick,
  emptyMessage = "Geen resultaten gevonden.",
}: ResponsiveListTableProps<T>) {
  const router = useRouter();

  const handleRowClick = (row: T) => {
    if (onRowClick) return onRowClick(row);
    if (getRowHref) router.push(getRowHref(row));
  };
  const clickable = !!getRowHref || !!onRowClick;

  if (rows.length === 0) {
    return (
      <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", p: 3, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Paper>
    );
  }

  const mobileColumns = columns.filter((c) => !c.hideOnMobile);

  return (
    <>
      {/* Mobile: kaartenlijst */}
      <Stack spacing={1.5} sx={{ display: { xs: "flex", sm: "none" } }}>
        {rows.map((row) => (
          <Card
            key={getRowKey(row)}
            elevation={0}
            onClick={() => handleRowClick(row)}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              p: 2,
              cursor: clickable ? "pointer" : "default",
            }}
          >
            <Stack spacing={1}>
              {mobileColumns.map((col) => (
                <Stack
                  key={col.key}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  spacing={1}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                    {col.label}
                  </Typography>
                  <Box sx={{ textAlign: "right", minWidth: 0 }}>{col.render(row)}</Box>
                </Stack>
              ))}
            </Stack>
            {clickable && (
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                <ChevronRightRoundedIcon fontSize="small" color="action" />
              </Box>
            )}
          </Card>
        ))}
      </Stack>

      {/* Desktop: tabla */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ display: { xs: "none", sm: "block" }, border: "1px solid", borderColor: "divider" }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.key} align={col.align ?? "left"} sx={HEAD_SX}>
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={getRowKey(row)}
                hover
                onClick={() => handleRowClick(row)}
                sx={{ cursor: clickable ? "pointer" : "default" }}
              >
                {columns.map((col) => (
                  <TableCell key={col.key} align={col.align ?? "left"}>
                    {col.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
