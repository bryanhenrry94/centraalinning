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
import { transferToLawyer } from "@/modules/legal-process/actions/legal-process.actions";
import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";

interface TransferToLawyerDialogProps {
  open: boolean;
  onClose: () => void;
  debtClaimId: string;
  onTransferred: () => void;
}

type AssigneeType = "LAWYER" | "BAILIFF";

export const TransferToLawyerDialog: React.FC<TransferToLawyerDialogProps> = ({
  open,
  onClose,
  debtClaimId,
  onTransferred,
}) => {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [bailiffs, setBailiffs] = useState<Bailiff[]>([]);
  const [assigneeType, setAssigneeType] = useState<AssigneeType>("LAWYER");
  const [lawyerId, setLawyerId] = useState("");
  const [bailiffId, setBailiffId] = useState("");

  useEffect(() => {
    if (!open) return;

    // Directorio platform-wide: cualquier abogado/alguacil autorregistrado y
    // activo, sin importar a qué tenant pertenece quien está transfiriendo.
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

  // De overdracht wordt pas definitief (LegalProcess + melding aan de
  // advocaat/deurwaarder) zodra de betaling van de GOP-transfercommissie
  // (5% van het openstaande saldo) bevestigd is — zie confirmTransferPayment
  // (webhook). Hier wordt alleen de betaling aangemaakt.
  const handleCreateTransaction = async (): Promise<{
    success: boolean;
    error?: string;
    paymentId?: string;
    paymentUrl?: string;
  }> => {
    if (assigneeType === "LAWYER" && !lawyerId) {
      return { success: false, error: "Selecteer een advocaat" };
    }
    if (assigneeType === "BAILIFF" && !bailiffId) {
      return { success: false, error: "Selecteer een deurwaarder" };
    }

    try {
      const result = await transferToLawyer({
        debtClaimId,
        lawyerId: assigneeType === "LAWYER" ? lawyerId : null,
        bailiffId: assigneeType === "BAILIFF" ? bailiffId : null,
      });
      return { success: true, paymentId: result.paymentId, paymentUrl: result.paymentUrl };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Overdracht mislukt",
      };
    }
  };

  const handlePaymentConfirmed = async () => {
    notifySuccess(
      "Betaling bevestigd. De advocaat/deurwaarder ontvangt een melding zodra de overdracht is verwerkt.",
    );
    onTransferred();
    handleClose();
  };

  const handlePaymentFailed = async () => {
    notifyError("De betaling is niet gelukt. Probeer het opnieuw.");
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        Dossieroverdracht voor mogelijke gerechtelijke opvolging
      </DialogTitle>
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
          onPaymentFailed={handlePaymentFailed}
        />
        <Button onClick={handleClose}>Annuleren</Button>
      </DialogActions>
    </Dialog>
  );
};
