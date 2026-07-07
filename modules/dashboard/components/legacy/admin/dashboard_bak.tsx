"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import { Box, Container, Stack, Button } from "@mui/material";
import { usePathname } from "next/navigation";
import Modal from "@mui/material/Modal";
import { sendFinancialSummaryEmail } from "@/modules/collection/actions/debtor.actions";
import { notifyInfo } from "@/shared/ui/notifications";
import PaymentCard from "@/modules/payment/components/payment-card";
import { lastContracts } from "@/modules/contract/actions/contract.actions";
import RecentContractsCard, {
  Contract,
} from "@/modules/contract/components/recent-contracts-card";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";

export const DashboardAdmin = () => {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const [loading, setLoading] = React.useState(false);

  const { session } = useAuthSession();

  const [contracts, setContracts] = React.useState<Contract[]>([]);

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

  useEffect(() => {
    const tenantId = session?.user?.tenant_id;

    if (!tenantId) return;

    let isMounted = true;

    const loadData = async () => {
      try {
        const resContracts = await lastContracts(tenantId);

        if (
          !resContracts.success ||
          !resContracts.data ||
          !isMounted ||
          !Array.isArray(resContracts.data)
        ) {
          return;
        }

        const formattedContracts: Contract[] = resContracts.data.map(
          (contract) => ({
            id: contract.id,
            contractNumber: contract.reference_number,
            debtorName:
              contract.debtor?.fullname ??
              contract.debtor?.name ??
              "Sin deudor",
            createdAt:
              contract.created_at instanceof Date
                ? contract.created_at.toISOString()
                : contract.created_at,
            totalAmount: Number(contract.amount ?? 0),
            status: contract.status,
          }),
        );

        setContracts(formattedContracts);
      } catch (error) {
        console.error("Error loading dashboard contracts:", error);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [session?.user?.tenant_id]);

  return (
    <Container
      maxWidth="md"
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
        <RecentContractsCard contracts={contracts} />
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
        {/* Mijn dossiers */}
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
