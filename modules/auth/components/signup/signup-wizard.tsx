"use client";

import { useState } from "react";
import { Box, Paper, Step, StepLabel, Stepper } from "@mui/material";
import LogoComponent from "@/shared/ui/logo-app";
import { IslandStep } from "./island-step";
import { PlanStep } from "./plan-step";
import { DetailsStep } from "./details-step";
import { SignupSidePanel } from "./signup-side-panel";

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
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        bgcolor: "#f5f5f5",
      }}
    >
      {/* LEFT SIDE */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          p: 2,
          overflow: "hidden",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 680,
            height: "100%",
            borderRadius: 4,
            bgcolor: "white",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: "1px solid #ececec",
          }}
        >
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              px: 4,
              py: 4,

              "&::-webkit-scrollbar": {
                width: 6,
              },

              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "#d1d5db",
                borderRadius: 10,
              },
            }}
          >
            <Box
              sx={{
                py: 2,
                ml: -1,
                mb: 2,
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <Box sx={{ width: 100, height: 50 }}>
                <LogoComponent />
              </Box>
            </Box>

            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
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
          </Box>
        </Paper>
      </Box>

      {/* RIGHT SIDE */}
      <SignupSidePanel islandCode={country || undefined} />
    </Box>
  );
};
