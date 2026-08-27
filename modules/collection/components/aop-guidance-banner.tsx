"use client";

import { Alert, AlertTitle, Typography } from "@mui/material";

import { AopStep } from "@/modules/collection/services/collection.validators";
import { formatDate } from "@/shared/utils/formatters";

// Begeleide, korte tekst per AOP-stap (feedback sponsor, sectie 5: de
// deelnemer moet niet zelf een status-chip hoeven interpreteren — het
// systeem zegt met zoveel woorden wat er gebeurt en dat er niets van hem
// wordt verwacht). Alleen relevant zolang de stap nog automatisch loopt
// (REMINDER/FINAL_NOTICE/DEFAULT_NOTICE); BLK_NOTIFICATION krijgt zijn eigen
// tekst hieronder (AOP zonder oplossing afgerond).
const RUNNING_STEP_TITLES: Partial<Record<AopStep, string>> = {
  REMINDER: "Aanmaning actief",
  FINAL_NOTICE: "Sommatie actief",
  DEFAULT_NOTICE: "Ingebrekestelling actief",
};

const RUNNING_STEP_SENT_LABELS: Partial<Record<AopStep, string>> = {
  REMINDER: "Aanmaning verzonden.",
  FINAL_NOTICE: "Sommatie verzonden.",
  DEFAULT_NOTICE: "Ingebrekestelling verzonden.",
};

interface AopGuidanceBannerProps {
  aopStep: AopStep | null | undefined;
  stepDeadline?: Date | string | null;
  hasLegalProcess: boolean;
  hasCollectiveCollection: boolean;
}

export function AopGuidanceBanner({
  aopStep,
  stepDeadline,
  hasLegalProcess,
  hasCollectiveCollection,
}: AopGuidanceBannerProps) {
  // Zodra het dossier is doorgeschoven naar COP/GOP ligt de aandacht daar —
  // de eigen knop/pagina van dat dossier neemt het over (feedback sponsor,
  // punt 10: geen dubbele of verouderde begeleiding tonen).
  if (!aopStep || hasLegalProcess || hasCollectiveCollection) return null;

  if (aopStep === "BLK_NOTIFICATION") {
    return (
      <Alert severity="error" icon={<span>🔒</span>}>
        <AlertTitle sx={{ fontWeight: 700 }}>Economische blokkade actief</AlertTitle>
        <Typography variant="body2">
          Administratieve Opvolging zonder oplossing afgerond. Voor dit dossier is een
          economische blokkade actief.
        </Typography>
      </Alert>
    );
  }

  const title = RUNNING_STEP_TITLES[aopStep];
  const sentLabel = RUNNING_STEP_SENT_LABELS[aopStep];
  if (!title) return null;

  return (
    <Alert severity="info">
      <AlertTitle sx={{ fontWeight: 700 }}>{title}</AlertTitle>
      <Typography variant="body2">
        {sentLabel}
        {stepDeadline && ` Reactietermijn loopt tot ${formatDate(stepDeadline.toString())}.`}
      </Typography>
      <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>
        Geen actie vereist
      </Typography>
    </Alert>
  );
}
