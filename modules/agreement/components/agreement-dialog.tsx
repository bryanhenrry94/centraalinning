import { useEffect } from "react";
import { Box, IconButton, Modal, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AgreementTable from "./agreement-table";
import { AgreementResponse } from "@/modules/agreement/services/agreement.validators";

interface AgreementDialogProps {
  open: boolean;
  onClose: () => void;
  agreements: AgreementResponse[];
}

export const AgreementDialog: React.FC<AgreementDialogProps> = ({
  open,
  onClose,
  agreements,
}) => {
  const fetchPaymentAgreements = async () => {
    // try {
    //   setLoading(true);
    //   const debtor = await getDebtorByUserId(user?.id as string);
    //   if (!debtor) {
    //     notifyError("No se encontró el deudor asociado al usuario");
    //     return;
    //   }
    //   const data = await getPaymentAgreements({ debtor_id: debtor.id });
    //   if (data) {
    //     setPaymentAgreements(data);
    //   }
    // } catch (error) {
    //   console.error("Error fetching payment agreements:", error);
    //   notifyError("Error al cargar los acuerdos de pago");
    // } finally {
    //   setLoading(false);
    // }
  };

  useEffect(() => {
    fetchPaymentAgreements();
  }, []);

  return (
    <Modal open={open} onClose={onClose}>
      <Box
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
          width: 700,
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
            BETALINGSREGELING OVERZICHT
          </Typography>
          <IconButton sx={{ color: "white" }}>
            <CloseIcon onClick={onClose} />
          </IconButton>
        </Box>
        <Box sx={{ p: 2, bgcolor: "background.paper" }}>
          <AgreementTable agreements={agreements} />
        </Box>
      </Box>
    </Modal>
  );
};
