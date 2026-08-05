"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";

import {
  getGopExecutionMeasures,
  completeGopExecutionMeasure,
} from "@/modules/legal-process/actions/legal-process.actions";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { AlertService } from "@/shared/ui/alerts";

type ExecutionMeasure = Awaited<ReturnType<typeof getGopExecutionMeasures>>[number];

interface GopExecutionMeasuresProps {
  legalProcessId: string;
  canManage: boolean;
  onChanged: () => void;
}

export const GopExecutionMeasures: React.FC<GopExecutionMeasuresProps> = ({
  legalProcessId,
  canManage,
  onChanged,
}) => {
  const [items, setItems] = useState<ExecutionMeasure[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setItems(await getGopExecutionMeasures(legalProcessId));
    } catch (error) {
      notifyError("Kon executiemaatregelen niet laden");
    } finally {
      setLoading(false);
    }
  }, [legalProcessId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleComplete = async (measure: ExecutionMeasure) => {
    const confirmed = await AlertService.showConfirm(
      "Executiemaatregel afronden?",
      `Markeer "${measure.embargo_type}" als voltooid.`,
      "Ja, afronden",
      "Annuleren",
    );
    if (!confirmed) return;

    try {
      await completeGopExecutionMeasure(legalProcessId, measure.id);
      notifySuccess("Executiemaatregel afgerond.");
      await load();
      onChanged();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Actie mislukt");
    }
  };

  if (loading) return null;
  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Nog geen executiemaatregelen geregistreerd.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5}>
      {items.map((measure) => (
        <Box
          key={measure.id}
          sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1 }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {measure.embargo_type} — {formatCurrency(measure.total_amount)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDate(measure.embargo_date.toString())}
                {measure.verdict?.registration_number ? ` · Vonnis ${measure.verdict.registration_number}` : ""}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                size="small"
                label={measure.status === "COMPLETED" ? "Voltooid" : "Lopend"}
                color={measure.status === "COMPLETED" ? "success" : "default"}
              />
              {canManage && measure.status === "IN_PROGRESS" && (
                <Button size="small" variant="outlined" onClick={() => handleComplete(measure)}>
                  Voltooien
                </Button>
              )}
            </Stack>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
};
