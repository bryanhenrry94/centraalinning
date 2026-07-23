"use client";

import { Box, Button, Link, Typography } from "@mui/material";
import {
  CheckCircle,
  MarkEmailUnreadOutlined,
  DescriptionOutlined,
  CreditCardOutlined,
  VerifiedOutlined,
} from "@mui/icons-material";
import { notifyInfo } from "@/shared/ui/notifications";

const PRIMARY = "#0A3D91";
const ACCENT = "#F7931E";

interface SuccessStepProps {
  onGoToAccount: () => void;
}

const nextSteps = [
  {
    icon: <MarkEmailUnreadOutlined sx={{ color: PRIMARY }} />,
    title: "1. Controleer uw e-mail",
    description: "Wij hebben een e-mail gestuurd met verdere instructies.",
  },
  {
    icon: <DescriptionOutlined sx={{ color: PRIMARY }} />,
    title: "2. Onderteken de CFSB-overeenkomst",
    description: "Onderteken digitaal de samenwerkingsovereenkomst.",
  },
  {
    icon: <CreditCardOutlined sx={{ color: PRIMARY }} />,
    title: "3. Betaal de registratiekosten",
    description:
      "Nadat wij uw betaling hebben ontvangen, wordt uw account geactiveerd.",
  },
  {
    icon: <VerifiedOutlined sx={{ color: PRIMARY }} />,
    title: "4. Account activeren",
    description:
      "U ontvangt een bevestiging zodra uw account actief is en u kunt inloggen.",
  },
];

export const SuccessStep = ({ onGoToAccount }: SuccessStepProps) => {
  const handleResend = () => {
    notifyInfo("Als het adres bestaat, is de e-mail opnieuw verzonden.");
  };

  return (
    <Box sx={{ textAlign: "center", maxWidth: 480, mx: "auto", py: 2 }}>
      <CheckCircle sx={{ fontSize: 80, color: "#22c55e", mb: 2 }} />

      <Typography variant="h5" sx={{ fontWeight: 700, color: PRIMARY }}>
        Registratie voltooid!
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 4 }}>
        Bedankt voor uw registratie bij CFSB.
      </Typography>

      <Box
        sx={{
          textAlign: "left",
          bgcolor: "#f7f8fa",
          border: "1px solid #ececec",
          borderRadius: 2,
          p: 3,
          mb: 4,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, color: "#16a34a", mb: 2 }}
        >
          Wat gebeurt er nu?
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          {nextSteps.map((step) => (
            <Box
              key={step.title}
              sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}
            >
              <Box sx={{ mt: 0.25 }}>{step.icon}</Box>
              <Box>
                <Typography sx={{ fontWeight: 700, color: PRIMARY }}>
                  {step.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {step.description}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      <Button
        fullWidth
        variant="contained"
        onClick={onGoToAccount}
        sx={{
          py: 1.5,
          bgcolor: PRIMARY,
          fontWeight: 600,
          textTransform: "none",
          "&:hover": { bgcolor: "#082f70" },
        }}
      >
        Naar mijn account →
      </Button>

      <Link
        component="button"
        type="button"
        onClick={handleResend}
        sx={{
          display: "inline-block",
          mt: 2,
          color: ACCENT,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        E-mail opnieuw verzenden
      </Link>
    </Box>
  );
};
