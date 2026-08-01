"use client";
import React, { useEffect, useState } from "react";
import { Box, Stack, Typography, Divider, Chip } from "@mui/material";
import { formatDate } from "@/shared/utils/formatters";
import { getClaimTimelineForDebtClaim } from "@/modules/collection/actions/collection-case.actions";
import { getTimelineEventLabel } from "@/modules/collection/utils/timeline-event";

interface GopTimelineProps {
  debtClaimId: string;
  refreshKey?: number;
}

type TimelineEntry = Awaited<ReturnType<typeof getClaimTimelineForDebtClaim>>[number];

export const GopTimeline: React.FC<GopTimelineProps> = ({ debtClaimId, refreshKey }) => {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!debtClaimId) return;
    setLoading(true);
    getClaimTimelineForDebtClaim(debtClaimId)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [debtClaimId, refreshKey]);

  if (loading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Laden...
      </Typography>
    );
  }

  if (entries.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Nog geen wijzigingen geregistreerd.
      </Typography>
    );
  }

  return (
    <Stack divider={<Divider />} spacing={1.5}>
      {entries.map((entry) => (
        <Box key={entry.id}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
            <Typography variant="body2">{entry.description || getTimelineEventLabel(entry.event)}</Typography>
            <Chip size="small" variant="outlined" label={getTimelineEventLabel(entry.event)} />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {formatDate(entry.createdAt.toString())}
            {entry.createdBy ? ` — ${entry.createdBy.fullname || entry.createdBy.email}` : ""}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
};
