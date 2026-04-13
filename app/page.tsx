"use client";
import React, { useState } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";
import LogoComponent from "@/components/ui/logo-app";
import { EmailFormData } from "@/lib/validations/auth";
import useClientRouter from "@/hooks/useNavigations";
import { notifyError, notifyWarning } from "@/lib/notifications";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";
import { emailExists } from "@/actions/auth";
import { getTenantByEmail } from "@/actions/tenant";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const { redirectToSignUp, redirectToSlugLoginCompany } = useClientRouter();

  const [formData, setFormData] = useState<EmailFormData>({
    email: "",
  });

  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Avoid mutating state directly; build a payload including detected subdomain
      const payload: EmailFormData = {
        ...formData,
      };

      console.log("Submitting email:", payload.email);

      const result = await emailExists(payload.email);
      if (!result) {
        notifyWarning("We konden deze e-mail niet vinden.");
        return;
      }

      const tenants = await getTenantByEmail(payload.email);
      console.log("Tenants associated with the email:", tenants);

      if (tenants.length !== 0) {
        redirectToSlugLoginCompany(tenants[0].subdomain, payload.email);
      } else {
        notifyWarning(
          "We konden geen gekoppelde bedrijven vinden voor dit e-mailadres.",
        );
      }
    } catch (error) {
      notifyError("Error inesperado");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Box
        minHeight="calc(100vh - 32px)"
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        sx={{ p: 4, bgcolor: "background.default", color: "text.primary" }}
      >
        <Box mb={3} textAlign="center">
          <LogoComponent />
        </Box>
        <Typography variant="body2" textAlign={"left"} sx={{ mb: 2 }}>
          Toegang met uw zakelijke e-mailadres
        </Typography>

        <form onSubmit={handleSubmit} style={{ minWidth: 300 }}>
          <TextField
            name="email"
            type="email"
            variant="outlined"
            value={formData.email ?? ""}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
            placeholder="naam@bedrijf.com"
            fullWidth
            size="small"
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="medium"
            sx={{ mt: 2 }}
            disabled={isLoading}
            startIcon={<ArrowRightAltIcon />}
          >
            {isLoading ? "Laden..." : "Doorgaan"}
          </Button>
        </form>

        <Box mt={3} mb={3} textAlign="center">
          <Typography variant="body2" component="span">
            ¿Heeft u geen account?{" "}
          </Typography>
          <Button
            variant="text"
            color="primary"
            onClick={redirectToSignUp}
            sx={{ textTransform: "none", p: 0, minWidth: "auto" }}
          >
            Schrijf je in
          </Button>
        </Box>
      </Box>
    </>
  );
}
