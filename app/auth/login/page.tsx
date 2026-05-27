"use client";
import React, { useEffect, useState } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";
import LogoComponent from "@/components/ui/logo-app";
import { LoginFormData } from "@/lib/validations/auth";
import useClientRouter from "@/hooks/useNavigations";
import { notifyError } from "@/lib/notifications";
import { useRouter } from "next/navigation";
import { getSubdomain } from "@/lib/domain";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { redirectToSignUp } = useClientRouter();
  const router = useRouter();

  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get("email");
    if (emailParam) {
      setFormData((prev) => ({ ...prev, email: emailParam }));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Avoid mutating state directly; build a payload including detected subdomain
      const payload: LoginFormData = {
        ...formData,
      };

      const result = await signIn("credentials", {
        redirect: false,
        ...payload,
      });

      if (result?.ok) {
        setFormData({
          email: "",
          password: "",          
        });

        router.push("/dashboard");
      } else {
        notifyError(result?.error || "Credenciales incorrectas");
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
          <Typography variant="h5" fontWeight={700} mb={0.5}>
            Login
          </Typography>
          <Typography variant="body2" textAlign={"left"} sx={{ mb: 2 }}>
            Toegang met uw zakelijke e-mailadres
          </Typography>
        </Box>

        <form onSubmit={handleSubmit} style={{ minWidth: 300 }}>
          <TextField
            name="email"
            type="email"
            variant="outlined"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
            placeholder="naam@bedrijf.com"
            fullWidth
            size="small"
          />
          <TextField
            name="password"
            type="password"
            variant="outlined"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            required
            placeholder="Wachtwoord"
            fullWidth
            sx={{ mt: 2 }}
            size="small"
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="medium"
            sx={{ mt: 2 }}
            disabled={isLoading}
          >
            {isLoading ? "Laden..." : "Login"}
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
