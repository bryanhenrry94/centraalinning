"use client";

import { Box, Button, Card, CardActionArea, Typography } from "@mui/material";
import {
  AccountBalance,
  Balance,
  ChevronRight,
  Gavel,
  Groups,
  Lock,
} from "@mui/icons-material";
import { UserRole } from "@/shared/constants/user-role";
import { STEP_HEADER_GAP, STEP_SECTION_GAP } from "./layout.constants";

const PRIMARY = "#0A3D91";
const ACCENT = "#F7931E";

// El tipo de registro determina el rol de cuenta (UserRole) y por lo tanto
// qué planes se muestran en el siguiente paso (ver PlanStep / Plan.target_role).
const REGISTRATION_TYPES = [
  {
    role: UserRole.TENANT_ADMIN,
    label: "Deelnemer",
    icon: <Groups />,
  },
  {
    role: UserRole.LAWYER,
    label: "Advocaat",
    icon: <Balance />,
  },
  {
    role: UserRole.BAILIFF,
    label: "Deurwaarder",
    icon: <Gavel />,
  },
  {
    role: UserRole.BANK,
    label: "Bank",
    icon: <AccountBalance />,
  },
] as const;

interface RegistrationTypeStepProps {
  value: string;
  onSelect: (role: string) => void;
  onBack: () => void;
}

export const RegistrationTypeStep = ({
  value,
  onSelect,
  onBack,
}: RegistrationTypeStepProps) => {
  return (
    <Box sx={{ width: "100%", maxWidth: 560, mx: "auto" }}>
      <Typography
        variant="h5"
        sx={{ fontWeight: 700, color: PRIMARY, mb: STEP_HEADER_GAP }}
      >
        Ik registreer mij als
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: STEP_SECTION_GAP }}
      >
        Kies de rol die het beste bij uw organisatie past. Hiermee bepalen we
        welke registratieplannen we u tonen.
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 4 }}>
        {REGISTRATION_TYPES.map(({ role, label, icon }) => {
          const selected = role === value;

          return (
            <Card
              key={role}
              elevation={0}
              sx={{
                border: selected ? `2px solid ${ACCENT}` : "1px solid #e5e7eb",
                borderRadius: "12px",
                bgcolor: selected ? "rgba(247, 147, 30, 0.06)" : "white",
                boxShadow: "0 2px 10px rgba(10, 61, 145, 0.06)",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  boxShadow: "0 8px 24px rgba(10, 61, 145, 0.14)",
                },
              }}
            >
              <CardActionArea
                onClick={() => onSelect(role)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 2.5,
                  py: 2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      color: selected ? ACCENT : PRIMARY,
                      display: "flex",
                    }}
                  >
                    {icon}
                  </Box>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: selected ? ACCENT : PRIMARY,
                    }}
                  >
                    {label}
                  </Typography>
                </Box>

                <ChevronRight sx={{ color: selected ? ACCENT : "#9ca3af" }} />
              </CardActionArea>
            </Card>
          );
        })}
      </Box>

      <Button
        variant="outlined"
        onClick={onBack}
        sx={{
          py: 1.25,
          px: 3,
          fontWeight: 600,
          textTransform: "none",
        }}
      >
        ← Terug
      </Button>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.75,
          mt: 2,
        }}
      >
        <Lock sx={{ fontSize: 14, color: "text.secondary" }} />
        <Typography variant="caption" color="text.secondary">
          Uw gegevens zijn veilig bij CFSB
        </Typography>
      </Box>
    </Box>
  );
};
