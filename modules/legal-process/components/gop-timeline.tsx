"use client";
import React from "react";
import { Box, Chip, Typography } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import SearchIcon from "@mui/icons-material/Search";
import DescriptionIcon from "@mui/icons-material/Description";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import BlockIcon from "@mui/icons-material/Block";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import GroupsIcon from "@mui/icons-material/Groups";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import CampaignIcon from "@mui/icons-material/Campaign";
import BusinessIcon from "@mui/icons-material/Business";
import ForumIcon from "@mui/icons-material/Forum";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PaymentIcon from "@mui/icons-material/Payment";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import SendIcon from "@mui/icons-material/Send";
import FlagIcon from "@mui/icons-material/Flag";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteIcon from "@mui/icons-material/Delete";
import SyncAltIcon from "@mui/icons-material/SyncAlt";
import InfoIcon from "@mui/icons-material/Info";
import { formatDate, formatTime } from "@/shared/utils/formatters";
import { getClaimTimelineForDebtClaim } from "@/modules/collection/actions/debt-claim.actions";
import { getTimelineEventLabel } from "@/modules/collection/utils/timeline-event";

interface GopTimelineProps {
  debtClaimId: string;
  refreshKey?: number;
}

type TimelineEntry = Awaited<
  ReturnType<typeof getClaimTimelineForDebtClaim>
>[number];
type TimelineTone = "info" | "success" | "warning" | "error";

// Kleurenpalet per toon — lichte achtergrond + verzadigde tekst/icoon-kleur
// voor info/warning/error, vol gevulde cirkel (witte icoon) voor success,
// zodat afgeronde/geaccepteerde mijlpalen in de tijdlijn opvallen.
const TONE_STYLES: Record<
  TimelineTone,
  { bg: string; fg: string; dotBg: string; dotFg: string }
> = {
  info: { bg: "#DBEAFE", fg: "#1D4ED8", dotBg: "#DBEAFE", dotFg: "#1D4ED8" },
  success: { bg: "#DCFCE7", fg: "#15803D", dotBg: "#16A34A", dotFg: "#FFFFFF" },
  warning: { bg: "#FFEDD5", fg: "#C2410C", dotBg: "#FFEDD5", dotFg: "#C2410C" },
  error: { bg: "#FEE2E2", fg: "#B91C1C", dotBg: "#FEE2E2", dotFg: "#B91C1C" },
};

const TIMELINE_EVENT_VISUAL: Record<
  string,
  { icon: React.ElementType; tone: TimelineTone }
> = {
  CLAIM_CREATED: { icon: PersonIcon, tone: "info" },
  CLAIM_UPDATED: { icon: EditIcon, tone: "info" },
  CLAIM_CLOSED: { icon: CheckCircleIcon, tone: "success" },
  CLAIM_CANCELLED: { icon: CancelIcon, tone: "error" },

  BLOCK_CHECK_PERFORMED: { icon: SearchIcon, tone: "info" },

  FAR_REGISTERED: { icon: DescriptionIcon, tone: "info" },
  FAR_COMPLETED: { icon: CheckCircleIcon, tone: "success" },

  AOP_STARTED: { icon: PlayArrowIcon, tone: "info" },
  AOP_STEP_COMPLETED: { icon: DescriptionIcon, tone: "info" },
  AOP_COMPLETED: { icon: CheckCircleIcon, tone: "success" },

  BLOCKADE_REGISTERED: { icon: BlockIcon, tone: "error" },
  BLOCKADE_RELEASED: { icon: LockOpenIcon, tone: "success" },

  COL_STARTED: { icon: GroupsIcon, tone: "warning" },
  COL_DEBTOR_NOTIFIED: { icon: NotificationsIcon, tone: "info" },
  COL_NETWORK_BROADCAST_SENT: { icon: CampaignIcon, tone: "info" },
  COL_EMPLOYER_FOUND: { icon: BusinessIcon, tone: "info" },
  COL_NEGOTIATION_CREATED: { icon: ForumIcon, tone: "info" },
  COL_NEGOTIATION_ACCEPTED: { icon: CheckCircleIcon, tone: "success" },
  COL_NEGOTIATION_REJECTED: { icon: CancelIcon, tone: "error" },
  COL_TRANSFERRED_TO_GOP: { icon: ArrowForwardIcon, tone: "info" },
  COL_CLOSED: { icon: CheckCircleIcon, tone: "success" },
  COL_COMPLETED: { icon: CheckCircleIcon, tone: "success" },

  PAYMENT_REGISTERED: { icon: PaymentIcon, tone: "success" },
  PAYMENT_VERIFIED: { icon: PaymentIcon, tone: "success" },
  PAYMENT_REJECTED: { icon: PaymentIcon, tone: "error" },

  AGREEMENT_CREATED: { icon: DescriptionIcon, tone: "info" },
  AGREEMENT_SIGNED: { icon: CheckCircleIcon, tone: "success" },
  AGREEMENT_BREACHED: { icon: WarningAmberIcon, tone: "error" },
  AGREEMENT_COMPLETED: { icon: CheckCircleIcon, tone: "success" },

  GOP_STARTED: { icon: ArrowForwardIcon, tone: "info" },
  LAWYER_ASSIGNED: { icon: CheckCircleIcon, tone: "success" },
  BAILIFF_ASSIGNED: { icon: SendIcon, tone: "info" },
  VERDICT_REGISTERED: { icon: DescriptionIcon, tone: "info" },
  GOP_COMPLETED: { icon: FlagIcon, tone: "success" },

  DOCUMENT_UPLOADED: { icon: UploadFileIcon, tone: "info" },
  DOCUMENT_UPDATED: { icon: DescriptionIcon, tone: "info" },
  DOCUMENT_DELETED: { icon: DeleteIcon, tone: "error" },

  NOTIFICATION_SENT: { icon: NotificationsIcon, tone: "info" },
  NOTIFICATION_DELIVERED: { icon: NotificationsActiveIcon, tone: "success" },
  NOTIFICATION_FAILED: { icon: NotificationsOffIcon, tone: "error" },

  STATUS_CHANGED: { icon: SyncAltIcon, tone: "info" },
  SERVICE_STARTED: { icon: PlayArrowIcon, tone: "info" },
  SERVICE_COMPLETED: { icon: CheckCircleIcon, tone: "success" },
};

