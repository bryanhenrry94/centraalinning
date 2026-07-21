"use client";

import useClientRouter from "@/shared/hooks/useNavigations";
import { notifyInfo, notifyWarning } from "@/shared/ui/notifications";
import { SignUpInput } from "@/modules/auth/services/signup.type";
import { SignUpSchema } from "@/modules/auth/services/signup.validators";
import { CountryList } from "@/shared/constants/country";
import { STEP_HEADER_GAP, STEP_SECTION_GAP } from "./layout.constants";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Business,
  Email,
  Lock,
  Person,
  PersonAdd,
  Place,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";

import {
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Link,
  TextField,
  Typography,
} from "@mui/material";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

const PRIMARY = "#0A3D91";
const ACCENT = "#F7931E";

interface DetailsStepProps {
  country: string;
  planId: string;
  billingCycle: "MONTHLY" | "YEARLY";
  onBack: () => void;
}

export const DetailsStep = ({
  country,
  planId,
  billingCycle,
  onBack,
}: DetailsStepProps) => {
  const { redirectToLoginCompany } = useClientRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<SignUpInput>({
    resolver: zodResolver(SignUpSchema),

    defaultValues: {
      fullname: "",
      email: "",
      password: "",
      confirm_password: "",
      phone: "",
      kvk: "",
      company_name: "",
      country,
      accept_terms: false,
      plan_id: planId,
      billing_cycle: billingCycle,
    },
  });

  useEffect(() => {
    setValue("country", country);
    setValue("plan_id", planId);
    setValue("billing_cycle", billingCycle);
  }, [country, planId, billingCycle, setValue]);

  const onSubmit = async (data: SignUpInput) => {
    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        notifyWarning("Sign up failed. Please try again.");
        return;
      }

      const account = await response.json();

      if (account) {
        notifyInfo(
          "Account created successfully! Please check your email to confirm your account.",
        );

        redirectToLoginCompany();
      }
    } catch (error) {
      console.error("Error during sign up:", error);
    }
  };

  const commonStyles = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
    },
  };

  const islandLabel =
    CountryList.find((item) => item.value === country)?.label || country;

  return (
    <Box
      sx={{
        flex: 1,
        width: "100%",
      }}
    >
      <Typography
        variant="h5"
        sx={{ fontWeight: 700, color: PRIMARY, mb: STEP_HEADER_GAP }}
      >
        Uw gegevens
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Vul uw bedrijfs- en contactgegevens in om de registratie af te ronden.
      </Typography>

      <Chip
        icon={<Place sx={{ color: `${PRIMARY} !important` }} />}
        label={`Eiland: ${islandLabel}`}
        sx={{
          mb: STEP_SECTION_GAP,
          bgcolor: "#eef2fb",
          color: PRIMARY,
          fontWeight: 600,
        }}
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2.5}>
          {/* Fullname */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="fullname"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  placeholder="Volledige naam"
                  error={!!errors.fullname}
                  helperText={errors.fullname?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person sx={{ color: "#9e9e9e" }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={commonStyles}
                />
              )}
            />
          </Grid>

          {/* Email */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  type="email"
                  placeholder="E-mailadres"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email sx={{ color: "#9e9e9e" }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={commonStyles}
                />
              )}
            />
          </Grid>

          {/* Password */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  type={showPassword ? "text" : "password"}
                  placeholder="Wachtwoord"
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ color: "#9e9e9e" }} />
                      </InputAdornment>
                    ),

                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((prev) => !prev)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={commonStyles}
                />
              )}
            />
          </Grid>

          {/* Confirm Password */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="confirm_password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Bevestig wachtwoord"
                  error={!!errors.confirm_password}
                  helperText={errors.confirm_password?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ color: "#9e9e9e" }} />
                      </InputAdornment>
                    ),

                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() =>
                            setShowConfirmPassword((prev) => !prev)
                          }
                          edge="end"
                        >
                          {showConfirmPassword ? (
                            <VisibilityOff />
                          ) : (
                            <Visibility />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={commonStyles}
                />
              )}
            />
          </Grid>

          {/* KVK */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="kvk"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  placeholder="KVK"
                  error={!!errors.kvk}
                  helperText={errors.kvk?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Business sx={{ color: "#9e9e9e" }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={commonStyles}
                />
              )}
            />
          </Grid>

          {/* Company */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="company_name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  placeholder="Bedrijfsnaam"
                  error={!!errors.company_name}
                  helperText={errors.company_name?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Business sx={{ color: "#9e9e9e" }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={commonStyles}
                />
              )}
            />
          </Grid>

          {/* Terms */}
          <Grid size={12}>
            <Controller
              name="accept_terms"
              control={control}
              render={({ field }) => (
                <Box>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    }
                    label={
                      <Typography variant="body2" color="text.secondary">
                        Ik ga akkoord met de{" "}
                        <Link href="#">Gebruiksvoorwaarden</Link> en{" "}
                        <Link href="#">Privacyverklaring</Link>
                      </Typography>
                    }
                  />

                  {errors.accept_terms && (
                    <Typography variant="caption" color="error">
                      {errors.accept_terms?.message}
                    </Typography>
                  )}
                </Box>
              )}
            />
          </Grid>

          <Grid size={12}>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button variant="outlined" onClick={onBack} sx={{ py: 1.5 }}>
                Terug
              </Button>

              {/* Submit */}
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting || watch("accept_terms") === false}
                startIcon={<PersonAdd />}
                sx={{
                  py: 1.5,
                  bgcolor: PRIMARY,
                  "&:hover": { bgcolor: "#082f70" },
                }}
              >
                Account Aanmaken
              </Button>
            </Box>
          </Grid>

          <Grid size={12}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Divider sx={{ flex: 1 }} />

              <Typography variant="body2" color="text.secondary">
                of
              </Typography>

              <Divider sx={{ flex: 1 }} />
            </Box>
          </Grid>

          <Grid size={12}>
            <Typography variant="body2" align="center" color="text.secondary">
              Heeft u al een account?{" "}
              <Link
                href="/login"
                sx={{
                  color: ACCENT,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                INLOGGEN
              </Link>
            </Typography>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};
