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
    <Box
      sx={{
        minHeight: "100dvh",
        width: "100%",
        bgcolor: "#f5f5f5",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        p: 2,
        boxSizing: "border-box",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 380,
          maxHeight: "95dvh",
          bgcolor: "white",
          display: "flex",
          flexDirection: "column",
          border: "1px solid #ececec",
          overflow: "hidden",
        }}
      >
        {/* HEADER */}
        <Box
          sx={{
            px: 2,
            py: 1,
            borderBottom: "1px solid #f0f0f0",
            flexShrink: 0,
          }}
        >
          <Box sx={{ ml: -1 }}>
            <LogoComponent />
          </Box>
        </Box>

        {/* CONTENT */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            px: 2,
            py: 3,
          }}
        >
          {/* TITLE */}
          <Box sx={{ mb: 3 }}>
            <Typography
              sx={{
                fontWeight: 700,
                color: "#1a365d",
                fontSize: {
                  xs: "1.6rem",
                  sm: "1.6rem",
                },
                lineHeight: 1.1,
              }}
            >
              Welkom{" "}
              <Typography
                component="span"
                sx={{
                  fontWeight: 700,
                  color: "primary.main",
                  fontSize: "inherit",
                }}
              >
                terug!
              </Typography>
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 1,
                fontSize: 13,
              }}
            >
              Toegang met uw zakelijke e-mailadres
            </Typography>
          </Box>

          {/* FORM */}
          <form onSubmit={handleSubmit}>
            <Stack spacing={1.5}>
              <TextField
                fullWidth
                type="email"
                size="small"
                placeholder="E-mailadres of gebruikersnaam"
                value={formData.email ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person
                        sx={{
                          color: "text.secondary",
                          fontSize: 20,
                        }}
                      />
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isLoading}
                startIcon={<ArrowRightAltIcon />}
                sx={{
                  mt: 1,
                  height: 42,
                  textTransform: "none",
                  fontWeight: 600,
                }}
              >
                {isLoading ? "Laden..." : "Doorgaan"}
              </Button>

              <Box
                sx={{
                  pt: 1,
                  textAlign: "center",
                }}
              >
                <Typography
                  variant="body2"
                  component="span"
                  sx={{ fontSize: 13 }}
                >
                  Heeft u geen account?{" "}
                </Typography>

                <Button
                  variant="text"
                  color="primary"
                  onClick={redirectToSignUp}
                  sx={{
                    textTransform: "none",
                    p: 0,
                    minWidth: "auto",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Schrijf je in
                </Button>
              </Box>
            </Stack>
          </form>
        </Box>
      </Paper>
    </Box>
  );
}
