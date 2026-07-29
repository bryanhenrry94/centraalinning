"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import { getAgreementsByDebtClaimId } from "@/modules/agreement/actions/agreement.actions";
import { AgreementResponse } from "@/modules/agreement/services/agreement.validators";
import { isAgreementPending } from "@/modules/agreement/constants/agreement-status";
import { AgreementTableApprove } from "@/modules/agreement/components/agreement-table-approve";
import AgreementTable from "@/modules/agreement/components/agreement-table";

interface AgreementReviewDialogProps {
  open: boolean;
  onClose: () => void;
  debtClaimId: string;
  onUpdated?: () => void;
}

export const AgreementReviewDialog = ({
  open,
  onClose,
  debtClaimId,
  onUpdated,
}: AgreementReviewDialogProps) => {
  const [agreements, setAgreements] = useState<AgreementResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAgreements = useCallback(async () => {
    if (!debtClaimId) return;
    setLoading(true);
    try {
      const response = await getAgreementsByDebtClaimId(debtClaimId);
      setAgreements(
        [...(response || [])].sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime(),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [debtClaimId]);

  useEffect(() => {
    if (open) fetchAgreements();
  }, [open, fetchAgreements]);

  const handleChange = () => {
    fetchAgreements();
    onUpdated?.();
  };

  const pending = agreements.filter((a) => isAgreementPending(a.status));
  const resolved = agreements.filter((a) => !isAgreementPending(a.status));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
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
          Betalingsregeling
        </Typography>
        <IconButton sx={{ color: "white" }} onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : agreements.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            Er is geen betalingsregeling aangevraagd voor dit dossier.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, py: 1 }}>
            {pending.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Te beoordelen
                </Typography>
                <AgreementTableApprove
                  agreements={pending}
                  onApprove={handleChange}
                  onReject={handleChange}
                  onUpdate={handleChange}
                />
              </Box>
            )}

            {resolved.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Geschiedenis
                </Typography>
                <AgreementTable agreements={resolved} />
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
