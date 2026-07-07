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
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import ThumbDownAltIcon from "@mui/icons-material/ThumbDownAlt";
import EditIcon from "@mui/icons-material/Edit";

// components
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { AgreementResponse } from "@/lib/validations/agreement";
import { AlertService } from "@/shared/ui/alerts";
import {
  notifyApprovalAgreement,
  updatePaymentAgreement,
} from "@/modules/agreement/actions/agreement.actions";
import { notifyInfo } from "@/shared/ui/notifications";
import { AgreementFormDialog } from "./agreement-form-dialog";
import { AgreementStatus } from "@/modules/agreement/constants/agreement-status";

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
  const [agreementSelected, setAgreementSelected] =
    React.useState<AgreementResponse | null>(null);
  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);

  const handleApprove = (id: string) => {
    AlertService.showConfirm(
      "¿Wilt u deze betalingsregeling accepteren?",
      "",
      "JA",
      "NEE",
    ).then(async (confirmed) => {
      if (confirmed) {
        await updatePaymentAgreement(id, {
          status: AgreementStatus.ACCEPTED,
        });
        await notifyInfo("Betalingsregeling succesvol goedgekeurd.");
        // await fetchAgreements();

        await notifyApprovalAgreement(id);
        notifyInfo(
          "De debiteur is op de hoogte gebracht van de goedkeuring van de betalingsregeling.",
        );

        onApprove();
      }
    });
  };

  const handleReject = (id: string) => {
    AlertService.showConfirm(
      "¿Bent u zeker dat u deze wilt annuleren?",
      "",
      "JA",
      "NEE",
    ).then(async (confirmed) => {
      if (confirmed) {
        await updatePaymentAgreement(id, {
          status: AgreementStatus.REJECTED,
        });
        await notifyInfo("Betalingsregeling afgewezen.");
        // await fetchAgreements();
        onReject();
      }
    });
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
                Akkoord
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
              <TableCell
                sx={{
                  backgroundColor: "secondary.main",
                  color: "#fff",
                  fontWeight: "bold",
                }}
                align="center"
              >
                Edit
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {agreements.map((agreement: AgreementResponse) => (
              <TableRow key={agreement.id}>
                <TableCell align="center">
                  <IconButton
                    color="primary"
                    onClick={() => handleApprove(agreement.id)}
                  >
                    <ThumbUpAltIcon />
                  </IconButton>
                  <IconButton
                    color="secondary"
                    onClick={() => handleReject(agreement.id)}
                  >
                    <ThumbDownAltIcon />
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

                <TableCell align="center">
                  <IconButton>
                    <EditIcon
                      onClick={() => {
                        setAgreementSelected(agreement);
                        handleOpenModal();
                      }}
                    />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <AgreementFormDialog
        title="BETALINGSREGELING AANPASSEN"
        open={openModal}
        onClose={handleCloseModal}
        id={agreementSelected?.id || ""}
        debtClaim_id={agreementSelected?.debtClaim_id || ""}
        initialData={{
          debtClaim_id: agreementSelected?.debtClaim_id || "",
          ...agreementSelected,
          total_amount: agreementSelected?.total_amount || 0,
          installment_amount: agreementSelected?.installment_amount || 0,
          installments_count: agreementSelected?.installments_count || 0,
          start_date: agreementSelected?.start_date || new Date(),
          end_date: agreementSelected?.end_date || new Date(),
          status: AgreementStatus.COUNTEROFFER,
        }}
        onSave={onUpdate}
      />
    </>
  );
};
