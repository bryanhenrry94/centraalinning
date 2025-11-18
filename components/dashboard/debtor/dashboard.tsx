"use client";
import React, { Suspense, useEffect, useState } from "react";
import { getAllCollectionCases } from "@/app/actions/collection-case";
import { CollectionCaseResponse } from "@/lib/validations/collection";
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Tabs,
  Tab,
  Modal,
  IconButton,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import HandshakeIcon from "@mui/icons-material/Handshake";
import VisibilityIcon from "@mui/icons-material/Visibility";

import { useSession } from "next-auth/react";
import { formatCurrency, formatDate } from "@/utils/formatters";
import AgreementTable from "@/components/agreements/agreement-table";
import {
  PaymentAgreement,
  PaymentAgreementCreate,
  PaymentAgreementResponse,
} from "@/lib/validations/payment-agreement";
import { notifyError, notifyInfo } from "@/lib/notifications";
import TabPanel from "@/components/ui/tab-panel";
import AgreementForm from "@/components/agreements/agreement-form";
import { $Enums, CollectionCaseNotification } from "@/prisma/generated/prisma";
import ModalNotifications from "@/components/notification/modal-notifications";
import { useTenant } from "@/hooks/useTenant";
// Actions
import {
  createPaymentAgreement,
  existsPaymentAgreement,
  getPaymentAgreements,
  updatePaymentAgreement,
} from "@/app/actions/payment-agreement";
import { getAllDebts, getDebtorByUserId } from "@/app/actions/debtor";
import { getAllNotificationsByCollectionCase } from "@/app/actions/notification";

