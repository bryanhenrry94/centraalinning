"use client";

import useClientRouter from "@/shared/hooks/useNavigations";
import { notifyInfo, notifyWarning } from "@/shared/ui/notifications";
import { SignUpInput } from "@/modules/auth/services/signup.type";
import { SignUpSchema } from "@/modules/auth/services/signup.validators";
import { ISLAND_VISUALS } from "@/modules/auth/constants/island-visuals";
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
  IconButton,
  InputAdornment,
  Link,
  TextField,
  Typography,
} from "@mui/material";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

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

  const islandLabel = ISLAND_VISUALS[country]?.label || country;

  return (
    <Box
      sx={{
        flex: 1,
        width: "100%",
      }}
    >
      <Chip icon={<Place />} label={`Eiland: ${islandLabel}`} sx={{ mb: 2 }} />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
          }}
        >
          {/* Fullname */}
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

          {/* Email */}
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

          {/* Password */}
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

          {/* Confirm Password */}
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
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
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

          {/* KVK */}
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

          {/* Company */}
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

          {/* Terms */}
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

          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="outlined" onClick={onBack} sx={{ py: 1.5 }}>
              Terug
            </Button>

            {/* Submit */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isSubmitting || watch("accept_terms") === false}
              startIcon={<PersonAdd />}
            >
              Account Aanmaken
            </Button>
          </Box>

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

          <Typography variant="body2" align="center" color="text.secondary">
            Heeft u al een account?{" "}
            <Link
              href="/login"
              sx={{
                color: "#E67E22",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              INLOGGEN
            </Link>
          </Typography>
        </Box>
      </form>
    </Box>
  );
};
