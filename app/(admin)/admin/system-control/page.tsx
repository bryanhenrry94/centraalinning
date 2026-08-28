"use client";

import { Alert, Card, CardContent, Container, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";

const JOBS = [
  {
    route: "/api/jobs/process-aop-workflow",
    label: "AOP-workflow verwerken",
    description: "Schuift AOP-dossiers automatisch door de stappen Aanmaning → Sommatie → Ingebrekestelling → Blokkade.",
  },
  {
    route: "/api/jobs/check-gop-deadlines",
    label: "GOP-termijnen controleren",
    description: "Controleert vervaldata binnen lopende gerechtelijke procedures.",
  },
  {
    route: "/api/jobs/check-blockade-reactivation",
    label: "Blokkade-reactivering controleren",
    description: "Reactiveert economische blokkades die opnieuw van toepassing zijn.",
  },
  {
    route: "/api/jobs/check-case-transfer-deadlines",
    label: "Overdrachtstermijnen controleren",
    description: "Stuurt herinneringen voor dossieroverdrachten die nog niet geaccepteerd zijn.",
  },
  {
    route: "/api/jobs/check-cop-employer-matches",
    label: "COP-werkgeverkoppelingen controleren",
    description: "Verwerkt het verstrijken van netwerkvragen aan mogelijke werkgevers.",
  },
];

export default function AdminSystemControlPage() {
  return (
    <Container maxWidth="md" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "CFSB Admin", href: "/admin" }, { label: "Systeem-/procescontrole" }]} />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Systeem-/procescontrole
        </Typography>
        <Alert severity="info">
          Deze pagina is informatief. Er is nog geen tabel die de uitvoeringsgeschiedenis van de
          onderstaande cron-jobs bijhoudt (geslaagd/mislukt/laatste run) — dat vereist een aparte
          job-logtabel en is niet onderdeel van deze bouwronde. De jobs zelf draaien al
          automatisch, extern getriggerd met een beveiligd token.
        </Alert>
        <Stack spacing={2}>
          {JOBS.map((job) => (
            <Card key={job.route} variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700}>
                  {job.label}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {job.description}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 1, fontFamily: "monospace" }}
                >
                  {job.route}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
