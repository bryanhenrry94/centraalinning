"use client";
import { formatCurrency, formatDate } from "@/utils/formatters";
import {
  Box,
  IconButton,
  Modal,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";

import {
  PaymentAgreement,
  PaymentAgreementResponse,
} from "@/lib/validations/payment-agreement";
import { useState } from "react";
import { Installment } from "@/lib/validations/installment";
import {
  deletePaymentAgreement,
  getInstallmentsByAgreement,
} from "@/app/actions/payment-agreement";
import { AlertService } from "@/lib/alerts";
import { notifyInfo } from "@/lib/notifications";
import PaymentAgreementStatusChip from "../ui/payment-agreement-status-chip";
import { $Enums } from "@/prisma/generated/prisma";

interface AgreementTableProps {
  agreements: PaymentAgreementResponse[];
  onDelete?: () => void;
  onApprove?: (data: Partial<PaymentAgreement>) => void;
  onReject?: (data: Partial<PaymentAgreement>) => void;
}

const AgreementTable = ({
  agreements,
  onDelete,
  onApprove,
  onReject,
}: AgreementTableProps) => {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);

  const handleMoreDetails = async (agreementId: string) => {
    // Implement more details logic here
    const agreement = await getInstallmentsByAgreement(agreementId);
    setInstallments(agreement);
    console.log("More details for agreement:", agreement);
    handleOpenModal();
  };

  const handleDeleteAgreement = (agreementId: string) => {
    AlertService.showConfirm(
      "¿Estás seguro?",
      "Esta acción eliminará el registro.",
      "Sí, eliminar",
      "Cancelar"
    ).then(async (confirmed) => {
      if (confirmed) {
        await deletePaymentAgreement(agreementId);
        notifyInfo("Acuerdo de pago eliminado exitosamente");
        onDelete?.();
      }
    });
    return;
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
                Aflostermijnen
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
              {/* <TableCell
                sx={{
                  minWidth: 50,
                  backgroundColor: "paper.main",
                  color: "#000",
                  fontWeight: "bold",
                  border: "1px solid #bdbdbd",
                }}
                align="center"
              >
                Eerste termijn datum
              </TableCell> */}
              {/* <TableCell
                sx={{
                  minWidth: 50,
                  backgroundColor: "paper.main",
                  color: "#000",
                  fontWeight: "bold",
                  border: "1px solid #bdbdbd",
                }}
                align="center"
              >
                Status
              </TableCell> */}
            </TableRow>
          </TableHead>
          <TableBody>
            {agreements?.map((agreement) => (
              <TableRow key={agreement.id}>
                <TableCell component="th" scope="row" align="center">
                  {formatDate(agreement.start_date.toString())}
                </TableCell>
                <TableCell align="center">
                  {agreement.debtor?.fullname ?? "N/A"}
                </TableCell>
                <TableCell align="center">
                  {agreement?.collection_case?.reference_number || "N/A"}
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(agreement.total_amount)}
                </TableCell>
                <TableCell align="center">
                  {agreement.installments_count}
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
                {/* <TableCell align="center">
                  {formatDate(agreement.start_date.toString())}
                </TableCell> */}
                <TableCell align="center">
                  <PaymentAgreementStatusChip
                    status={agreement.status as $Enums.AgreementStatus}
                  />
                </TableCell>

                {/* <TableCell align="center">
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="center"
                  >
                    {agreement.status ===
                      $Enums.AgreementStatus.PENDING && (
                      <>
                        <IconButton
                          aria-label="delete agreement"
                          color="error"
                          onClick={() => handleDeleteAgreement(agreement.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </>
                    )}
                    {agreement.status ===
                      $Enums.AgreementStatus.COUNTEROFFER && (
                      <>
                        {onApprove && (
                          <IconButton
                            aria-label="approve agreement"
                            color="primary"
                            onClick={() => onApprove?.(agreement)}
                          >
                            <ThumbUpAltIcon />
                          </IconButton>
                        )}

                        {onReject && (
                          <IconButton
                            aria-label="reject agreement"
                            color="secondary"
                            onClick={() => onReject?.(agreement)}
                          >
                            <ThumbDownAltIcon />
                          </IconButton>
                        )}
                      </>
                    )}

                    {agreement.status !==
                      $Enums.AgreementStatus.PENDING &&
                      agreement.status !==
                        $Enums.AgreementStatus.COUNTEROFFER && (
                        <Typography variant="body2" color="textSecondary">
                          -
                        </Typography>
                      )}
                  </Stack>
                </TableCell> */}
              </TableRow>
            ))}
            {/* Datos de prueba */}
            <TableRow>
              <TableCell component="th" scope="row" align="center">
                01-09-2023
              </TableCell>
              <TableCell align="right">{formatCurrency(1200)}</TableCell>
              <TableCell align="center">12</TableCell>
              <TableCell align="right">{formatCurrency(100)}</TableCell>
              <TableCell align="center">01-09-2023</TableCell>
              <TableCell align="center">01-08-2024</TableCell>
              {/* <TableCell align="center">
                <PaymentAgreementStatusChip
                  status={$Enums.AgreementStatus.APPROVED}
                />
              </TableCell> */}
            </TableRow>
            {/* <TableRow>
              <TableCell colSpan={9} align="center">
                {agreements.length === 0 && (
                  <Typography variant="body2" color="textSecondary">
                    Geen gegevens beschikbaar.
                  </Typography>
                )}
              </TableCell>
            </TableRow> */}
          </TableBody>
        </Table>
      </TableContainer>
      <Modal
        open={openModal}
        onClose={handleCloseModal}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Paper
          component="section"
          sx={{
            mt: 2,
            elevation: 1,
            borderRadius: 1,
            overflow: "hidden",
            mb: 2,
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            maxHeight: "80vh",
            overflowY: "auto",
          }}
        >
          <Box
            sx={{
              bgcolor: "secondary.main",
              color: "white",
              px: 2,
              py: 1.5,
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              borderBottom: "1px solid #e0e0e0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
              OVEREENKOMSTGEGEVENS
            </Typography>
            <IconButton sx={{ color: "white" }}>
              <CloseIcon onClick={handleCloseModal} />
            </IconButton>
          </Box>
          <Box sx={{ p: 2 }}>
            <TableContainer component={Paper}>
              <Table aria-label="simple table">
                <TableHead>
                  <TableRow>
                    <TableCell>Vervaldatum</TableCell>
                    <TableCell align="right">Deel</TableCell>
                    <TableCell align="right">Bedrag</TableCell>
                    <TableCell align="right">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {installments?.map((installment) => (
                    <TableRow
                      key={installment.id}
                      sx={{
                        "&:last-child td, &:last-child th": { border: 0 },
                      }}
                    >
                      <TableCell component="th" scope="row" align="center">
                        {formatDate(installment.due_date.toString())}
                      </TableCell>
                      <TableCell align="center">{installment.number}</TableCell>
                      <TableCell align="right">
                        {formatCurrency(installment.amount)}
                      </TableCell>
                      <TableCell align="right">{installment.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      </Modal>
    </>
  );
};
export default AgreementTable;
