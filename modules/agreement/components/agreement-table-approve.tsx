"use client";
import React from "react";
// mui
import {
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";

// components
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { AgreementResponse } from "@/modules/agreement/services/agreement.validators";
import { AgreementRequestDialog } from "./agreement-request-dialog";

interface AgreementTableApproveProps {
  agreements: AgreementResponse[];
  onApprove: () => void;
  onReject: () => void;
  onUpdate: () => void;
}

export const AgreementTableApprove = ({
  agreements,
  onApprove,
  onReject,
  onUpdate,
}: AgreementTableApproveProps) => {
  const [openModal, setOpenModal] = React.useState(false);
  const [agreementSelectedId, setAgreementSelectedId] = React.useState<string | null>(null);

  const handleOpenModal = (id: string) => {
    setAgreementSelectedId(id);
    setOpenModal(true);
  };
  const handleCloseModal = () => setOpenModal(false);

  // Todas las acciones (aceptar/rechazar/tegenvoorstel) se resuelven dentro
  // del diálogo; en ambos consumidores actuales los tres callbacks del padre
  // apuntan al mismo refresco de la lista, así que basta con onUpdate.
  const handleResolved = () => {
    onUpdate();
  };

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
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                }}
                align="center"
              >
                Acties
              </TableCell>
              <TableCell
                sx={{
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                }}
                align="center"
              >
                Zaaktype
              </TableCell>
              <TableCell
                sx={{
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                }}
                align="center"
              >
                Datum
              </TableCell>
              <TableCell
                sx={{
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                }}
                align="center"
              >
                Debiteur
              </TableCell>
              <TableCell
                sx={{
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                }}
                align="center"
              >
                Totaal
              </TableCell>
              <TableCell
                sx={{
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                }}
                align="center"
              >
                Boet
              </TableCell>
              <TableCell
                sx={{
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                }}
                align="center"
              >
                Betaling
              </TableCell>
              <TableCell
                sx={{
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                }}
                align="center"
              >
                Termijn
              </TableCell>
              <TableCell
                sx={{
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                }}
                align="center"
              >
                Aflosbedrag
              </TableCell>
              <TableCell
                sx={{
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                }}
                align="center"
              >
                Startdatum
              </TableCell>
              <TableCell
                sx={{
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                }}
                align="center"
              >
                Einddatum
              </TableCell>
              <TableCell
                sx={{
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                }}
                align="center"
              >
                Open
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {agreements.map((agreement: AgreementResponse) => (
              <TableRow key={agreement.id}>
                <TableCell align="center">
                  <IconButton
                    color="primary"
                    onClick={() => handleOpenModal(agreement.id)}
                  >
                    <VisibilityIcon />
                  </IconButton>
                </TableCell>
                <TableCell align="center">
                  {"Buitengerechtelijk"}
                </TableCell>
                <TableCell align="center">
                  {new Date(agreement.created_at || "").toLocaleDateString()}
                </TableCell>
                <TableCell align="center">
                  {agreement.debtor
                    ? agreement.debtor.fullname
                    : "Sin deudor asignado"}
                </TableCell>
                <TableCell align="center">
                  {formatCurrency(agreement.total_amount)}
                </TableCell>
                <TableCell align="center">{formatCurrency(0)}</TableCell>
                <TableCell align="center">{formatCurrency(0)}</TableCell>

                <TableCell align="center">
                  {agreement.installments_count}
                </TableCell>
                <TableCell align="center">
                  {formatCurrency(agreement.installment_amount)}
                </TableCell>
                <TableCell align="center">
                  {formatDate(agreement.start_date.toString())}
                </TableCell>
                <TableCell align="center">
                  {formatDate(agreement.end_date.toString())}
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(agreement.total_amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <AgreementRequestDialog
        open={openModal}
        agreementId={agreementSelectedId}
        onClose={handleCloseModal}
        onResolved={handleResolved}
      />
    </>
  );
};
