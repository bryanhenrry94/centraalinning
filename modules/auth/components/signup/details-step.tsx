"use client";

import { notifyWarning } from "@/shared/ui/notifications";
import { SignUpInput } from "@/modules/auth/services/signup.type";
import { SignUpSchema } from "@/modules/auth/services/signup.validators";
import { STEP_HEADER_GAP, STEP_SECTION_GAP } from "./layout.constants";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Business,
  Email,
  Lock,
  Person,
  PersonAdd,
  Phone,
  Place,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";

import {
  Box,
  Button,
  Checkbox,
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
  // Islas activas — vienen de Jurisdiction (dato), nunca de un array
  // hardcodeado en el código (punto 13 del análisis CFSB).
  jurisdictions: { islandCode: string; islandName: string }[];
  planId: string;
  planName: string;
  billingCycle: "MONTHLY" | "YEARLY";
  onBack: () => void;
  onSuccess: () => void;
}

export const DetailsStep = ({
  country,
  jurisdictions,
  planId,
  planName,
  billingCycle,
  onBack,
  onSuccess,
}: DetailsStepProps) => {
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
      address: "",
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

      const result = await response.json();

      if (!response.ok || !result?.success) {
        notifyWarning(
          result?.error || "Er is een fout opgetreden. Probeer het opnieuw.",
        );
        return;
      }

      onSuccess();
    } catch (error) {
      console.error("Error during sign up:", error);
      notifyWarning("Er is een fout opgetreden. Probeer het opnieuw.");
    }
  };

  const commonStyles = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
    },
  };

  const islandLabel =
    jurisdictions.find((item) => item.islandCode === country)?.islandName || country;

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

      <Grid container spacing={2} sx={{ mb: STEP_SECTION_GAP }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              bgcolor: "#f7f8fa",
              border: "1px solid #ececec",
              borderRadius: 2,
              p: 1.5,
            }}
          >
            <Place sx={{ color: PRIMARY }} />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Eiland
              </Typography>
              <Typography sx={{ fontWeight: 700, color: PRIMARY }}>
                {islandLabel}
              </Typography>
            </Box>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              bgcolor: "#f7f8fa",
              border: "1px solid #ececec",
              borderRadius: 2,
              p: 1.5,
            }}
          >
            <Person sx={{ color: PRIMARY }} />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Gekozen plan
              </Typography>
              <Typography sx={{ fontWeight: 700, color: PRIMARY }}>
                {planName}
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>

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

          {/* Phone */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  placeholder="Telefoonnummer"
                  error={!!errors.phone}
                  helperText={errors.phone?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone sx={{ color: "#9e9e9e" }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={commonStyles}
                />
              )}
            />
          </Grid>

          {/* Address */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="address"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  placeholder="Adres"
                  error={!!errors.address}
                  helperText={errors.address?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Place sx={{ color: "#9e9e9e" }} />
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
              <Button
                variant="outlined"
                onClick={onBack}
                sx={{ py: 1.5, fontWeight: 600, textTransform: "none" }}
              >
                ← Terug
              </Button>

              {/* Submit */}
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting || watch("accept_terms") === false}
                startIcon={<PersonAdd />}
                sx={{
                  py: 1.5,
                  fontWeight: 600,
                  textTransform: "none",
                  bgcolor: PRIMARY,
                  "&:hover": { bgcolor: "#082f70" },
                }}
              >
                Account aanmaken
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
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1.5,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Heeft u al een account?
              </Typography>
              <Button
                component={Link}
                href="/login"
                variant="outlined"
                sx={{
                  fontWeight: 600,
                  textTransform: "none",
                  borderColor: PRIMARY,
                  color: PRIMARY,
                }}
              >
                Inloggen
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};
