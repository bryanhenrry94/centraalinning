"use client";

import {
  Alert,
  Box,
  Card,
  CardContent,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";

// "verwerken" (schuift dossiers actief door de workflow) krijgt de blauwe
// toon, "controleren" (bewakende/periodieke check) de oranje merktoon — geen
// vaste kleur per job, maar een vaste kleur per soort taak.
const JOBS = [
  {
    route: "/api/jobs/process-aop-workflow",
    label: "AOP-workflow verwerken",
    description:
      "Verwerkt AOP-dossiers automatisch door de stappen Aanmaning → Sommatie → Ingebrekestelling → Blokkade.",
    icon: SettingsOutlinedIcon,
    tone: "secondary" as const,
  },
  {
    route: "/api/jobs/check-gop-deadlines",
    label: "GOP-termijnen controleren",
    description:
      "Controleert termijnen en administratieve opvolging binnen actieve GOP-dossiers.",
    icon: DescriptionOutlinedIcon,
    tone: "primary" as const,
  },
  {
    route: "/api/jobs/check-blockade-reactivation",
    label: "Blokkade-reactivering controleren",
    description:
      "Reactiveert economische blokkades die opnieuw van toepassing zijn.",
    icon: LockOutlinedIcon,
    tone: "primary" as const,
  },
  {
    route: "/api/jobs/check-case-transfer-deadlines",
    label: "Overdrachtstermijnen controleren",
    description:
      "Stuurt herinneringen voor dossieroverdrachten die nog niet geaccepteerd zijn.",
    icon: SwapHorizOutlinedIcon,
    tone: "primary" as const,
  },
  {
    route: "/api/jobs/check-cop-employer-matches",
    label: "COP-werkgeverkoppelingen controleren",
    description:
      "Verwerkt het verstrijken van netwerkvragen aan mogelijke werkgevers.",
    icon: GroupOutlinedIcon,
    tone: "primary" as const,
  },
];

export default function AdminSystemControlPage() {
  return (
    <Container
      maxWidth="md"
      disableGutters
      sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
    >
      <AppBreadcrumbs
        items={[
          { label: "CFSB Admin", href: "/admin" },
          { label: "Systeemprocescontrole" },
        ]}
      />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Systeemprocescontrole
        </Typography>
        <Alert severity="info">
          Deze pagina toont automatische systeemtaken die op de achtergrond
          worden uitgevoerd.
        </Alert>
        <Stack spacing={2}>
          {JOBS.map((job) => (
            <Card key={job.route} variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      flexShrink: 0,
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: (theme) =>
                        alpha(theme.palette[job.tone].main, 0.12),
                      color: (theme) => theme.palette[job.tone].main,
                    }}
                  >
                    <job.icon fontSize="medium" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {job.label}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {job.description}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 1, fontFamily: "monospace" }}
                    >
                      {job.route}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
