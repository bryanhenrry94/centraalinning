"use client";

import {
  Box,
  Typography,
  Paper,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import { Shield } from "@mui/icons-material";
import LogoComponent from "@/shared/ui/logo-app";
import Image from "next/image";
import { FormSignUp } from "./form";

const theme = createTheme({
  palette: {
    primary: {
      main: "#E67E22",
    },
    secondary: {
      main: "#1a365d",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

export default function RegistroPage() {
  return (
    <ThemeProvider theme={theme}>
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
              maxWidth: 620,
              height: "100%",
              borderRadius: 4,
              bgcolor: "white",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              border: "1px solid #ececec",
            }}
          >
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
              {/* HEADER */}
              <Box
                sx={{
                  // px: 4,
                  py: 2,
                  ml: -1,
                  borderBottom: "1px solid #f0f0f0",
                  // flexShrink: 0,
                }}
              >
                <Box sx={{ width: 100, height: 50 }}>
                  <LogoComponent />
                </Box>
              </Box>

              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: "#1a365d",
                  mb: 0.5,
                  mt: 2,
                }}
              >
                Account{" "}
                <Typography
                  component="span"
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    color: "#E67E22",
                  }}
                >
                  registreren
                </Typography>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Maak een CFSB account aan om toegang te krijgen tot uw
                dashboard.
              </Typography>

              <FormSignUp />

              {/* FORM */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2.5,
                }}
              >
                {/* TODOS TUS INPUTS */}
              </Box>

              {/* SECURITY NOTICE */}
              <Paper
                sx={{
                  mt: 4,
                  p: 2,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 2,
                  bgcolor: "#f8f9fa",
                  border: "1px solid #e0e0e0",
                  borderRadius: 2,
                }}
                elevation={0}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    bgcolor: "rgba(26, 54, 93, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Shield sx={{ color: "#1a365d", fontSize: 20 }} />
                </Box>

                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: "#1a365d",
                      mb: 0.5,
                    }}
                  >
                    Uw gegevens zijn veilig bij CFSB.
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                    Wij gebruiken beveiligde technologie om uw informatie te
                    beschermen.
                  </Typography>
                </Box>
              </Paper>
            </Box>
          </Paper>
        </Box>

        {/* RIGHT SIDE */}
        <Box
          sx={{
            flex: 1,
            position: "relative",
            width: "100%",
            height: "100vh",
            overflow: "hidden",
            display: { xs: "none", lg: "block" },
          }}
        >
          <Image
            src="/static/registro-image3.svg"
            alt="Registro Image"
            fill
            priority
            style={{
              objectFit: "cover",
              objectPosition: "center",
            }}
          />
        </Box>
      </Box>
    </ThemeProvider>
  );
}
