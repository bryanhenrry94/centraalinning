"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import TablePagination from "@mui/material/TablePagination";
import { useTenant } from "@/hooks/useTenant";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { CollectionCaseResponse } from "@/services/collection/collection.type";

const CollectionTable = ({
  invoices,
}: {
  invoices: CollectionCaseResponse[];
}) => {
  const router = useRouter();
  const { tenant } = useTenant();

  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<string | null>(null);

  // pagination
  const [page, setPage] = React.useState(0);
  const rowsPerPage = 5;

  const paginatedData = invoices.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleEdit = (id: string) => {
    router.push(`/dashboard/collections/${id}`);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "AANMANING":
        return "Aanmaning";
      case "SOMMATIE":
        return "Sommaties";
      case "INGEBREKESTELLING":
        return "Ingebrekestelling";
      case "BLOKKADE":
        return "Blokkade";
      default:
        return status;
    }
  };

  return (
    <Box mt={2}>
      {loading && <Typography>Loading...</Typography>}
      <TableContainer component={"div"}>
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
                Datum vordering
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
                Referentienummer
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
                Reactietermijn
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
                Debiteurnaam
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
                Vordering
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
                Te betalen
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
                Te ontvangen
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
                Actie
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((invoice) => (
              <TableRow
                key={invoice.id}
                hover
                selected={selectedRow === invoice.id}
                onClick={() => setSelectedRow(invoice.id)}
                sx={{
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: (theme) => theme.palette.primary.light,
                  },
                  "&.Mui-selected": {
                    backgroundColor: (theme) => theme.palette.primary.light,
                  },
                  "&.Mui-selected:hover": {
                    backgroundColor: (theme) => theme.palette.primary.light,
                  },
                }}
              >
                <TableCell sx={{ textAlign: "center" }}>
                  {formatDate(invoice.issue_date?.toString() || "")}
                </TableCell>
                <TableCell sx={{ textAlign: "center" }}>
                  {invoice.reference_number}
                </TableCell>
                <TableCell sx={{ textAlign: "center" }}>
                  {formatDate(invoice.due_date?.toString() || "")}
                </TableCell>
                <TableCell sx={{ textAlign: "left" }}>
                  {invoice.debtor.fullname || "Onbekend"}
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  {formatCurrency(invoice.amount_original)}
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  {formatCurrency(invoice.fee_amount + invoice.abb_amount)}
                </TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  {formatCurrency(invoice.total_to_receive)}
                </TableCell>
                <TableCell sx={{ textAlign: "center" }}>
                  {getStatusLabel(invoice.status)}
                </TableCell>
                <TableCell sx={{ textAlign: "center" }}>
                  <IconButton
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                      handleEdit(invoice.id)
                    }
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
          count={invoices.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[5]} // fijo en 5
        />
      </TableContainer>
    </Box>
  );
};

export default CollectionTable;
