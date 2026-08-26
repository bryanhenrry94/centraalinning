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

  // De overdracht is gratis en onmiddellijk (geen CFSB-commissie meer) — ver
  // CaseTransferService.requestTransfer / CollectiveCollectionService.
  // transferToGop, dat ook de CollectiveCollection meteen naar TRANSFERRED zet.
  const handleTransfer = async () => {
    if (assigneeType === "LAWYER" && !lawyerId) {
      notifyError("Selecteer een advocaat");
      return;
    }
    if (assigneeType === "BAILIFF" && !bailiffId) {
      notifyError("Selecteer een deurwaarder");
      return;
    }

    try {
      setSubmitting(true);
      await transferCopToGop(collectionId, {
        debtClaimId,
        lawyerId: assigneeType === "LAWYER" ? lawyerId : null,
        bailiffId: assigneeType === "BAILIFF" ? bailiffId : null,
        isEmergencyTransfer: false,
        emergencyReason: null,
      });

      notifySuccess("Dossier overgedragen aan advocaat/deurwaarder.");
      onTransferred();
      handleClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Overdracht mislukt";
      notifyError(message);
    } finally {
      setSubmitting(false);
    }
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
        <Button variant="contained" onClick={handleTransfer} loading={submitting}>
          Dossier overdragen
        </Button>
        <Button onClick={handleClose} disabled={submitting}>
          Annuleren
        </Button>
      </DialogActions>
    </Dialog>
  );
};
