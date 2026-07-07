"use client";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";

import { AgreementResponse } from "@/modules/agreement/services/agreement.validators";

interface AgreementTableProps {
  agreements: AgreementResponse[];
}

const AgreementTable = ({ agreements }: AgreementTableProps) => {
  return (
    <>
      <TableContainer component={Paper}>
        <Table
          stickyHeader
          sx={{
            "& .MuiTableCell-root": {
              border: "1px solid #e0e0e0",
            },
          }}
          aria-label="tabla de embargo"
          size="small"
        >
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  minWidth: 50,
                  backgroundColor: "paper.main",
                  color: "#000",
                  fontWeight: "bold",
                  border: "1px solid #bdbdbd",
                }}
                align="center"
              >
                Datum
              </TableCell>
              <TableCell
                sx={{
                  minWidth: 50,
                  backgroundColor: "paper.main",
                  color: "#000",
                  fontWeight: "bold",
                  border: "1px solid #bdbdbd",
                }}
                align="center"
              >
                Open
              </TableCell>
              <TableCell
                sx={{
                  minWidth: 50,
                  backgroundColor: "paper.main",
                  color: "#000",
                  fontWeight: "bold",
                  border: "1px solid #bdbdbd",
                }}
                align="center"
              >
                Termijn
              </TableCell>
              <TableCell
                sx={{
                  minWidth: 50,
                  backgroundColor: "paper.main",
                  color: "#000",
                  fontWeight: "bold",
                  border: "1px solid #bdbdbd",
                }}
                align="center"
              >
                Aflosbedrag
              </TableCell>
              <TableCell
                sx={{
                  backgroundColor: "paper.main",
                  color: "#000",
                  fontWeight: "bold",
                }}
                align="center"
              >
                Startdatum
              </TableCell>
              <TableCell
                sx={{
                  backgroundColor: "paper.main",
                  color: "#000",
                  fontWeight: "bold",
                }}
                align="center"
              >
                Einddatum
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {agreements?.map((agreement) => (
              <TableRow key={agreement.id}>
                <TableCell component="th" scope="row" align="center">
                  {formatDate(agreement.start_date.toString())}
                </TableCell>
                <TableCell align="center">
                  {formatCurrency(agreement.total_amount) ?? "N/A"}
                </TableCell>
                <TableCell align="center">
                  {agreement?.installments_count || "N/A"}
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(agreement.installment_amount)}
                </TableCell>
                <TableCell align="center">
                  {formatDate(agreement.start_date.toString())}
                </TableCell>
                <TableCell align="center">
                  {formatDate(agreement.end_date.toString())}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};
export default AgreementTable;
