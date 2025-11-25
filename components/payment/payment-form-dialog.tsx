import { Box, Dialog, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { PaymentForm } from "./payment-form";

interface PaymentFormDialogProps {
  open: boolean;
  onClose: () => void;
  debtId?: string;
  onSave?: () => void;
}

export const PaymentFormDialog: React.FC<PaymentFormDialogProps> = ({
  open,
  onClose,
  debtId,
  onSave,
}) => {
  return (
    <>
      <Dialog open={open} onClose={onClose}>
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
            BETALINGSOVERZICHT
          </Typography>
          <IconButton sx={{ color: "white" }}>
            <CloseIcon onClick={onClose} />
          </IconButton>
        </Box>
        <PaymentForm debtId={debtId} onSave={onSave} />
      </Dialog>
    </>
  );
};
