import { Box, Dialog, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { AgreementForm } from "./agreement-form";
import { CreateAgreement } from "@/lib/validations/agreement";

interface AgreementFormDialogProps {
  open: boolean;
  onClose: () => void;
  id?: string;
  title: string;
  initialData?: CreateAgreement;
  debtClaim_id: string;
  onSave: () => void;
}

export const AgreementFormDialog: React.FC<AgreementFormDialogProps> = ({
  open,
  onClose,
  id,
  title,
  initialData,
  debtClaim_id,
  onSave,
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <Box
        sx={{
          bgcolor: "secondary.main",
          color: "white",
          px: 2,
          py: 1.5,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>

        <IconButton sx={{ color: "white" }} onClick={() => onClose()}>
          <CloseIcon />
        </IconButton>
      </Box>

      <AgreementForm
        id={id}
        debtClaim_id={debtClaim_id}
        initialData={initialData}
        onSave={onSave}
      />
    </Dialog>
  );
};
