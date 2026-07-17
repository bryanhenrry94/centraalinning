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
      title: "1. BLOK-CHECK (BLC)",
      description:
        "Controleer uw (potentiële) klant op een geregistreerde blokkade binnen de CFSB-samenwerking.",
      color: "#1976d2",
      icon: SearchIcon,
      buttonText: "Blok-Check uitvoeren →",
      linkText: "📋 Blok-Check overzicht",
      // linkList: "/block-check",
      newLink: "/block-check",
    },
    {
      id: 2,
      title: "2. FINANCIËLE AFSPRAKEN REGISTREREN (FAR)",
      description:
        "Leg uw financiële afspraken centraal vast en bescherm uzelf en uw onderneming.",
      color: "#388e3c",
      icon: DescriptionIcon,
      buttonText: "Nieuwe financiële afspraak →",
      linkText: "📋 Mijn financiële afspraken",
      linkList: "/contracts",
      newLink: "/contracts/new",
    },
    {
      id: 3,
      title: "3. ADMINISTRATIEVE OPVOLGING (AOP)",
      description:
        "Start de administratieve opvolging wanneer de financiële afspraak niet wordt nagekomen.",
      color: "#f57c00",
      icon: DescriptionIcon,
      buttonText: "Nieuwe opvolging starten →",
      linkText: "📋 Mijn opvolgingen",
      linkList: "/collections",
      newLink: "/collections",
    },
    {
      id: 4,
      title: "4. BLOKKADE (BLK)",
      description:
        "Registreer een economische blokkade binnen de CFSB-samenwerking.",
      color: "#d32f2f",
      icon: LockIcon,
      buttonText: "Blokkade registreren →",
      linkText: "📋 Mijn blokkades",
      linkList: "/blocks",
      newLink: "/blocks/new",
    },
    {
      id: 5,
      title: "5. COLLECTIEVE INNING (COP)",
      description:
        "Benut de samenwerking tussen deelnemers voor betaling of een betalingsregeling.",
      color: "#7b1fa2",
      icon: GroupIcon,
      buttonText: "Collectieve inning starten →",
      linkText: "📋 Mijn collectieve inningen",
      linkList: "/collections",
      newLink: "/collections",
    },
    {
      id: 6,
      title: "6. GERECHTELIJKE OPVOLGING (GOP)",
      description:
        "Draag het dossier over aan een aangesloten advocaat of deurwaarder.",
      color: "#00897b",
      icon: GavelIcon,
      buttonText: "Gerechtelijke opvolging starten →",
      linkText: "📋 Mijn gerechtelijke dossiers",
      linkList: "/verdicts",
      newLink: "/verdicts/new",
    },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f5f5", py: 2 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: "bold" }}>
            CFSB Diensten
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{ color: "#666", fontSize: "16px" }}
          >
            Alle CFSB diensten op één scherm
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
