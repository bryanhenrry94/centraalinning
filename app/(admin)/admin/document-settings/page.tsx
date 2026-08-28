"use client";

import { Alert, Container, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";

export default function AdminDocumentSettingsPage() {
  return (
    <Container maxWidth="md" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs
        items={[{ label: "CFSB Admin", href: "/admin" }, { label: "Document-/briefinstellingen" }]}
      />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Document-/briefinstellingen
        </Typography>
        <Alert severity="info">
          Deze pagina vereist eerst een systeem voor beheerbare document-/briefsjablonen. Vandaag
          zijn de PDF-documenten (Aanmaning, Sommatie, Ingebrekestelling, Blokkade, Vonnis, etc.)
          vaste React-componenten per module — er is nog geen scherm om hun inhoud of opmaak te
          bewerken zonder de code aan te passen. Dit vereist een apart ontwerptraject voordat het
          hier geïmplementeerd kan worden.
        </Alert>
      </Stack>
    </Container>
  );
}
