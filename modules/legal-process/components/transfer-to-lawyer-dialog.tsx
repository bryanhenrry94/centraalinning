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
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { getActiveLawyersDirectory } from "@/modules/lawyer/actions/lawyer.actions";
import { Lawyer } from "@/modules/lawyer/services/lawyer.validators";
import { getActiveBailiffsDirectory } from "@/modules/bailiff/actions/bailiff.actions";
import { Bailiff } from "@/modules/bailiff/services/bailiff.validators";
import { transferToLawyer, hasExistingCaseTransfer } from "@/modules/legal-process/actions/case-transfer.actions";

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
  const [isEmergencyTransfer, setIsEmergencyTransfer] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Noodoverdracht (AT-013) solo aplica para reemplazar a un advocaat/
  // deurwaarder ya asignado — si este es el primer intento de transferencia
  // del dossier, esa opción no debe existir.
  const [canUseEmergencyTransfer, setCanUseEmergencyTransfer] = useState(false);

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

    hasExistingCaseTransfer(debtClaimId)
      .then(setCanUseEmergencyTransfer)
      .catch(() => setCanUseEmergencyTransfer(false));
  }, [open, debtClaimId]);

  const handleClose = () => {
    setAssigneeType("LAWYER");
    setLawyerId("");
    setBailiffId("");
    setIsEmergencyTransfer(false);
    setEmergencyReason("");
    onClose();
  };

  const handleAssigneeTypeChange = (_: unknown, value: AssigneeType | null) => {
    if (!value) return;
    setAssigneeType(value);
    setLawyerId("");
    setBailiffId("");
  };

  // De overdracht is gratis (geen CFSB-commissie meer) en wordt onmiddellijk
  // genotificeerd aan de geselecteerde advocaat/deurwaarder — ver
  // CaseTransferService.requestTransfer.
  const handleTransfer = async () => {
    if (assigneeType === "LAWYER" && !lawyerId) {
      notifyError("Selecteer een advocaat");
      return;
    }
    if (assigneeType === "BAILIFF" && !bailiffId) {
      notifyError("Selecteer een deurwaarder");
      return;
    }
    if (isEmergencyTransfer && !emergencyReason.trim()) {
      notifyError("Vermeld de reden van de noodoverdracht");
      return;
    }

    try {
      setSubmitting(true);
      await transferToLawyer({
        debtClaimId,
        lawyerId: assigneeType === "LAWYER" ? lawyerId : null,
        bailiffId: assigneeType === "BAILIFF" ? bailiffId : null,
        isEmergencyTransfer,
        emergencyReason: isEmergencyTransfer ? emergencyReason.trim() : null,
      });

      notifySuccess("Dossier overgedragen. De advocaat/deurwaarder heeft een melding ontvangen.");
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
      <DialogTitle>Dossieroverdracht</DialogTitle>
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

          {canUseEmergencyTransfer && (
            <>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isEmergencyTransfer}
                    onChange={(e) => setIsEmergencyTransfer(e.target.checked)}
                  />
                }
                label="Noodoverdracht (overlijden of arbeidsongeschiktheid van de huidige advocaat/deurwaarder)"
              />
              {isEmergencyTransfer && (
                <TextField
                  label="Reden van de noodoverdracht"
                  required
                  multiline
                  minRows={2}
                  size="small"
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                />
              )}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{
          flexDirection: "column",
          alignItems: "stretch",
          gap: 1,
          px: 3,
          pb: 2,
        }}
      >
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
