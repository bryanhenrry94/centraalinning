"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import PersonIcon from "@mui/icons-material/Person";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import CampaignIcon from "@mui/icons-material/Campaign";
import HandshakeIcon from "@mui/icons-material/Handshake";
import GavelIcon from "@mui/icons-material/Gavel";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PaymentsIcon from "@mui/icons-material/Payments";
import MoneyOffIcon from "@mui/icons-material/MoneyOff";
import BlockIcon from "@mui/icons-material/Block";
import ListAltIcon from "@mui/icons-material/ListAlt";
import InfoIcon from "@mui/icons-material/Info";
import { formatDate, formatTime } from "@/shared/utils/formatters";
import { getClaimTimelineForDebtClaim } from "@/modules/collection/actions/debt-claim.actions";
import { getTimelineEventLabel } from "@/modules/collection/utils/timeline-event";

interface CopTimelineProps {
  debtClaimId: string;
  refreshKey?: number;
}

type TimelineEntry = Awaited<ReturnType<typeof getClaimTimelineForDebtClaim>>[number];

const EVENT_VISUALS: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
  COL_STARTED: { icon: <GroupsIcon fontSize="small" />, bg: "#E7F7EE", color: "#16A34A" },
  COL_DEBTOR_NOTIFIED: { icon: <PersonIcon fontSize="small" />, bg: "#FEF0E4", color: "#F97316" },
  COL_NETWORK_BROADCAST_SENT: { icon: <CampaignIcon fontSize="small" />, bg: "#EFF6FF", color: "#3B82F6" },
  COL_EMPLOYER_FOUND: { icon: <WorkOutlineIcon fontSize="small" />, bg: "#EFF6FF", color: "#3B82F6" },
  COL_NEGOTIATION_CREATED: { icon: <HandshakeIcon fontSize="small" />, bg: "#F3F0FF", color: "#8B5CF6" },
  COL_NEGOTIATION_ACCEPTED: { icon: <HandshakeIcon fontSize="small" />, bg: "#E7F7EE", color: "#16A34A" },
  COL_NEGOTIATION_REJECTED: { icon: <HandshakeIcon fontSize="small" />, bg: "#FDECEC", color: "#DC2626" },
  COL_TRANSFERRED_TO_GOP: { icon: <GavelIcon fontSize="small" />, bg: "#FDECEC", color: "#DC2626" },
  COL_CLOSED: { icon: <CancelIcon fontSize="small" />, bg: "#FDECEC", color: "#DC2626" },
  COL_COMPLETED: { icon: <CheckCircleIcon fontSize="small" />, bg: "#E7F7EE", color: "#16A34A" },
  PAYMENT_REGISTERED: { icon: <PaymentsIcon fontSize="small" />, bg: "#EFF6FF", color: "#3B82F6" },
  PAYMENT_VERIFIED: { icon: <PaymentsIcon fontSize="small" />, bg: "#E7F7EE", color: "#16A34A" },
  PAYMENT_REJECTED: { icon: <MoneyOffIcon fontSize="small" />, bg: "#FDECEC", color: "#DC2626" },
  BLOCKADE_REGISTERED: { icon: <BlockIcon fontSize="small" />, bg: "#FDECEC", color: "#DC2626" },
  BLOCKADE_RELEASED: { icon: <BlockIcon fontSize="small" />, bg: "#E7F7EE", color: "#16A34A" },
};

const DEFAULT_VISUAL = { icon: <ListAltIcon fontSize="small" />, bg: "#F1F1F1", color: "#6B7280" };

function getEventVisual(event: string) {
  return EVENT_VISUALS[event] ?? DEFAULT_VISUAL;
}

const FILTERS: { value: string; label: string; match: (event: string) => boolean }[] = [
  { value: "ALL", label: "Alle gebeurtenissen", match: () => true },
  { value: "COP", label: "Collectieve Opvolging", match: (e) => e.startsWith("COL_") },
  { value: "AOP", label: "Administratieve opvolging", match: (e) => e.startsWith("AOP_") },
  { value: "PAYMENT", label: "Betalingen", match: (e) => e.startsWith("PAYMENT_") },
];

export const CopTimeline: React.FC<CopTimelineProps> = ({ debtClaimId, refreshKey }) => {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    if (!debtClaimId) return;
    setLoading(true);
    getClaimTimelineForDebtClaim(debtClaimId)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [debtClaimId, refreshKey]);

  const filteredEntries = useMemo(() => {
    const activeFilter = FILTERS.find((f) => f.value === filter) ?? FILTERS[0];
    return entries.filter((entry) => activeFilter.match(entry.event));
  }, [entries, filter]);

  const handleFilterChange = (event: SelectChangeEvent) => setFilter(event.target.value);

  if (loading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Laden...
      </Typography>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Select size="small" value={filter} onChange={handleFilterChange} sx={{ minWidth: 200 }}>
          {FILTERS.map((f) => (
            <MenuItem key={f.value} value={f.value}>
              {f.label}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {filteredEntries.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Nog geen wijzigingen geregistreerd.
        </Typography>
      ) : (
        <Stack spacing={0}>
          {filteredEntries.map((entry, index) => {
            const visual = getEventVisual(entry.event);
            const isLast = index === filteredEntries.length - 1;
            return (
              <Box key={entry.id} sx={{ display: "flex", gap: 2 }}>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      bgcolor: visual.bg,
                      color: visual.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {visual.icon}
                  </Box>
                  {!isLast && <Box sx={{ flex: 1, width: 2, bgcolor: "divider", my: 0.5 }} />}
                </Box>

                <Box sx={{ flex: 1, pb: isLast ? 0 : 3, minWidth: 0 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    <Typography variant="body2" fontWeight={700}>
                      {getTimelineEventLabel(entry.event)}
                    </Typography>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        {formatDate(entry.createdAt.toString())}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        {formatTime(entry.createdAt.toString())}
                      </Typography>
                    </Box>
                  </Box>
                  {entry.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                      {entry.description}
                    </Typography>
                  )}
                  {entry.createdBy && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                      {entry.createdBy.fullname || entry.createdBy.email}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
};
