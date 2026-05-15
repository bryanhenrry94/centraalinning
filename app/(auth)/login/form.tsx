"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Checkbox,
  FormControlLabel,
  Link,
  Divider,
  Stack,
} from "@mui/material";
import {
  Person,
  Lock,
  Visibility,
  VisibilityOff,
  ArrowForward,
  PersonAdd,
} from "@mui/icons-material";
import { notifyError } from "@/lib/notifications";
import { getSubdomain } from "@/lib/domain";
import { LoginFormData } from "@/lib/validations/auth";
import useClientRouter from "@/hooks/useNavigations";
import { signIn } from "next-auth/react";

export default function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const { redirectToSignUp } = useClientRouter();

  const [subdomain, setSubdomain] = useState<string | null>(null);

  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
    subdomain: "",
  });

  useEffect(() => {
    // Detectar tenant en el lado del cliente
    const hostname = window.location.hostname;
    const tenant = getSubdomain(hostname);

    setSubdomain(tenant);
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get("email");
    if (emailParam) {
      setFormData((prev) => ({ ...prev, email: emailParam }));
    }
  }, []);

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Avoid mutating state directly; build a payload including detected subdomain
      const payload: LoginFormData = {
        ...formData,
        subdomain: subdomain ?? formData.subdomain,
      };

      const result = await signIn("credentials", {
        redirect: false,
        ...payload,
      });

      if (result?.ok) {
        setFormData({
          email: "",
          password: "",
          subdomain: "",
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
    <Box>
      {/* Login Form */}
      <form onSubmit={handleSubmit} style={{ minWidth: 300 }}>
        <Stack spacing={2}>
          {/* Email/Username Field */}
          <TextField
            fullWidth
            placeholder="E-mailadres of gebruikersnaam"
            value={formData.email}
            size="small"
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Person sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
          />

          {/* Password Field */}
          <TextField
            fullWidth
            type={showPassword ? "text" : "password"}
            size="small"
            placeholder="Wachtwoord"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleTogglePassword} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Remember Me & Forgot Password */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  Onthoud mij
                </Typography>
              }
            />
            <Link
              href="/forgot-password"
              underline="hover"
              sx={{ color: "primary.main", fontSize: 14, fontWeight: 500 }}
            >
              Wachtwoord vergeten?
            </Link>
          </Box>

          {/* Login Button */}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            endIcon={<ArrowForward />}
            sx={{ textTransform: "none" }}
            disabled={isLoading}
            loading={isLoading}
          >
            Inloggen
          </Button>

          {/* Divider */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Divider sx={{ flex: 1 }} />
            <Typography variant="body2" color="text.secondary">
              of
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>

          {/* Register Button */}
          <Button
            variant="outlined"
            fullWidth
            size="large"
            startIcon={<PersonAdd />}
            onClick={redirectToSignUp}
            sx={{ textTransform: "none" }}
          >
            Nog geen account?{" "}
            <Box component="span" sx={{ color: "primary.main", ml: 0.5 }}>
              Registreer
            </Box>
          </Button>
        </Stack>
      </form>
    </Box>
  );
}
