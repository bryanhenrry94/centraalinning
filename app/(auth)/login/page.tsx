"use client";

import { Box, Typography, Paper, Container } from "@mui/material";
import { Shield } from "@mui/icons-material";
import LogoComponent from "@/components/ui/logo-app";
import Image from "next/image";
import LoginForm from "./form";

export default function RegistroPage() {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        width: "100%",
        overflowX: "hidden",
        display: "flex",
        bgcolor: "#f5f5f5",
      }}
    >
      {/* LEFT SIDE */}
      <Box
        sx={{
          width: { xs: "100%", lg: "50%" },
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          p: 2,
          overflow: "hidden",
          bgcolor: "white",
        }}
      >
        <Container
          maxWidth="sm"
          disableGutters
          sx={{
            width: "100%",
            bgcolor: "white",
          }}
        >
          <Box
            sx={{
              width: "100%",
              p: { xs: 2, md: 4 },
              boxSizing: "border-box",
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

            {/* SCROLLABLE CONTENT */}
            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                px: 2,
                py: 1,

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
                    color: "#E67E22",
                  }}
                >
                  terug!
                </Typography>
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2, mt: -1 }}
              >
                Log in op uw account om toegang te krijgen tot uw dashboard.
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
                <LoginForm />
              </Box>

              {/* SECURITY NOTICE */}
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 2,
                  border: "1px solid #e0e0e0",
                  borderRadius: 2,
                }}
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
                  <Shield sx={{ color: "gray", fontSize: 20 }} />
                </Box>

                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: "gray",
                      mb: 0.5,
                    }}
                  >
                    Uw gegevens zijn veilig bij CFSB.
                  </Typography>

                  <Typography variant="caption" color="gray">
                    Wij gebruiken beveiligde technologie om uw informatie te
                    beschermen.
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* RIGHT SIDE */}
      <Box
        sx={{
          width: { xs: "0%", lg: "50%" },
          position: "relative",
          height: "100vh",
          overflow: "hidden",
          display: { xs: "none", lg: "block" },
        }}
      >
        <Image
          src="/static/registro-1200x1440.svg"
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
  );
}
