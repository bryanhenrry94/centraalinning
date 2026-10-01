"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Stack,
  Typography,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { acceptCaseTransfer } from "@/modules/legal-process/actions/case-transfer.actions";
import { formatCurrency, formatDateTime } from "@/shared/utils/formatters";

export interface AcceptTransferDialogDetails {
  reference: string;
  participant: string;
  debtor: string;
  amount: number;
  receivedAt: string | Date;
}

interface AcceptTransferDialogProps {
  open: boolean;
  onClose: () => void;
  caseTransferId: string;
  onRegistered: () => void;
  details?: AcceptTransferDialogDetails;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      spacing={2}
      sx={{ width: 250 }}
    >
      <Typography variant="body2" fontWeight={600}>
        {label}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {value}
      </Typography>
    </Stack>
  );
}

export const AcceptTransferDialog: React.FC<AcceptTransferDialogProps> = ({
  open,
  onClose,
  caseTransferId,
  onRegistered,
  details,
}) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await acceptCaseTransfer(caseTransferId);
      notifySuccess("Dossier geaccepteerd");
      onRegistered();
      onClose();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Actie mislukt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle
        sx={{
          bgcolor: "secondary.main",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontWeight: 600,
        }}
      >
        Dossieroverdracht accepteren
        <IconButton
          onClick={onClose}
          disabled={loading}
          sx={{ color: "white" }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Stack
          spacing={2}
          alignItems="center"
          textAlign="center"
          sx={{ mt: 2 }}
        >
          {/* <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              bgcolor: "secondary.50",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DescriptionOutlinedIcon
              sx={{ fontSize: 32, color: "secondary.main" }}
            />
          </Box> */}
          <Typography variant="subtitle1" fontWeight={700}>
            Wilt u deze dossieroverdracht accepteren?
          </Typography>
        </Stack>

        {details && (
          <>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={1} alignItems="center">
              <DetailRow label="Dossier nr." value={details.reference} />
              <DetailRow label="Deelnemer" value={details.participant} />
              <DetailRow label="Debiteur" value={details.debtor} />
              <DetailRow
                label="Hoofdsom"
                value={formatCurrency(details.amount)}
              />
              <DetailRow
                label="Ontvangen op"
                value={formatDateTime(details.receivedAt.toString())}
              />
            </Stack>
          </>
        )}
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={loading}
          fullWidth
        >
          Annuleren
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          fullWidth
        >
          Accepteren
        </Button>
      </DialogActions>
    </Dialog>
  );
};