const DashboardDebtor = () => {
  const { data: session } = useSession();
  const user = session?.user;

  // State variables
  const [loading, setLoading] = useState(false);
  const [value, setValue] = React.useState(0);

  const [notifications, setNotifications] = useState<
    CollectionCaseNotification[]
  >([]);
  const [openModalAgreement, setOpenModalAgreement] = React.useState(false);
  const [openModalNotifications, setOpenModalNotifications] =
    React.useState(false);

  const [debtSelected, setDebtSelected] = useState<any | null>(null);
  const [debts, setDebts] = React.useState<any[]>([]);

  const handleOpenModalNotifications = async (caseId: string) => {
    await fetchNotifications(caseId);

    setOpenModalNotifications(true);
  };
  const handleCloseModalNotifications = () => setOpenModalNotifications(false);

  useEffect(() => {
    fetchDebts();
  }, []);

  const fetchDebts = async () => {
    try {
      const debtor = await getDebtorByUserId(user?.id as string);
      if (!debtor) {
        notifyError("No se encontró el deudor asociado al usuario");
        return;
      }
      const response = await getAllDebts(debtor.id);
      if (response.success) {
        console.log("Debts fetched:", response.data);
        setDebts(response.data || []);
      } else {
        setDebts([]);
      }
      // Fetch debts logic here
      // For demonstration, setting an empty array
    } catch (error) {
      console.error("Error fetching debts:", error);
    }
  };

  const handleOpenModalAgreement = () => {
    setOpenModalAgreement(true);
  };

  const handleCloseModalAgreement = () => setOpenModalAgreement(false);

  const fetchNotifications = async (caseId: string) => {
    try {
      const data: CollectionCaseNotification[] =
        await getAllNotificationsByCollectionCase(caseId);
      setNotifications(data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const handleAgreementSubmit = async (data: Partial<PaymentAgreement>) => {
    // Implement submission logic here
    try {
      setLoading(true);
      console.log("Agreement Data Submitted:", data);

      if (!debtSelected?.id) return;

      if (!session?.user?.tenant_id) {
        notifyError("No se encontró el tenant_id del usuario");
        return;
      }

      const agreementCreate: PaymentAgreementCreate = {
        collection_case_id: debtSelected.collection_case_id || null,
        verdict_id: debtSelected.verdict_id || null,
        total_amount: Number(data.total_amount),
        installments_count: Number(data.installments_count),
        installment_amount: Number(data.installment_amount),
        start_date: data.start_date || new Date(),
        end_date: data.end_date || new Date(),
        status: data.status || "ACTIVE",
      };

      if (agreementCreate.start_date < new Date()) {
        notifyError("La fecha de inicio debe ser mayor a la fecha actual");
        return;
      }

      const exists = await existsPaymentAgreement(debtSelected?.id);
      if (exists) {
        notifyError("Ya existe un acuerdo de pago para esta collection");
        return;
      }

      const debtor = await getDebtorByUserId(user?.id as string);
      if (!debtor) {
        notifyError("No se encontró el deudor asociado al usuario");
        return;
      }

      agreementCreate.debtor_id = debtor.id;

      console.log("Creating agreement with data:", agreementCreate);

      await createPaymentAgreement(session?.user?.tenant_id, agreementCreate);
      handleCloseModalAgreement();
      notifyInfo("Payment agreement submitted successfully");
    } catch (error) {
      console.error("Error creating payment agreement:", error);
      notifyError("Error al crear el acuerdo de pago");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" gutterBottom>
        Mijn schulden
      </Typography>

      <Suspense fallback={<h1>Loading collection cases...</h1>}>
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table
            stickyHeader
            size="small" // DENSE
            sx={{
              "& .MuiTableCell-root": {
                border: "1px solid #e0e0e0",
                padding: "4px 8px", // compacto
              },
              "& .MuiTableRow-root": {
                height: "32px", // compacta las filas
              },
            }}
            aria-label="tabla de embargo"
          >
            <TableHead>
              <TableRow>
                {[
                  "Zaaktype",
                  "Referentie",
                  "Status",
                  "Datum",
                  "Reactietermijn",
                  "Totaal",
                  "Boet",
                  "Betaling",
                  "Open",
                  "Actie",
                ].map((col) => (
                  <TableCell
                    key={col}
                    align="center"
                    sx={{
                      minWidth: 50,
                      backgroundColor: "secondary.main",
                      color: "#fff",
                      fontWeight: "bold",
                      border: "1px solid #bdbdbd",
                      padding: "4px 8px",
                    }}
                  >
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {debts.map((debt) => (
                <TableRow key={debt.id}>
                  <TableCell sx={{ textAlign: "left" }}>{debt.type}</TableCell>
                  <TableCell sx={{ textAlign: "left" }}>
                    {debt.reference}
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    {debt.status}
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    {formatDate(debt.issueDate?.toString() || "")}
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    {formatDate(debt.dueDate?.toString() || "")}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {formatCurrency(debt.amount)}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {formatCurrency(0)}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {formatCurrency(0)}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {formatCurrency(0)}
                  </TableCell>

                  <TableCell sx={{ textAlign: "center" }}>
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Tooltip title="Betalingsregeling">
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();

                            debt.collection_case_id =
                              debt.type === "Buitengerechtelijk"
                                ? debt.id
                                : null;

                            debt.verdict_id =
                              debt.type === "Vonnis" ? debt.verdict_id : null;

                            setDebtSelected(debt);
                            handleOpenModalAgreement();
                          }}
                          size="small" // más compacto
                        >
                          <HandshakeIcon color="primary" fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Overzicht">
                        <IconButton
                          onClick={() => handleOpenModalNotifications(debt.id)}
                          size="small"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Suspense>

      <Box sx={{ mt: 6, display: "flex", justifyContent: "flex-end" }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h6" sx={{ fontWeight: 500 }}>
            Totale schulden:
          </Typography>

          <Box sx={{ bgcolor: "grey.100", px: 2, py: 1, borderRadius: 1 }}>
            <Typography
              variant="h4"
              sx={{ fontWeight: 600, ml: 1 }}
              color="primary.main"
            >
              {formatCurrency(
                debts.reduce((total, debt) => total + (debt.amount || 0), 0)
              )}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Modal
        open={openModalAgreement}
        onClose={handleCloseModalAgreement}
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
              NIEUWE OVEREENKOMST
            </Typography>
            <IconButton sx={{ color: "white" }}>
              <CloseIcon onClick={handleCloseModalAgreement} />
            </IconButton>
          </Box>

          {/* {JSON.stringify(debtSelected)} */}
          <AgreementForm
            onSubmit={handleAgreementSubmit}
            initialData={{
              ...debtSelected,

              total_amount: debtSelected?.amount ?? 0,
              installments_count: 1,
              start_date: new Date(
                new Date().getFullYear(),
                new Date().getMonth() + 1,
                0
              ),
              status: $Enums.AgreementStatus.PENDING,
            }}
            loading={loading}
          />
        </Paper>
      </Modal>

      <ModalNotifications
        open={openModalNotifications}
        onClose={handleCloseModalNotifications}
        notifications={notifications}
      />
    </Container>
  );
};

export default DashboardDebtor;
