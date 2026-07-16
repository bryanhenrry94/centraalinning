"use client";

import { Box, Container, IconButton, Stack, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { useRouter } from "next/navigation";

import { LatestDocumentsTable } from "./LatestDocumentsTable";
import { TableSummaryResponse } from "../types/report.types";

type DocumentPageFilter = "open" | "completed";

interface DocumentContentProps {
  documents: TableSummaryResponse[];
  filter: DocumentPageFilter;
}

const PAGE_CONFIG: Record<
  DocumentPageFilter,
  { title: string; subtitle: string }
> = {
  open: {
    title: "Openstaande dossiers",
    subtitle:
      "Alle open documenten uit financiele afspraken, administratieve opvolging en gerechtelijke opvolging.",
  },
  completed: {
    title: "Afgeronde dossiers",
    subtitle:
      "Alle afgeronde documenten waarvoor de schuldenaar alle betalingen heeft voldaan.",
  },
};

export default function DocumentContent({
  documents,
  filter,
}: DocumentContentProps) {
  const router = useRouter();
  const { title, subtitle } = PAGE_CONFIG[filter];

  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 4 }, mb: 4 }}>
      <Stack direction="row" spacing={1} alignItems="flex-start" mb={3}>
        <IconButton
          onClick={() => router.push("/dashboard")}
          edge="start"
          sx={{ mt: 0.5 }}
        >
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            fontWeight={700}
            sx={{ fontSize: { xs: "1.125rem", sm: "1.5rem" } }}
          >
            {`${title} (${documents.length})`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
      </Stack>

      <LatestDocumentsTable rows={documents} paginated />
    </Container>
  );
}
