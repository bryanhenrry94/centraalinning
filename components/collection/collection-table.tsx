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
import { useTheme, useMediaQuery } from "@mui/material";

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

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

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
    <Box mt={4}>
      {loading && <Typography>Loading...</Typography>}
      <TableContainer component={"div"}>
        <Table size="small" stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  minWidth: 90,
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                  border: "1px solid #bdbdbd",
                }}
              >
                Datum
              </TableCell>
              {!isSmallScreen && (
                <>
                  <TableCell
                    sx={{
                      minWidth: 110,
                      backgroundColor: "secondary.main",
                      color: "#fff",
                      fontWeight: "bold",
                      border: "1px solid #bdbdbd",
                      textAlign: "left",
                    }}
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
                </>
              )}
              <TableCell
                sx={{
                  minWidth: 120,
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                  border: "1px solid #bdbdbd",
                  textAlign: "left",
                }}
              >
                Naam
              </TableCell>
              {!isSmallScreen && (
                <>
                  <TableCell
                    sx={{
                      minWidth: 50,
                      backgroundColor: "secondary.main",
                      color: "#fff",
                      fontWeight: "bold",
                      border: "1px solid #bdbdbd",
                      textAlign: "left",
                    }}
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
                      textAlign: "left",
                    }}
                  >
                    Betaald
                  </TableCell>
                </>
              )}

              <TableCell
                sx={{
                  minWidth: 70,
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                  border: "1px solid #bdbdbd",
                  textAlign: "left",
                }}
              >
                Hoofd
              </TableCell>

              <TableCell
                sx={{
                  minWidth: 50,
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                  border: "1px solid #bdbdbd",
                }}
                align="left"
              >
                Status
              </TableCell>

              {!isSmallScreen && (
                <TableCell
                  sx={{
                    minWidth: 50,
                    backgroundColor: "secondary.main",
                    color: "#fff",
                    fontWeight: "bold",
                    border: "1px solid #bdbdbd",
                  }}
                  align="left"
                >
                  Actie
                </TableCell>
              )}
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
                <TableCell sx={{ textAlign: "left", fontSize: "10px" }}>
                  {formatDate(invoice.issue_date?.toString() || "")}
                </TableCell>
                {!isSmallScreen && (
                  <>
                    <TableCell sx={{ textAlign: "center" }}>
                      {invoice.document_number || "Onbekend"}
                    </TableCell>
                    <TableCell sx={{ textAlign: "center" }}>
                      {formatDate(invoice.due_date?.toString() || "")}
                    </TableCell>
                  </>
                )}
                <TableCell sx={{ textAlign: "left", fontSize: "10px" }}>
                  {invoice.debtor.fullname || "Onbekend"}
                </TableCell>
                {!isSmallScreen && (
                  <>
                    <TableCell sx={{ textAlign: "right" }}>
                      {formatCurrency(invoice.amount_original)}
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      {formatCurrency(invoice.fee_amount - invoice.abb_amount)}
                    </TableCell>
                  </>
                )}

                <TableCell sx={{ textAlign: "right", fontSize: "10px" }}>
                  {formatCurrency(
                    invoice.amount_original -
                      invoice.fee_amount -
                      invoice.abb_amount -
                      invoice.total_paid,
                  )}
                </TableCell>

                <TableCell sx={{ textAlign: "center", fontSize: "10px" }}>
                  {getStatusLabel(invoice.status)}
                </TableCell>
                {!isSmallScreen && (
                  <TableCell sx={{ textAlign: "center" }}>
                    <IconButton
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                        handleEdit(invoice.id)
                      }
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                )}
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
