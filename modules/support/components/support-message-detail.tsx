"use client";
import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { formatDate } from "@/shared/utils/formatters";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { AlertService } from "@/shared/ui/alerts";
import {
  getSupportMessageStatusInfo,
  getSupportMessageTypeLabel,
} from "@/modules/support/utils/support-status";
import { SupportMessageStatus } from "@/modules/support/constants/support-message";
import {
  markSupportMessageInProgress,
  closeSupportMessage,
} from "@/modules/support/actions/support.actions";
import { AnswerSupportDialog } from "@/modules/support/components/answer-support-dialog";

function InfoField({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ textTransform: "uppercase", letterSpacing: 0.4, display: "block" }}
      >
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value ?? "-"}
      </Typography>
    </Box>
  );
}

export interface SupportMessageDetailData {
  id: string;
  type: string;
  subject: string;
  caseReference?: string | null;
  message: string;
  senderName: string;
  senderEmail: string;
  senderRole: string;
  senderCfsbNumber?: string | null;
  status: string;
  originalName?: string | null;
  response?: string | null;
  respondedAt?: string | Date | null;
  createdAt: string | Date;
}

interface SupportMessageDetailProps {
  message: SupportMessageDetailData;
  canManage?: boolean;
  onUpdated?: () => void;
}

export const SupportMessageDetail: React.FC<SupportMessageDetailProps> = ({
  message,
  canManage,
  onUpdated,
}) => {
  const [answerOpen, setAnswerOpen] = useState(false);
  const statusInfo = getSupportMessageStatusInfo(message.status);

  const handleMarkInProgress = async () => {
    try {
      await markSupportMessageInProgress(message.id);
      notifySuccess("Bericht staat nu in behandeling");
      onUpdated?.();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Actie mislukt");
    }
  };

  const handleClose = async () => {
    const confirmed = await AlertService.showConfirm(
      "Weet je het zeker?",
      "Het bericht wordt gesloten.",
      "Ja, sluiten",
      "Annuleren",
    );
    if (!confirmed) return;

    try {
      await closeSupportMessage(message.id);
      notifySuccess("Bericht gesloten");
      onUpdated?.();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Actie mislukt");
    }
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {message.subject}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {getSupportMessageTypeLabel(message.type)}
            </Typography>
          </Box>
          <Chip label={statusInfo.label} color={statusInfo.color} />
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <InfoField label="Van" value={message.senderName} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <InfoField label="Rol" value={message.senderRole} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <InfoField label="CFSB-nummer" value={message.senderCfsbNumber ?? "-"} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <InfoField label="Datum" value={formatDate(new Date(message.createdAt).toISOString())} />
          </Grid>
          {message.caseReference && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <InfoField label="Dossier" value={message.caseReference} />
            </Grid>
          )}
        </Grid>

        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mb: message.originalName ? 2 : 0 }}>
          {message.message}
        </Typography>

        {message.originalName && (
          <Button
            component="a"
            href={`/api/support/${message.id}/attachment`}
            target="_blank"
            size="small"
            startIcon={<AttachFileIcon />}
          >
            {message.originalName}
          </Button>
        )}
      </Paper>

      {message.response && (
        <Paper sx={{ p: 3, bgcolor: "action.hover" }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Antwoord van CFSB
            {message.respondedAt
              ? ` — ${formatDate(new Date(message.respondedAt).toISOString())}`
              : ""}
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
            {message.response}
          </Typography>
        </Paper>
      )}

      {!message.response && message.status !== SupportMessageStatus.CLOSED && !canManage && (
        <Alert severity="info">CFSB heeft dit bericht nog niet beantwoord.</Alert>
      )}

      {canManage && message.status !== SupportMessageStatus.CLOSED && (
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {message.status === SupportMessageStatus.RECEIVED && (
              <Button variant="outlined" onClick={handleMarkInProgress}>
                In behandeling nemen
              </Button>
            )}
            <Button variant="contained" onClick={() => setAnswerOpen(true)}>
              Beantwoorden
            </Button>
            <Button variant="outlined" color="error" onClick={handleClose}>
              Sluiten
            </Button>
          </Stack>
        </Paper>
      )}

      <AnswerSupportDialog
        open={answerOpen}
        onClose={() => setAnswerOpen(false)}
        supportMessageId={message.id}
        onAnswered={() => onUpdated?.()}
      />
    </Stack>
  );
};

export default SupportMessageDetail;
