"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Container,
  Typography,
  Paper,
  Box,
  Tabs,
  Tab,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Modal,
} from "@mui/material";
import { DebtClaimView } from "@/modules/collection/services/collection.validators";
import { Payment } from "@/modules/payment/services/payment.validators";
import { getDebtClaimViewById } from "@/modules/collection/actions/collection-case.actions";
import { notifyError, notifyInfo } from "@/shared/ui/notifications";
import { formatCurrency } from "@/shared/utils/formatters";
import { getPaymentsByInvoice } from "@/modules/payment/actions/payment.actions";
import { CollectionNotificationService } from "@/modules/collection/services/collection-notification.service";
import { AOPStepNotification } from "@/modules/notification/services/notification.validators";
import TabPanel from "@/shared/ui/tab-panel";

import { useSession } from "next-auth/react";
import LoadingUI from "@/shared/ui/loading-ui";
import { PaymentFormDialog } from "@/modules/payment/components/payment-form-dialog";

const CollectionViewPage: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [collection, setCollection] = React.useState<DebtClaimView | null>(
    null,
  );
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notifications, setNotifications] = useState<AOPStepNotification[] | null>(
    null,
  );
  const [value, setValue] = React.useState(0);

  const [openModalPayment, setOpenModalPayment] = React.useState(false);
  const handleOpenModalPayment = () => setOpenModalPayment(true);
  const handleCloseModalPayment = () => setOpenModalPayment(false);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const params = useParams();

  useEffect(() => {
    fetchInvoice();
    fetchPayments();
    fetchNotifications();
  }, []);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      if (!params.id) {
        notifyError("ID de collection no proporcionado");
        router.back();
        return;
      }
      const data = await getDebtClaimViewById(params.id as string);
      if (data) {
        setCollection(data);
      }
    } catch (error) {
      console.error("Error fetching collection:", error);
      notifyError("Error al cargar la collection");
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      if (!params.id) {
        notifyError("ID de collection no proporcionado");
        router.back();
        return;
      }

      const data = await getPaymentsByInvoice(params.id as string);
      if (data) {
        setPayments(data);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      notifyError("Error al cargar los pagos");
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      if (!params.id) {
        notifyError("ID de collection no proporcionado");
        router.back();
        return;
      }

      const data =
        await CollectionNotificationService.getStepsForClaim(
          params.id as string,
        );
      console.log("Notifications Data:", data);
      setNotifications(data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      notifyError("Error al cargar las notificaciones");
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async () => {
    try {
      setLoading(true);
      if (!params.id) {
        notifyError("ID de collection no proporcionado");
        router.back();
        return;
      }

      await CollectionNotificationService.sendNotification(params.id as string);
      await fetchNotifications();

      notifyInfo("Notificación enviada exitosamente");
    } catch (error) {
      console.error("Error sending notification:", error);
      notifyError("Error al enviar la notificación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Paper elevation={3} sx={{ mb: 4 }}>
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
              alignItems: "left",
            }}
          >
            <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
              OVERZICHT VORDERING
            </Typography>
          </Box>

          {loading ?? <LoadingUI />}

          <Box sx={{ p: 2 }}>
            <Typography variant="body1" color="text.secondary">
              Datum vordering:{" "}
              {collection?.createdAt
                ? new Date(collection.createdAt).toLocaleDateString()
                : "N/A"}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Debiteurnaam:{" "}
              {collection?.debtor.fullname ? collection.debtor.fullname : "N/A"}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Vordering: {formatCurrency(Number(collection?.principalAmount) || 0)}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Totaal te betalen:{" "}
              {formatCurrency(Number(collection?.currentAmount) || 0)}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Status: {collection?.status || "N/A"}
            </Typography>
          </Box>
        </Paper>

        <Box sx={{ width: "100%" }}>
          <Tabs value={value} onChange={handleChange} aria-label="example tabs">
            <Tab value={0} label="Betalingen" wrapped />
            <Tab value={1} label="Notificaties" />
          </Tabs>
        </Box>
        <TabPanel value={value} index={0}>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              sx={{ mb: 2 }}
              onClick={handleOpenModalPayment}
            >
              Nieuwe betaling
            </Button>

            <PaymentFormDialog
              open={openModalPayment}
              onClose={handleCloseModalPayment}
            />

            <TableContainer component={Paper}>
              <Table aria-label="simple table">
                <TableHead>
                  <TableRow>
                    <TableCell>Betalingsdatum</TableCell>
                    <TableCell align="right">Bedrag</TableCell>
                    <TableCell align="right">Betaalmethode</TableCell>
                    <TableCell align="right">Referentienummer</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments?.map((payment) => (
                    <TableRow
                      key={payment.id}
                      sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                    >
                      <TableCell component="th" scope="row">
                        {payment.paid_at
                          ? new Date(payment.paid_at).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(payment.total_amount)}
                      </TableCell>
                      <TableCell align="right">{payment.method}</TableCell>
                      <TableCell align="right">
                        {payment.reference_number || "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>
        <TabPanel value={value} index={1}>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              sx={{ mb: 2 }}
              onClick={handleSendNotification}
            >
              Send New Notification
            </Button>
            <TableContainer component={Paper}>
              <Table aria-label="simple table">
                <TableHead>
                  <TableRow>
                    <TableCell>Datum</TableCell>
                    <TableCell align="right">Titel</TableCell>
                    <TableCell align="right">Type</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {notifications?.map((notification) => (
                    <TableRow
                      key={notification.id}
                      sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                    >
                      <TableCell component="th" scope="row">
                        {notification.sentAt
                          ? new Date(notification.sentAt).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell align="right">{notification.step}</TableCell>
                      <TableCell align="right">{notification.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>
      </Container>
    </Container>
  );
};

export default CollectionViewPage;
