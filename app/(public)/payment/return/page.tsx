"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Stack,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import HourglassBottomRoundedIcon from "@mui/icons-material/HourglassBottomRounded";
import Image from "next/image";

const brandBlue = "#1E2A78";
const brandTeal = "#3FB7AD"; // parecido al fondo Sentoo
const brandOrange = "#824F04"; // "#F59E0B";

function ReturnPageContent() {
  const status = useSearchParams().get("status");

  let title = "Procesando pago";
  let subtitle = "Tu pago está siendo verificado";
  let color = brandOrange;
  let badgeBg = "#FEF3C7";
  let Icon = HourglassBottomRoundedIcon;

  if (status === "success") {
    title = "Pago exitoso";
    subtitle = "Gracias. Tu pago fue recibido correctamente.";
    color = "#2B660F";
    badgeBg = "#B4F099";
    Icon = CheckCircleRoundedIcon;
  } else if (status === "failed") {
    title = "Pago fallido";
    subtitle = "No se pudo completar la transacción.";
    color = "#EF4444";
    badgeBg = "#FEE2E2";
    Icon = ErrorRoundedIcon;
  } else if (status === "cancelled") {
    title = "Pago cancelado";
    subtitle = "El pago fue cancelado por el usuario.";
    color = "#EF4444";
    badgeBg = "#FEE2E2";
    Icon = ErrorRoundedIcon;
  } else if (status === "expired") {
    title = "Pago expirado";
    subtitle = "El tiempo para completar el pago se agotó.";
    color = "#EF4444";
    badgeBg = "#FEE2E2";
    Icon = ErrorRoundedIcon;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "#A2B5E7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 520,
          width: "100%",
          borderRadius: "28px",
          boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
          backgroundColor: "#fff",
          overflow: "hidden",
        }}
      >
        <CardContent sx={{ p: 5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 4 }}>
            <Image
              src="/static/logo.png"
              alt="CFSB"
              height={48}
              width={140}
            />

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Icon sx={{ color, fontSize: 28 }} />
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: 18,
                  color: "#1F2937",
                }}
              >
                {title}
              </Typography>
            </Stack>
          </Box>
          <Stack spacing={4} alignItems="center">
            {/* Message box (tipo Sentoo) */}
            <Box
              sx={{
                width: "100%",
                backgroundColor: badgeBg,
                borderRadius: "14px",
                border: `1px solid ${color}55`,
                p: 3,
              }}
            >
              <Typography
                sx={{
                  color,
                  fontWeight: 500,
                  textAlign: "center",
                  fontSize: 16,
                }}
              >
                {subtitle}
              </Typography>
            </Box>

            <Typography
              variant="body2"
              sx={{ color: "#6B7280", textAlign: "center", fontSize: 14 }}
            >
              Puedes cerrar esta ventana o volver a CFSB.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

export default function ReturnPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            minHeight: "100vh",
            background: `linear-gradient(135deg, ${brandTeal} 0%, ${brandBlue} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress sx={{ color: brandOrange }} />
        </Box>
      }
    >
      <ReturnPageContent />
    </Suspense>
  );
}
