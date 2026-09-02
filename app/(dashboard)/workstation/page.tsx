"use client";

import { useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Stack,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DescriptionIcon from "@mui/icons-material/Description";
import LockIcon from "@mui/icons-material/Lock";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import { UserRole } from "@/shared/constants/user-role";

export default function WorkstationPage() {
  const router = useRouter();
  const { user } = useAuthSession();

  // El alguacil ni el abogado tienen acceso a las diensten pre-judiciales:
  // si llegan por URL directa, se los redirige en vez de mostrarles el panel.
  useEffect(() => {
    if (
      user?.roles.includes(UserRole.BAILIFF) ||
      user?.roles.includes(UserRole.LAWYER)
    ) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const handleServiceClick = (link: string) => {
    router.push(link);
  };

  // Solo estos 4 son servicios que el participante inicia por su cuenta.
  // COP y la transferencia de expediente ya no son "servicios" de esta
  // pantalla: son acciones de seguimiento sobre un expediente existente que
  // CFSB ofrece automáticamente cuando AOP/BLK no dio solución (ver el botón
  // "Collectieve Opvolging starten"/"Dossieroverdracht" en
  // app/(dashboard)/collections/[id]/page.tsx, ya gateado server-side por
  // CollectiveCollectionService.canStart / CaseTransferService.requestTransfer).
  // GOP tampoco pertenece acá: solo se activa cuando un deurwaarder registra
  // un vonnis, nunca por elección directa del participante.
  const services = [
    {
      id: 1,
      title: "Financiële Afspraken Registreren (FAR)",
      description:
        "Registreer financiële afspraken centraal en creëer duidelijkheid tussen betrokken partijen.",
      color: "#388e3c",
      icon: DescriptionIcon,
      buttonText: "Nieuwe financiële afspraak →",
      linkText: "📋 Mijn financiële afspraken",
      linkList: "/contracts/new",
      newLink: "/contracts/new",
    },
    {
      id: 2,
      title: "Blok-Check (BLC)",
      description:
        "Controleer vooraf of een persoon of onderneming geregistreerd staat met een economische blokkade.",
      color: "#1976d2",
      icon: SearchIcon,
      buttonText: "Blok-Check uitvoeren →",
      linkText: "📋 Blok-Check overzicht",
      linkList: "/block-check",
      newLink: "/block-check",
    },
    {
      id: 3,
      title: "Administratieve Opvolging (AOP)",
      description: "Start administratieve opvolging.",
      color: "#f57c00",
      icon: DescriptionIcon,
      buttonText: "Nieuwe opvolging starten →",
      linkText: "📋 Mijn opvolgingen",
      linkList: "/collections",
      newLink: "/collections",
    },
    {
      id: 4,
      title: "Blokkade (BLK)",
      description: "Start per direct een economische blokkade.",
      color: "#d32f2f",
      icon: LockIcon,
      buttonText: "Blokkade registreren →",
      linkText: "📋 Mijn blokkades",
      linkList: "/blocks",
      // Directe toegang tot het registratieformulier — vanaf daar kan de
      // gebruiker via een knop alsnog naar het overzicht (/blocks), in
      // plaats van dat de dienst je eerst naar het overzicht stuurt.
      newLink: "/blocks/new",
    },
  ];

  return (
    <Box>
      <Container
        maxWidth="lg"
        disableGutters
        sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
      >
        {/* Header */}
        <Box
          sx={{
            mb: { xs: 2, sm: 6 },
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              Diensten
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{ color: "#666", fontSize: "16px" }}
            >
              Selecteer de diensten waarmee u wilt beginnen.
            </Typography>
          </Box>
        </Box>

        {/* Grid of Services */}
        <Grid container spacing={3} mb={3}>
          {services.map((service) => {
            const IconComponent = service.icon;
            return (
              <Grid size={{ xs: 12, md: 6, lg: 3 }} key={service.id}>
                <Card
                  onClick={() => handleServiceClick(service.newLink || "#")}
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    cursor: "pointer",
                    borderTop: `4px solid ${service.color}`,
                    transition: "box-shadow .15s ease",
                    "&:hover": {
                      boxShadow: 6,
                    },
                  }}
                >
                  <CardContent
                    sx={{
                      flexGrow: 1,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={2}
                      sx={{ mb: 2, alignItems: "center" }}
                    >
                      <Avatar
                        sx={{
                          width: 48,
                          height: 48,
                          bgcolor: service.color,
                        }}
                      >
                        <IconComponent sx={{ fontSize: 24 }} />
                      </Avatar>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: "bold", color: service.color }}
                      >
                        {service.title}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: "#666" }}>
                      {service.description}
                    </Typography>
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
