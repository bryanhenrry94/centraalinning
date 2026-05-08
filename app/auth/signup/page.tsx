"use client";
import React, { useState } from "react";
import Link from "next/link";
// mui
import { Box, Button, Stack, Typography } from "@mui/material";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
// validations & actions
import { initialTenantSignUp, ITenantSignUp } from "@/lib/validations/signup";
import { notifyInfo, notifyWarning } from "@/lib/notifications";
import useClientRouter from "@/hooks/useNavigations";
import { createAccount } from "@/actions/auth";

// components
import AccountInfoCard from "@/components/signup/account-info-card";
import CompanyInfoCard from "@/components/signup/company-info-card";
import TermsAndConditionsCard from "@/components/signup/terms-and-conditions-card";
import OnboardingLayout from "@/components/onboarding/onboarding-layout";
import CardContainer from "@/components/signup/card-container";
import HeaderInfoCard from "@/components/signup/header-info-card";
import { userExistsByEmail } from "@/actions/user";
import SubscriptionCard from "@/components/signup/subscription-card";

export default function SignUpPage() {
  const [step, setStep] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = useState<ITenantSignUp>(initialTenantSignUp);
  const { redirectToSlugLoginCompany } = useClientRouter();

  const handleNext = () => {
    if (step === 0) {
      //validate account info before going to next step
      //if invalid, return and show error messages
      if (
        !formData.user.fullname ||
        !formData.user.email ||
        !formData.user.password
      ) {
        notifyWarning("Please fill in all required fields.");
        return;
      }
    }

    setStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step === 0) {
      const emailExists = await userExistsByEmail(formData.user.email);
      if (emailExists) {
        notifyWarning("Email already exists.");
        return;
      }
      handleNext();
      return;
    }

    if (step === 1) {
      handleNext();
      return;
    }

    if (step === 2) {
      handleNext();
      return;
    }

    if (step === 3) {
      //final submission
      try {
        setLoading(true);
        
        console.log("Submitting form data:", formData);
        const newAccount = await createAccount(formData);

        if (!newAccount.status) {
          notifyWarning("Sign up failed. Please try again.");
          return;
        }

        notifyInfo(
          `Account created successfully! Your subdomain is: ${newAccount.subdomain}`,
        );
        //redirect to login or dashboard
        redirectToSlugLoginCompany(newAccount.subdomain, formData.user.email);
      } catch (error) {
        notifyWarning("Sign up failed. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const getTitleByStep = (step: number) => {
    switch (step) {
      case 0:
        return "Gebruikersinformatie";
      case 1:
        return "Bedrijfsinformatie";
      case 2:
        return "Facturering";
      case 3:
        return "Algemene voorwaarden";
      default:
        return "";
    }
  };

  const getSubtitleByStep = (step: number) => {
    switch (step) {
      case 0:
        return "Vul de gegevens in om door te gaan";
      case 1:
        return "Vul de gegevens in om door te gaan";
      case 2:
        return "Selecteer uw abonnement";
      case 3:
        return "Lees en accepteer de algemene voorwaarden om door te gaan";
      default:
        return "";
    }
  };

  return (
    <>
      <OnboardingLayout backgroundImageUrl={"/static/images/auth/bonaire-isla-final.png"}>
        <Box component={"form"} onSubmit={handleSubmit}>
          <CardContainer>
            {step < 3 && (
              <HeaderInfoCard
                title={getTitleByStep(step)}
                subtitle={getSubtitleByStep(step)}
                logoSrc={process.env.NEXT_PUBLIC_LOGO_URL || ""}
              />
            )}

            {/* {JSON.stringify(formData)} */}

            {step === 0 && (
              <AccountInfoCard initial={formData} setFormData={setFormData} />
            )}
            {step === 1 && (
              <CompanyInfoCard initial={formData} setFormData={setFormData} />
            )}

            {step === 2 && (
              <SubscriptionCard initial={formData} setFormData={setFormData} />
            )}

            {step === 3 && (
              <TermsAndConditionsCard
                initial={formData}
                setFormData={setFormData}
              />
            )}
          </CardContainer>

          <Box sx={{ maxWidth: 500, mx: "auto" }}>
            <Stack spacing={2} sx={{ mt: 3 }} direction={"row"}>
              {step > 0 && (
                <Button
                  type="button"
                  onClick={handleBack}
                  fullWidth
                  variant="outlined"
                >
                  Terug
                </Button>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                loading={loading}
                disabled={step === 3 && !formData.company.terms_accepted}
                endIcon={<NavigateNextIcon />}
              >
                {step === 3 ? "Maak account aan" : "Volgende"}
              </Button>
            </Stack>
            <Box
              sx={{
                mt: 2,
                textAlign: "center",
              }}
            >
              <Typography variant="body2" align="center" sx={{ mt: 2 }}>
                <span>Heeft u nog geen account?</span>
                <Link href="/" passHref>
                  <Button variant="text">Inloggen</Button>
                </Link>
              </Typography>
            </Box>
          </Box>
        </Box>
      </OnboardingLayout>
    </>
  );
}
