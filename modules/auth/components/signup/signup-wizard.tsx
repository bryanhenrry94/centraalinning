"use client";

import { useState } from "react";
import { Box, Paper, Step, StepLabel, Stepper } from "@mui/material";
import LogoComponent from "@/shared/ui/logo-app";
import { IslandStep } from "./island-step";
import { PlanStep } from "./plan-step";
import { DetailsStep } from "./details-step";
import { STEP_SECTION_GAP } from "./layout.constants";

const steps = ["Eiland", "Plan", "Gegevens"];

export const SignupWizard = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [country, setCountry] = useState("");
  const [planId, setPlanId] = useState("");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">(
    "MONTHLY",
  );

  const handleSelectIsland = (code: string) => {
    setCountry(code);
    setActiveStep(1);
  };

  const handleSelectPlan = (id: string) => {
    setPlanId(id);
    setActiveStep(2);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f7f8fa",
        py: { xs: 3, md: 6 },
        px: 2,
      }}
    >
      <Box sx={{ maxWidth: 1240, mx: "auto" }}>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
          <Box sx={{ width: 120, height: 60 }}>
            <LogoComponent />
          </Box>
        </Box>

        <Paper
          elevation={0}
          sx={{
            width: "100%",
            borderRadius: 4,
            bgcolor: "white",
            border: "1px solid #ececec",
            p: { xs: 3, md: 5 },
          }}
        >
          <Stepper activeStep={activeStep} sx={{ mb: STEP_SECTION_GAP }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {activeStep === 0 && (
            <IslandStep value={country} onSelect={handleSelectIsland} />
          )}

          {activeStep === 1 && (
            <PlanStep
              billingCycle={billingCycle}
              onChangeBillingCycle={setBillingCycle}
              onSelect={handleSelectPlan}
              onBack={() => setActiveStep(0)}
            />
          )}

          {activeStep === 2 && (
            <DetailsStep
              country={country}
              planId={planId}
              billingCycle={billingCycle}
              onBack={() => setActiveStep(1)}
            />
          )}
        </Paper>
      </Box>
    </Box>
  );
};
