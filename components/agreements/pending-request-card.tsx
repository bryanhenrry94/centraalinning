import { useEffect, useState } from "react";
// mui
import { Box, Button, Grid, Paper, Stack, Typography } from "@mui/material";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import ThumbDownAltIcon from "@mui/icons-material/ThumbDownAlt";
import PersonIcon from "@mui/icons-material/Person";
// action & validations
import { getCollectionViewById } from "@/actions/collection-case";
import { CollectionCaseView } from "@/lib/validations/collection";
import { Agreement } from "@/lib/validations/agreement";
import { formatCurrency, formatDate } from "@/utils/formatters";
import PaymentAgreementStatusChip from "../ui/payment-agreement-status-chip";
import { AgreementStatus } from "@/constants/agreement-status";

interface PendingRequestCardProps {
  agreement: Agreement;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

const PendingRequestCard: React.FC<PendingRequestCardProps> = ({
  agreement,
  onApprove,
  onReject,
}) => {
  const [collectionCase, setCollectionCase] =
    useState<CollectionCaseView | null>(null);

  useEffect(() => {
    // Fetch collection case details if needed
    const fetchCollectionCase = async () => {
      const data = await getCollectionViewById(agreement.debt_id || "");
      setCollectionCase(data);
    };
    fetchCollectionCase();
  }, [agreement.debt_id]);

  const handleApprove = () => {
    onApprove?.(agreement.id);
  };

  const handleReject = () => {
    onReject?.(agreement.id);
  };

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography variant="h5">
            Referencia #{collectionCase?.reference_number}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <PersonIcon />
            <Typography variant="body1">
              {collectionCase?.debtor.fullname}
            </Typography>
          </Box>
        </Box>
        <PaymentAgreementStatusChip
          status={agreement.status as AgreementStatus}
        />
      </Box>

      <Grid container spacing={2} sx={{ mb: 4, mt: 4 }}>
        <Grid size={{ xs: 4, sm: 4, md: 4 }}>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="body1">Monto total</Typography>
            <Typography variant="h6">
              {formatCurrency(agreement.total_amount)}
            </Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 4, sm: 4, md: 4 }}>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="body1">Cuotas</Typography>
            <Typography variant="h6">{agreement.installments_count}</Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 4, sm: 4, md: 4 }}>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="body1">Monto mensual</Typography>
            <Typography variant="h6">
              {formatCurrency(agreement.installment_amount)}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      <Typography variant="body1">
        Fecha primer pago: {formatDate(agreement.start_date.toString())}
      </Typography>
      {agreement.status === "PENDING" && (
        <Box sx={{ width: "100%", mt: 2 }}>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<ThumbUpAltIcon />}
              onClick={handleApprove}
              fullWidth
            >
              Aprobar
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<ThumbDownAltIcon />}
              onClick={handleReject}
              fullWidth
            >
              Rechazar
            </Button>
          </Stack>
        </Box>
      )}
    </Paper>
  );
};
export default PendingRequestCard;
