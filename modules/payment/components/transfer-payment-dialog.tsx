"use client";

import React from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloseIcon from "@mui/icons-material/Close";

import { DebtorSummary } from "@/modules/collection/types/DebtorSummary";
import { getAgreementByDebtClaimId } from "@/modules/agreement/actions/agreement.actions";
import {
  isAgreementApproved,
  isAgreementPending,
} from "@/modules/agreement/constants/agreement-status";
import { getAllBankAccountsByTenantId } from "@/modules/tenant/actions/bank-account.actions";
import { BankAccount } from "@/modules/tenant/services/bank-account.validators";
import { initiateTransferPayment } from "@/modules/payment/actions/payment-transfer.actions";
import { formatCurrency } from "@/shared/utils/formatters";
import { notifyError, notifyInfo, notifyWarning } from "@/shared/ui/notifications";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  SAVINGS: "Ahorro",
  CHECKING: "Corriente",
};

interface TransferPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  debt: DebtorSummary | null;
  debtorEmail: string;
  onSuccess?: () => void;
}

export const TransferPaymentDialog = ({
  open,
  onClose,
  debt,
  debtorEmail,
  onSuccess,
}: TransferPaymentDialogProps) => {
  const [loadingContext, setLoadingContext] = React.useState(true);
  const [bankAccounts, setBankAccounts] = React.useState<BankAccount[]>([]);
  const [blockedMessage, setBlockedMessage] = React.useState<string | null>(
    null,
  );

  const [amount, setAmount] = React.useState<string>("");
  const [referenceNumber, setReferenceNumber] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open || !debt) return;

    const loadContext = async () => {
      setLoadingContext(true);
      setBlockedMessage(null);
      try {
        const [accountsResponse, agreement] = await Promise.all([
          getAllBankAccountsByTenantId(debt.tenant_id),
          getAgreementByDebtClaimId(debt.id),
        ]);

        if (isAgreementPending(agreement?.status)) {
          setBlockedMessage(
            "Uw verzoek voor een betalingsregeling wacht nog op goedkeuring.",
          );
        }

        setBankAccounts(accountsResponse.data || []);
        setAmount(
          String(
            isAgreementApproved(agreement?.status)
              ? agreement!.installment_amount
              : (debt.debtor_to_participant_balance ?? ""),
          ),
        );
        setReferenceNumber("");
        setFile(null);
      } catch (error) {
        console.error("Error loading transfer payment context:", error);
        notifyError("Kon de betaalgegevens niet laden.");
      } finally {
        setLoadingContext(false);
      }
    };

    loadContext();
  }, [open, debt]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] || null);
  };

  const handleSubmit = async () => {
    if (!debt) return;

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      notifyWarning("Voer een geldig bedrag in.");
      return;
    }

    if (!referenceNumber.trim()) {
      notifyWarning("Voer het referentienummer van de betaling in.");
      return;
    }

    if (!file) {
      notifyWarning("Upload een foto van het betalingsbewijs.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("debtClaimId", debt.id);
      formData.set("tenantId", debt.tenant_id);
      formData.set("debtorEmail", debtorEmail);
      formData.set("amount", String(parsedAmount));
      formData.set("referenceNumber", referenceNumber.trim());
      formData.set("file", file);

      const response = await initiateTransferPayment(formData);

      if (!response.success) {
        notifyError(response.error || "Kon het betalingsbewijs niet verzenden.");
        return;
      }

      notifyInfo(
        "Uw betalingsbewijs is verzonden. De klant zal het binnenkort controleren.",
      );
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error submitting transfer payment:", error);
      notifyError("Er is een fout opgetreden bij het verzenden.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
        Betaling per overschrijving
        <IconButton onClick={onClose} disabled={submitting} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {loadingContext ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : blockedMessage ? (
          <Alert severity="warning">{blockedMessage}</Alert>
        ) : (
          <Stack spacing={2} mt={1}>
            <Alert severity="info">
              Maak de overschrijving naar onderstaande rekening en upload
              daarna het betalingsbewijs.
            </Alert>

            {bankAccounts.length === 0 ? (
              <Alert severity="error">
                Deze klant heeft nog geen bankrekening geregistreerd.
              </Alert>
            ) : (
              <Stack spacing={1}>
                {bankAccounts.map((account) => (
                  <Box
                    key={account.id}
                    sx={{
                      p: 1.5,
                      border: "1px solid #e0e0e0",
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="body2" fontWeight={600}>
                      {account.bank_name}
                    </Typography>
                    <Typography variant="body2">
                      {account.account_number} (
                      {ACCOUNT_TYPE_LABELS[account.account_type] ||
                        account.account_type}
                      )
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}

            <TextField
              label="Bedrag"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
            />

            <TextField
              label="Comprobante-nummer"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              fullWidth
            />

            <Button
              component="label"
              variant="outlined"
              startIcon={<UploadFileIcon />}
            >
              {file ? file.name : "Betalingsbewijs uploaden"}
              <input
                type="file"
                hidden
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={handleFileChange}
              />
            </Button>

            {debt && (
              <Typography variant="caption" color="text.secondary">
                Openstaand saldo aan deelnemer: {formatCurrency(debt.debtor_to_participant_balance)}
              </Typography>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Annuleren
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={
            submitting ||
            loadingContext ||
            !!blockedMessage ||
            bankAccounts.length === 0
          }
        >
          {submitting ? "Verzenden..." : "Bewijs verzenden"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
