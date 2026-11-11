"use client";

import { useEffect, useState } from "react";
import { Box, Paper } from "@mui/material";
import LogoComponent from "@/shared/ui/logo-app";
import useClientRouter from "@/shared/hooks/useNavigations";
import { IslandStep } from "./island-step";
import { RegistrationTypeStep } from "./registration-type-step";
import { PlanStep } from "./plan-step";
import { DetailsStep } from "./details-step";
import { SuccessStep } from "./success-step";
import { SignupStepper } from "./signup-stepper";
import { STEP_SECTION_GAP } from "./layout.constants";
import { getActiveJurisdictions } from "@/modules/jurisdiction/actions/jurisdiction.actions";

const steps = ["Eiland", "Registratierol", "Plan", "Gegevens"];

export const SignupWizard = () => {
  const { redirectToLoginCompany } = useClientRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [country, setCountry] = useState("");
  const [registrationRole, setRegistrationRole] = useState("");
  const [planId, setPlanId] = useState("");
  const [planName, setPlanName] = useState("");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">(
    "MONTHLY",
  );
  // Islas seleccionables: solo las activas en Jurisdiction (dato), nunca un
  // array hardcodeado en el código — hoy solo Bonaire, según el orden de
  // implementación acordado (punto 13 del análisis CFSB).
  const [jurisdictions, setJurisdictions] = useState<
    Awaited<ReturnType<typeof getActiveJurisdictions>>
  >([]);

  useEffect(() => {
    getActiveJurisdictions().then(setJurisdictions);
  }, []);

  const handleSelectRegistrationType = (role: string) => {
    setRegistrationRole(role);
    setActiveStep(2);
  };

  const handleSelectPlan = (id: string, name: string) => {
    setPlanId(id);
    setPlanName(name);
    setActiveStep(3);
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
            bgcolor: "white",
            border: "1px solid #ececec",
            p: { xs: 3, md: 5 },
          }}
        >
          {!isCompleted && (
            <Box sx={{ mb: STEP_SECTION_GAP }}>
              <SignupStepper steps={steps} activeStep={activeStep} />
            </Box>
          )}

          {isCompleted && (
            <SuccessStep onGoToAccount={redirectToLoginCompany} />
          )}

          {!isCompleted && activeStep === 0 && (
            <IslandStep
              value={country}
              islands={jurisdictions}
              onSelect={setCountry}
              onNext={() => setActiveStep(1)}
            />
          )}

          {!isCompleted && activeStep === 1 && (
            <RegistrationTypeStep
              value={registrationRole}
              onSelect={handleSelectRegistrationType}
              onBack={() => setActiveStep(0)}
            />
          )}

          {!isCompleted && activeStep === 2 && (
            <PlanStep
              role={registrationRole}
              billingCycle={billingCycle}
              onChangeBillingCycle={setBillingCycle}
              onSelect={handleSelectPlan}
              onBack={() => setActiveStep(1)}
            />
          )}

          {!isCompleted && activeStep === 3 && (
            <DetailsStep
              country={country}
              jurisdictions={jurisdictions}
              planId={planId}
              planName={planName}
              billingCycle={billingCycle}
              onBack={() => setActiveStep(2)}
              onSuccess={() => setIsCompleted(true)}
            />
          )}
        </Paper>
      </Box>
    </Box>
  );
};
