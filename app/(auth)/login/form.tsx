"use client";

import { useEffect, useState } from "react";
import { getSession } from "next-auth/react";
import {
  Box,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
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
import { notifyError } from "@/shared/ui/notifications";
import { LoginFormData } from "@/modules/auth/services/auth.validators";
import useClientRouter from "@/shared/hooks/useNavigations";
import { signIn } from "next-auth/react";

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const { redirectToSignUp, redirectToDashboard } = useClientRouter();

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
      };

      console.log("Submitting login form with payload:", payload);

      const result = await signIn("credentials", {
        redirect: false,
        ...payload,
      });

      console.log("signIn result:", result);

      if (result?.ok) {
        setFormData({
          email: "",
          password: "",
        });

        const session = await getSession();
        const subdomain = session?.user?.subdomain;

        if (!subdomain) {
          notifyError("Ongeldige werkruimte");
          return;
        }

        redirectToDashboard(subdomain);
      } else {
        notifyError(result?.error || "Onjuiste inloggegevens");
      }
    } catch (error) {
      notifyError("Onverwachte fout");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      {/* Login Form */}
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          minWidth: 0,
        }}
      >
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
              justifyContent: "end",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
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
