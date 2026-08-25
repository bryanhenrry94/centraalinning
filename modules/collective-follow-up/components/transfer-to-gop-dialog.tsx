"use client";
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { getActiveLawyersDirectory } from "@/modules/lawyer/actions/lawyer.actions";
import { Lawyer } from "@/modules/lawyer/services/lawyer.validators";
import { getActiveBailiffsDirectory } from "@/modules/bailiff/actions/bailiff.actions";
import { Bailiff } from "@/modules/bailiff/services/bailiff.validators";
import { transferCopToGop } from "@/modules/collective-follow-up/actions/collective-collection.actions";
import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";

interface TransferToGopDialogProps {
  open: boolean;
  onClose: () => void;
  collectionId: string;
  debtClaimId: string;
  onTransferred: () => void;
}

type AssigneeType = "LAWYER" | "BAILIFF";

export const TransferToGopDialog: React.FC<TransferToGopDialogProps> = ({
  open,
  onClose,
  collectionId,
  debtClaimId,
  onTransferred,
}) => {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [bailiffs, setBailiffs] = useState<Bailiff[]>([]);
  const [assigneeType, setAssigneeType] = useState<AssigneeType>("LAWYER");
  const [lawyerId, setLawyerId] = useState("");
  const [bailiffId, setBailiffId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    Promise.all([getActiveLawyersDirectory(), getActiveBailiffsDirectory()])
      .then(([lawyersData, bailiffsData]) => {
        setLawyers(lawyersData);
        setBailiffs(bailiffsData);
      })
      .catch(() => notifyError("Kon advocaten/deurwaarders niet laden"));
  }, [open]);

  const handleClose = () => {
    setAssigneeType("LAWYER");
    setLawyerId("");
    setBailiffId("");
    onClose();
  };

  const handleAssigneeTypeChange = (_: unknown, value: AssigneeType | null) => {
    if (!value) return;
    setAssigneeType(value);
    setLawyerId("");
    setBailiffId("");
  };

  // De overdracht wordt pas definitief nadat de CFSB-overdrachtscommissie
  // (5%) betaald is — ver CaseTransferService.confirmTransferPayment, dat
  // ook de CollectiveCollection naar TRANSFERRED zet.
  const handleCreateTransaction = async () => {
    if (assigneeType === "LAWYER" && !lawyerId) {
      const message = "Selecteer een advocaat";
      notifyError(message);
      return { success: false, error: message };
    }
    if (assigneeType === "BAILIFF" && !bailiffId) {
      const message = "Selecteer een deurwaarder";
      notifyError(message);
      return { success: false, error: message };
    }

    try {
      setSubmitting(true);
      const result = await transferCopToGop(collectionId, {
        debtClaimId,
        lawyerId: assigneeType === "LAWYER" ? lawyerId : null,
        bailiffId: assigneeType === "BAILIFF" ? bailiffId : null,
        isEmergencyTransfer: false,
        emergencyReason: null,
      });

      if (!result.paymentUrl || !result.paymentId) {
        notifySuccess("Dossier overgedragen.");
        onTransferred();
        handleClose();
        return { success: false };
      }

      return { success: true, paymentId: result.paymentId, paymentUrl: result.paymentUrl };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Overdracht mislukt";
      notifyError(message);
      return { success: false, error: message };
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentConfirmed = async () => {
    notifySuccess("Betaling bevestigd. Dossier overgedragen aan advocaat/deurwaarder.");
    onTransferred();
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Overdragen aan advocaat/deurwaarder</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <ToggleButtonGroup
            color="primary"
            exclusive
            fullWidth
            size="small"
            value={assigneeType}
            onChange={handleAssigneeTypeChange}
          >
            <ToggleButton value="LAWYER">Advocaat</ToggleButton>
            <ToggleButton value="BAILIFF">Deurwaarder</ToggleButton>
          </ToggleButtonGroup>

          {assigneeType === "LAWYER" ? (
            <TextField
              select
              label="Advocaat"
              required
              value={lawyerId}
              onChange={(e) => setLawyerId(e.target.value)}
              size="small"
            >
              {lawyers.map((lawyer) => (
                <MenuItem key={lawyer.id} value={lawyer.id}>
                  {lawyer.firstName} {lawyer.lastName}
                  {lawyer.companyName ? ` — ${lawyer.companyName}` : ""}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              select
              label="Deurwaarder"
              required
              value={bailiffId}
              onChange={(e) => setBailiffId(e.target.value)}
              size="small"
            >
              {bailiffs.map((bailiff) => (
                <MenuItem key={bailiff.id} value={bailiff.id}>
                  {bailiff.fullname}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexDirection: "column", alignItems: "stretch", gap: 1, px: 3, pb: 2 }}>
        <PaymentIntent
          onCreateTransaction={handleCreateTransaction}
          onPaymentConfirmed={handlePaymentConfirmed}
        />
        <Button onClick={handleClose} disabled={submitting}>
          Annuleren
        </Button>
      </DialogActions>
    </Dialog>
  );
};
