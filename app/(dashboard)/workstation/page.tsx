"use client";

import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  Link as MuiLink,
  Stack,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DescriptionIcon from "@mui/icons-material/Description";
import LockIcon from "@mui/icons-material/Lock";
import GroupIcon from "@mui/icons-material/Group";
import GavelIcon from "@mui/icons-material/Gavel";
import { useRouter } from "next/navigation";

export default function WorkstationPage() {
  const router = useRouter();

  const handleServiceClick = (link: string) => {
    router.push(link);
  };

  const services = [
    {
      id: 1,
      title: "1. Blok-Check (BLC)",
      description:
        "Controleer vooraf of een persoon of onderneming geregistreerd staat met een economische blokkade.",
      color: "#1976d2",
      icon: SearchIcon,
      buttonText: "Blok-Check uitvoeren →",
      linkText: "📋 Blok-Check overzicht",
      // linkList: "/block-check",
      newLink: "/block-check",
    },
    {
      id: 2,
      title: "2. Financiële Afspraken Registreren (FAR)",
      description:
        "Registreer financiële afspraken centraal en creëer duidelijkheid tussen betrokken partijen.",
      color: "#388e3c",
      icon: DescriptionIcon,
      buttonText: "Nieuwe financiële afspraak →",
      linkText: "📋 Mijn financiële afspraken",
      linkList: "/contracts",
      newLink: "/contracts/new",
    },
    {
      id: 3,
      title: "3. Administratieve Opvolging (AOP)",
      description:
        "Start administratieve opvolging wanneer een financiële afspraak niet wordt nagekomen.",
      color: "#f57c00",
      icon: DescriptionIcon,
      buttonText: "Nieuwe opvolging starten →",
      linkText: "📋 Mijn opvolgingen",
      linkList: "/collections",
      newLink: "/collections",
    },
    {
      id: 4,
      title: "4. Blokkade (BLK)",
      description:
        "Registreer een economische blokkade volgens de geldende voorwaarden.",
      color: "#d32f2f",
      icon: LockIcon,
      buttonText: "Blokkade registreren →",
      linkText: "📋 Mijn blokkades",
      linkList: "/blocks",
      newLink: "/blocks/new",
    },
    {
      id: 5,
      title: "5. Collectieve Opvolging (COP)",
      description:
        "Start een collectieve opvolging om een betaling of betalingsregeling te realiseren en gerechtelijke opvolging zoveel mogelijk te voorkomen.",
      color: "#7b1fa2",
      icon: GroupIcon,
      buttonText: "Collectieve Opvolging starten →",
      linkText: "📋 Mijn collectieve opvolging",
      linkList: "/collections",
      newLink: "/collections",
    },
    {
      id: 6,
      title: "6. Gerechtelijke Opvolging (GOP)",
      description:
        "Draag het dossier over aan een aangesloten advocaat of deurwaarder voor verdere gerechtelijke opvolging.",
      color: "#00897b",
      icon: GavelIcon,
      buttonText: "Dossier kiezen om over te dragen →",
      linkText: "📋 Mijn gerechtelijke dossiers",
      linkList: "/legal-processes",
      newLink: "/collections",
    },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f5f5" }}>
      <Container
        maxWidth="lg"
        disableGutters
        sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
      >
        {/* Header */}
        <Box sx={{ mb: { xs: 2, sm: 4 } }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            Diensten
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{ color: "#666", fontSize: "16px" }}
          >
            Alle Diensten op één scherm
          </Typography>
        </Box>

        {/* Grid of Services */}
        <Grid container spacing={3} mb={3}>
          {services.map((service) => {
            const IconComponent = service.icon;
            return (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={service.id}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    borderTop: `4px solid ${service.color}`,
                    "&:hover": {
                      boxShadow: 6,
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Stack
                      direction="row"
                      spacing={2}
                      sx={{ mb: 2, alignItems: "center" }}
                    >
                      <Avatar
                        sx={{
                          width: 64,
                          height: 64,
                          bgcolor: service.color,
                        }}
                      >
                        <IconComponent sx={{ fontSize: 32 }} />
                      </Avatar>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: "bold", color: service.color }}
                      >
                        {service.title}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: "#666", mb: 3 }}>
                      {service.description}
                    </Typography>
                    <Stack spacing={2}>
                      <Button
                        fullWidth
                        variant="contained"
                        sx={{
                          bgcolor: service.color,
                          "&:hover": {
                            bgcolor: service.color,
                            opacity: 0.9,
                          },
                          // textTransform: "none",
                        }}
                        onClick={() => {
                          handleServiceClick(service.newLink || "#");
                        }}
                      >
                        {service.buttonText}
                      </Button>
                      {service.linkList && (
                        <MuiLink
                          href={service.linkList}
                          sx={{
                            fontSize: "0.875rem",
                            fontWeight: "bold",
                            color: service.color,
                            textDecoration: "none",
                            "&:hover": {
                              textDecoration: "underline",
                            },
                          }}
                        >
                          {service.linkText}
                        </MuiLink>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
}
