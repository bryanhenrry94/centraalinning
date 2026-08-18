"use client";
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Stack,
  Typography,
  Chip,
  Divider,
  CircularProgress,
} from "@mui/material";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import PersonIcon from "@mui/icons-material/Person";
import { formatDate, formatTime } from "@/shared/utils/formatters";
import {
  getCollectiveCollectionNotifications,
  getCollectiveCollectionNetworkQuery,
} from "@/modules/collective-follow-up/actions/collective-collection.actions";

type Notification = Awaited<ReturnType<typeof getCollectiveCollectionNotifications>>[number];
type NetworkQueryProgress = Awaited<ReturnType<typeof getCollectiveCollectionNetworkQuery>>;

const NETWORK_QUERY_STATUS_LABELS: Record<string, string> = {
  OPEN: "In afwachting van reacties",
  MATCHED: "Werkgever gevonden",
  CLOSED_NO_MATCH: "Gesloten zonder match",
};

const RECIPIENT_LABELS: Record<string, string> = {
  EMPLOYER: "Werkgever",
  DEBTOR: "Debiteur",
  MEMBER: "Deelnemer",
  CLIENT: "Klant",
};

const STATUS_COLORS: Record<string, "default" | "success" | "warning" | "error"> = {
  SENT: "success",
  DELIVERED: "success",
  FAILED: "error",
  PENDING: "warning",
  SCHEDULED: "warning",
  DRAFT: "default",
};

interface CollectiveCollaborationDialogProps {
  open: boolean;
  onClose: () => void;
  collectionId: string;
  employerFound: boolean;
  employerTenantName?: string | null;
  employerMatchedAt?: string | null;
}

export const CollectiveCollaborationDialog: React.FC<CollectiveCollaborationDialogProps> = ({
  open,
  onClose,
  collectionId,
  employerFound,
  employerTenantName,
  employerMatchedAt,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [networkQuery, setNetworkQuery] = useState<NetworkQueryProgress>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      getCollectiveCollectionNotifications(collectionId),
      getCollectiveCollectionNetworkQuery(collectionId),
    ])
      .then(([notifs, query]) => {
        setNotifications(notifs);
        setNetworkQuery(query);
      })
      .finally(() => setLoading(false));
  }, [open, collectionId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Collectieve medewerking</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <WorkOutlineIcon fontSize="small" color={employerFound ? "success" : "disabled"} />
            <Typography variant="body2">
              {employerFound
                ? `Werkgever gevonden binnen het netwerk${employerTenantName ? `: ${employerTenantName}` : ""}${
                    employerMatchedAt ? ` (${formatDate(employerMatchedAt)})` : ""
                  }`
                : "Nog geen werkgever gevonden binnen het CFSB-netwerk."}
            </Typography>
          </Stack>

          {networkQuery && (
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                Netwerkvraag: {NETWORK_QUERY_STATUS_LABELS[networkQuery.status] ?? networkQuery.status}
                {" — "}
                {networkQuery.answered}/{networkQuery.totalAsked} deelnemers hebben gereageerd
                {networkQuery.status === "OPEN"
                  ? ` (deadline ${formatDate(networkQuery.responseDeadline.toString())})`
                  : ""}
              </Typography>
            </Stack>
          )}
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Verzonden meldingen
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={28} />
          </Box>
        ) : notifications.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Nog geen meldingen verzonden.
          </Typography>
        ) : (
          <Stack divider={<Divider />} spacing={1.5}>
            {notifications.map((n) => (
              <Stack key={n.id} direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <PersonIcon fontSize="small" color="action" />
                  <Box>
                    <Typography variant="body2">
                      {RECIPIENT_LABELS[n.recipientType] ?? n.recipientType}
                      {n.recipientName ? ` — ${n.recipientName}` : ""}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {n.channel}
                      {n.sentAt ? ` · ${formatDate(n.sentAt.toString())} ${formatTime(n.sentAt.toString())}` : ""}
                    </Typography>
                  </Box>
                </Stack>
                <Chip
                  size="small"
                  label={n.status}
                  color={STATUS_COLORS[n.status] ?? "default"}
                  variant="outlined"
                />
              </Stack>
            ))}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
};
