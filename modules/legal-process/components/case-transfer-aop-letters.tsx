"use client";

import React, { useEffect, useState } from "react";
import { Stack, Typography, Button } from "@mui/material";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";

import { getAopStepsForClaim } from "@/modules/collection/actions/collection-notification.actions";
import { formatDate } from "@/shared/utils/formatters";

type LetterType = "aanmaning" | "sommatie" | "ingebrekestelling" | "blokkade";

// AOPStep (prisma/schema.prisma) → brief die de debiteur tijdens de
// administratieve opvolging heeft ontvangen. 1:1 met de 4 stappen van de
// AOP-keten (zie CLAUDE.md): REMINDER/FINAL_NOTICE/DEFAULT_NOTICE zijn de
// eigen brieven van deze case, BLK_NOTIFICATION triggert de Blokkade-brief.
const LETTERS: { type: LetterType; label: string; step: string }[] = [
  { type: "aanmaning", label: "Aanmaning", step: "REMINDER" },
  { type: "sommatie", label: "Sommatie", step: "FINAL_NOTICE" },
  {
    type: "ingebrekestelling",
    label: "Ingebrekestelling",
    step: "DEFAULT_NOTICE",
  },
  { type: "blokkade", label: "Blokkade", step: "BLK_NOTIFICATION" },
];

interface CaseTransferAopLettersProps {
  caseTransferId: string;
  debtClaimId: string;
}

// Laat de advocaat/deurwaarder alle brieven downloaden die de debiteur
// tijdens de AOP heeft ontvangen (Aanmaning/Sommatie/Ingebrekestelling/
// Blokkade) — on-demand gegenereerd via app/api/legal-processes/transfers/
// [id]/letters/[type], nooit vooraf opgeslagen. Enkel de stappen die
// daadwerkelijk verzonden zijn (sentAt) krijgen een actieve downloadknop.
export const CaseTransferAopLetters: React.FC<CaseTransferAopLettersProps> = ({
  caseTransferId,
  debtClaimId,
}) => {
  const [sentAtByStep, setSentAtByStep] = useState<Record<string, Date | null>>(
    {},
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getAopStepsForClaim(debtClaimId)
      .then((steps) => {
        if (cancelled) return;
        const map: Record<string, Date | null> = {};
        steps.forEach((s) => {
          map[s.step] = s.sentAt;
        });
        setSentAtByStep(map);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debtClaimId]);

  if (loading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Brieven laden...
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5}>
      {LETTERS.map(({ type, label, step }) => {
        const sentAt = sentAtByStep[step];
        return (
          <Stack
            key={type}
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={1}
            sx={{
              p: 1.5,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <Stack>
              <Typography variant="body2" fontWeight={600}>
                {label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {sentAt
                  ? `Verzonden op ${formatDate(sentAt.toString())}`
                  : "Nog niet verzonden"}
              </Typography>
            </Stack>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadOutlinedIcon fontSize="small" />}
              disabled={!sentAt}
              onClick={() =>
                window.open(
                  `/api/legal-processes/transfers/${caseTransferId}/letters/${type}`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              Downloaden
            </Button>
          </Stack>
        );
      })}
    </Stack>
  );
};
