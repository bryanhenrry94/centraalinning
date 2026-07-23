"use client";

import { Box, Typography } from "@mui/material";
import { Check } from "@mui/icons-material";

const PRIMARY = "#0A3D91";
const ACCENT = "#F7931E";

interface SignupStepperProps {
  steps: string[];
  activeStep: number;
}

export const SignupStepper = ({ steps, activeStep }: SignupStepperProps) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: { xs: "flex-start", sm: "center" },
        gap: { xs: 2, sm: 4 },
        flexWrap: "wrap",
      }}
    >
      {steps.map((label, index) => {
        const completed = index < activeStep;
        const active = index === activeStep;

        return (
          <Box
            key={label}
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                bgcolor: completed || active ? ACCENT : "transparent",
                border: `2px solid ${completed || active ? ACCENT : "#d1d5db"}`,
                color: completed || active ? "white" : "#9ca3af",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {completed ? <Check sx={{ fontSize: 18 }} /> : index + 1}
            </Box>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: 15,
                color: completed || active ? PRIMARY : "#9ca3af",
              }}
            >
              {label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};
