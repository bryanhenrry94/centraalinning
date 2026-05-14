"use client";
import React, { useState } from "react";
import {
  Box,
  Button,
  Container,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import LogoComponent from "@/components/ui/logo-app";
import { EmailFormData } from "@/lib/validations/auth";
import useClientRouter from "@/hooks/useNavigations";
import { notifyError, notifyWarning } from "@/lib/notifications";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";
import { emailExists } from "@/actions/auth";
import { getTenantByEmail } from "@/actions/tenant";
import { Person } from "@mui/icons-material";
import { useRouter } from "next/navigation";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const { redirectToSignUp, redirectToSlugLoginCompany } = useClientRouter();
  const router = useRouter();

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
    <Container maxWidth="sm">
      <Box
        minHeight="calc(100vh - 32px)"
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        sx={{ p: 4, bgcolor: "background.default", color: "text.primary" }}
      >
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 620,
            height: "100%",
            bgcolor: "white",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: "1px solid #ececec",
          }}
        >
          {/* HEADER */}
          <Box
            sx={{
              px: 4,
              py: 3,
              borderBottom: "1px solid #f0f0f0",
              flexShrink: 0,
            }}
          >
            <Box sx={{ width: 100, height: 50 }}>
              <LogoComponent />
            </Box>
          </Box>

          {/* SCROLLABLE CONTENT */}
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
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: "#1a365d",
                mb: 0.5,
              }}
            >
              Welkom{" "}
              <Typography
                component="span"
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: "primary.main",
                }}
              >
                terug!
              </Typography>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Toegang met uw zakelijke e-mailadres
            </Typography>

            {/* FORM */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2.5,
              }}
            >
              {/* TODOS TUS INPUTS */}
              <form onSubmit={handleSubmit} style={{ minWidth: 300 }}>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    type="email"
                    placeholder="E-mailadres of gebruikersnaam"
                    value={formData.email ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person sx={{ color: "text.secondary" }} />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    sx={{ mt: 2 }}
                    disabled={isLoading}
                    startIcon={<ArrowRightAltIcon />}
                  >
                    {isLoading ? "Laden..." : "Doorgaan"}
                  </Button>

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
                </Stack>
              </form>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
