"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
// mui
import { Box, Button, Container, TextField, Typography } from "@mui/material";
// validations & actions
import { notifyError, notifyInfo, notifyWarning } from "@/shared/ui/notifications";
import useClientRouter from "@/shared/hooks/useNavigations";

// components
import OnboardingLayout from "@/shared/ui/onboarding/onboarding-layout";
import HeaderInfoCard from "@/modules/auth/components/signup/header-info-card";
import { userExistsByEmail } from "@/modules/auth/actions/user.actions";
import {
  completeRegistration,
  getInvitationDetails,
  invitationIsUsed,
  isInvitationValid,
} from "@/modules/auth/actions/invitation.actions";
import { useParams } from "next/navigation";
import LoadingUI from "@/shared/ui/loading-ui";

import { InvitationRegistration } from "@/lib/validations/tenant-invitation";
import LogoComponent from "@/shared/ui/logo-app";

export default function InvitationPage() {
  const [loading, setLoading] = React.useState(false);
  const [isUsed, setIsUsed] = React.useState(false);
  const [formData, setFormData] = useState<InvitationRegistration>({
    token: "",
    email: "",
    fullname: "",
    password: "",
  });
  const { redirectToLoginCompany } = useClientRouter();
  const { token } = useParams();

  useEffect(() => {
    if (!token) {
      redirectToLoginCompany();
      return;
    }

    const validateInvitation = async () => {
      if (!token) {
        notifyError("Ongeldige uitnodigingslink.");
        return;
      }

      setLoading(true);

      try {
        const isUsed = await invitationIsUsed(token as string);
        setIsUsed(isUsed);

        const isValid = await isInvitationValid(token as string);
        if (!isValid) {
          redirectToLoginCompany();
          return;
        }

        const invitationData = await getInvitationDetails(token as string);

        if (invitationData) {
          setFormData((prev) => ({
            ...prev,
            token: invitationData.token,
            email: invitationData.email,
            fullname: invitationData.fullname || "",
          }));
        } else {
          redirectToLoginCompany();
        }
      } catch (error) {
        console.log(error);
        notifyError("Er is een onverwachte fout opgetreden.");
      } finally {
        setLoading(false);
      }
    };

    validateInvitation();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Check if email already exists
      const emailExists = await userExistsByEmail(formData.email);
      if (emailExists) {
        notifyWarning("Email already exists.");
        return;
      }

      // Create debtor account
      const result = await completeRegistration(formData);

      if (!result.status) {
        notifyWarning(
          "Er is een fout opgetreden bij het aanmaken van uw account: " +
            (result.error || "Onbekende fout")
        );
        return;
      }

      notifyInfo("Account succesvol aangemaakt. U kunt nu inloggen.");
      setIsUsed(true);

      // if (result.subdomain) {
      //   redirectToSlugLoginCompany(result.subdomain, formData.email);
      // } else {
      //   redirectToLoginCompany();
      // }
    } catch (error) {
      console.log(error);
      notifyError("Er is een onverwachte fout opgetreden.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingUI />;
  }

  return (
    <>
      {isUsed ? (
        <>
          <Container maxWidth="sm" sx={{ mt: 8, textAlign: "center" }}>
            <Box
              sx={{
                mb: 4,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "80vh",
              }}
            >
              <LogoComponent />
              <Typography variant="h4" gutterBottom>
                Uitnodiging Al Gebruikt
              </Typography>
              <Typography variant="body1" sx={{ mb: 4 }}>
                Deze uitnodigingslink is al gebruikt om een account aan te
                maken. Als u al een account heeft, kunt u inloggen.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={() => redirectToLoginCompany()}
              >
                Ga naar Inloggen
              </Button>
            </Box>
          </Container>
        </>
      ) : (
        <OnboardingLayout
          backgroundImageUrl={"/static/images/auth/sign_up_2.jpg"}
        >
          <Box
            component={"form"}
            onSubmit={handleSubmit}
            sx={{ minWidth: 350, maxWidth: { xs: 400, sm: 600, md: 400 } }}
          >
            <HeaderInfoCard
              title={"Gebruikersinformatie"}
              subtitle={"Vul de gegevens in om door te gaan"}
              logoSrc={process.env.NEXT_PUBLIC_LOGO_URL || ""}
            />

            <TextField
              name="email"
              label="Zakelijk e-mailadres"
              type="email"
              fullWidth
              required
              margin="dense"
              value={formData.email}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  email: e.target.value,
                })
              }
            />

            <TextField
              name="fullname"
              label="Volledige naam"
              type="text"
              fullWidth
              required
              margin="dense"
              value={formData.fullname}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  fullname: e.target.value,
                })
              }
            />

            <TextField
              name="password"
              label="Wachtwoord"
              type="password"
              fullWidth
              required
              margin="dense"
              value={formData.password}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  password: e.target.value,
                })
              }
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              loading={loading}
              sx={{ mt: 1 }}
            >
              Maak account aan
            </Button>
          </Box>
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
        </OnboardingLayout>
      )}
    </>
  );
}