const DEFAULT_TIMELINE_VISUAL = {
  icon: InfoIcon,
  tone: "info" as TimelineTone,
};

const GRID_TEMPLATE_COLUMNS = "140px minmax(260px, 1fr) 180px 200px";

export const GopTimeline: React.FC<GopTimelineProps> = ({
  debtClaimId,
  refreshKey,
}) => {
  const [entries, setEntries] = React.useState<TimelineEntry[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
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

  // De service levert nieuwste eerst (voor andere consumenten); hier willen
  // we de dossierhistorie chronologisch lezen, oudste bovenaan.
  const chronological = [...entries].reverse();

  return (
    <Box sx={{ overflowX: "auto" }}>
      <Box sx={{ minWidth: 700 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: GRID_TEMPLATE_COLUMNS,
            gap: 2,
            px: 2,
            py: 1,
            bgcolor: "grey.50",
            borderRadius: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            DATUM EN TIJD
          </Typography>
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            ACTIVITEIT
          </Typography>
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            UITGEVOERD DOOR
          </Typography>
          <Typography
            variant="caption"
            fontWeight={700}
            color="text.secondary"
            sx={{ textAlign: "center" }}
          >
            STATUS
          </Typography>
        </Box>

        {chronological.map((entry, index) => {
          const visual =
            TIMELINE_EVENT_VISUAL[entry.event] ?? DEFAULT_TIMELINE_VISUAL;
          const tone = TONE_STYLES[visual.tone];
          const Icon = visual.icon;
          const isLast = index === chronological.length - 1;
          const label = getTimelineEventLabel(entry.event);
          const actor =
            entry.createdBy?.fullname || entry.createdBy?.email || "CFSB";

          return (
            <Box key={entry.id} sx={{ display: "flex" }}>
              <Box
                sx={{
                  width: 40,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    bgcolor: tone.dotBg,
                    color: tone.dotFg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon sx={{ fontSize: 18 }} />
                </Box>
                {!isLast && (
                  <Box
                    sx={{ flexGrow: 1, width: 2, bgcolor: "divider", my: 0.5 }}
                  />
                )}
              </Box>

              <Box
                sx={{
                  flexGrow: 1,
                  display: "grid",
                  gridTemplateColumns: GRID_TEMPLATE_COLUMNS,
                  gap: 2,
                  pb: 3,
                  pt: 0.25,
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={700}>
                    {formatDate(entry.createdAt.toString())}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatTime(entry.createdAt.toString())}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" fontWeight={700}>
                    {label}
                  </Typography>
                  {entry.description && (
                    <Typography variant="caption" color="text.secondary">
                      {entry.description}
                    </Typography>
                  )}
                </Box>

                <Typography variant="body2" sx={{ alignSelf: "center" }}>
                  {actor}
                </Typography>

                <Box
                  sx={{
                    alignSelf: "center",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <Chip
                    size="small"
                    label={label}
                    sx={{
                      bgcolor: tone.bg,
                      color: tone.fg,
                      fontWeight: 700,
                      width: 200,
                    }}
                  />
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
