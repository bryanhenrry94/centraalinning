"use client";
import React from "react";
import Link from "next/link";
import { Box, Container, Stack, Button } from "@mui/material";
import { usePathname } from "next/navigation";
import Modal from "@mui/material/Modal";
import { sendFinancialSummaryEmail } from "@/actions/debtor";
import { notifyInfo } from "@/lib/notifications";
import PaymentCard from "@/components/financial-report/payment-card";

export const DashboardAdmin = () => {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const [loading, setLoading] = React.useState(false);

  const items = [
    {
      id: 1,
      name: "Reporte Financiero",
      description: "Un informe detallado sobre la situación financiera",
      price: 45.0,
    },
  ];

  const handlePaymentSuccess = async () => {
    try {
      setLoading(true);
      // Enviar el correo con el reporte financiero
      await sendFinancialSummaryEmail("43f6aa9e-5ff2-49f3-ab15-c58c0c62f48e");
      notifyInfo("Reporte financiero enviado por correo.");

      handleClose();
    } catch (error) {
      console.error("Error sending financial report email:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        p: 0,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={4}
        sx={{ width: "100%", justifyContent: "center", alignItems: "center" }}
      >
        {/* <Button
          component={Link}
          href={`${pathname}/collections`}
          variant="contained"
          color="primary"
          size="large"
          sx={{
            flex: 1,
            minWidth: 270,
            minHeight: 120,
            fontSize: "1.5rem",
            textTransform: "none",
            boxShadow: 3,
            // borderRadius: 3,
          }}
        >
          Buitengerechtelijk
        </Button>
        <Button
          component={Link}
          href={`${pathname}/verdicts`}
          variant="contained"
          color="secondary"
          size="large"
          sx={{
            flex: 1,
            minWidth: 270,
            minHeight: 120,
            fontSize: "1.5rem",
            textTransform: "none",
            boxShadow: 3,
          }}
        >
          Gerechtelijk Vonnis
        </Button> */}
        Mijn dossiers
      </Stack>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 800,
            bgcolor: "background.paper",
            boxShadow: 24,
            borderRadius: 2,
            p: 4,
          }}
        >
          <PaymentCard
            items={items}
            onSuccess={handlePaymentSuccess}
            loading={loading}
          />
        </Box>
      </Modal>
    </Container>
  );
};
