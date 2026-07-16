"use client";

import { Box, Container, Typography } from "@mui/material";

import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
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
  const { title, subtitle } = PAGE_CONFIG[filter];

  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 4 }, mb: 4 }}>
      <AppBreadcrumbs items={[{ label: title }]} />

      <Box sx={{ width: "100%", mb: 3 }}>
        <Typography
          fontWeight={700}
          sx={{ fontSize: { xs: "1.125rem", sm: "1.5rem" } }}
        >
          {`${title} (${documents.length})`}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "justify" }}
        >
          {subtitle}
        </Typography>
      </Box>

      <LatestDocumentsTable rows={documents} paginated />
    </Container>
  );
}
