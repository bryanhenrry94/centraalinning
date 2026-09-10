"use client";

import { useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
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
      title: "Afspraak registreren (FAR)",
      description: "Registreer financiële afspraken centraal.",
      bgColor: "#EAF2FE",
      buttonColor: "#1450C4",
      buttonText: "Start FAR",
      linkList: "/financial-agreements",
      newLink: "/financial-agreements/new",
    },
    {
      id: 2,
      title: "Blok-Check (BLC)",
      description:
        "Controleer vooraf of een persoon of onderneming geregistreerd staat met een economische blokkade.",
      bgColor: "#FFF4E5",
      buttonColor: "primary.main",
      buttonText: "Start BLC",
      linkList: "/block-check",
      newLink: "/block-check",
    },
    {
      id: 3,
      title: "Administratieve Opvolging (AOP)",
      description: "Start administratieve opvolging.",
      bgColor: "#EAF2FE",
      buttonColor: "#1450C4",
      buttonText: "Start AOP",
      linkList: "/collections",
      newLink: "/collections",
    },
    {
      id: 4,
      title: "Blokkade (BLK)",
      description: "Start per direct een economische blokkade.",
      bgColor: "#FDECEC",
      buttonColor: "#D32F2F",
      buttonText: "Start BLK",
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
            return (
              <Grid size={{ xs: 12, md: 6, lg: 3 }} key={service.id}>
                <Card
                  elevation={0}
                  onClick={() => handleServiceClick(service.newLink || "#")}
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    cursor: "pointer",
                    bgcolor: service.bgColor,
                    borderRadius: 3,
                    border: "2px solid",
                    borderColor: service.buttonColor,
                    transition: "box-shadow .15s ease",
                    "&:hover": {
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent
                    sx={{
                      flexGrow: 1,
                      display: "flex",
                      flexDirection: "column",
                      p: 3,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 700, color: "secondary.main", mb: 1.5 }}
                    >
                      {service.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary", flexGrow: 1, mb: 3 }}
                    >
                      {service.description}
                    </Typography>
                    <Button
                      variant="contained"
                      fullWidth
                      size="small"
                      endIcon={<ArrowForwardIcon fontSize="small" />}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleServiceClick(service.newLink || "#");
                      }}
                      sx={{
                        // alignSelf: "flex-end",
                        bgcolor: service.buttonColor,
                        justifyContent: "space-between",
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: "0.8125rem",
                        px: 2,
                        py: 0.6,
                        "&:hover": {
                          bgcolor: service.buttonColor,
                          opacity: 0.9,
                        },
                      }}
                    >
                      {service.buttonText}
                    </Button>
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
