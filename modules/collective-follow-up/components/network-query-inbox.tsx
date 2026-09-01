"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Typography,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

import { formatDate } from "@/shared/utils/formatters";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import {
  getPendingNetworkQueriesForTenant,
  submitNetworkQueryResponse,
} from "@/modules/collective-follow-up/actions/collective-collection.actions";

type NetworkQueryRow = Awaited<ReturnType<typeof getPendingNetworkQueriesForTenant>>[number];

// Inbox de preguntas "¿Tiene a esta persona en su organización?" recibidas
// de la red — no muestra monto ni acreedor, solo nombre + número personal
// (CFSB-P/CFSB-B, ver CollectiveCollectionService.broadcastNetworkQuery). Cualquier staff
// del tenant puede responder; una vez respondida desaparece de este inbox.
export const NetworkQueryInbox: React.FC = () => {
  const { data: session } = useSession();
  const tenantId = session?.user?.tenant_id;

  const [queries, setQueries] = useState<NetworkQueryRow[]>([]);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const fetchQueries = useCallback(async () => {
    if (!tenantId) return;
    const data = await getPendingNetworkQueriesForTenant(tenantId);
    setQueries(data);
  }, [tenantId]);

  useEffect(() => {
    fetchQueries();
  }, [fetchQueries]);

  const handleAnswer = async (queryId: string, answer: "YES" | "NO") => {
    setSubmittingId(queryId);
    try {
      await submitNetworkQueryResponse({ queryId, answer });
      notifySuccess("Antwoord verzonden");
      setQueries((prev) => prev.filter((q) => q.queryId !== queryId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kon het antwoord niet verzenden";
      notifyError(message);
    } finally {
      setSubmittingId(null);
    }
  };

  if (queries.length === 0) return null;

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardHeader
        avatar={<HelpOutlineIcon color="action" />}
        title="Netwerkvragen"
        subheader="Andere deelnemers vragen of u deze personen kent"
      />
      <CardContent>
        <Stack spacing={2} divider={<Box sx={{ borderBottom: "1px solid", borderColor: "divider" }} />}>
          {queries.map((q) => (
            <Stack
              key={q.queryId}
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
              gap={1.5}
            >
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {q.displayName} ({q.personalNumber})
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Heeft u deze persoon binnen uw organisatie? Antwoord vóór{" "}
                  {formatDate(q.responseDeadline.toString())}.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  disabled={submittingId === q.queryId}
                  onClick={() => handleAnswer(q.queryId, "NO")}
                >
                  Nee
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  disabled={submittingId === q.queryId}
                  onClick={() => handleAnswer(q.queryId, "YES")}
                >
                  Ja
                </Button>
              </Stack>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};
