"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  TextField,
  Typography,
} from "@mui/material";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { resetPassword } from "@/actions/reset-password";
import useClientRouter from "@/hooks/useNavigations";

type FormValues = {
  password: string;
  confirmPassword: string;
};

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const { redirectToSlugLoginCompany } = useClientRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>();

  const password = watch("password");

  const onSubmit = (data: FormValues) => {
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      const response = await resetPassword(token, data.password);

      if (!response.success) {
        setErrorMessage(response.message);
        return;
      }

      setSuccessMessage(response.message);

      setTimeout(() => {
        router.push("/");
      }, 2000);
    });
  };

  if (!token) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Alert severity="error" sx={{ width: "100%" }}>
            Ongeldig token
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Card
          sx={{
            width: "100%",
            borderRadius: 4,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" fontWeight={700} mb={1}>
              Nieuw wachtwoord
            </Typography>

            <Typography color="text.secondary" mb={4}>
              Voer je nieuwe wachtwoord in.
            </Typography>

            {errorMessage && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {errorMessage}
              </Alert>
            )}

            {successMessage && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {successMessage}
              </Alert>
            )}

            <Box
              component="form"
              onSubmit={handleSubmit(onSubmit)}
              display="flex"
              flexDirection="column"
              gap={3}
            >
              <TextField
                label="Nieuw wachtwoord"
                type="password"
                fullWidth
                error={!!errors.password}
                helperText={errors.password?.message}
                {...register("password", {
                  required: "Het wachtwoord is vereist",
                  minLength: {
                    value: 6,
                    message: "Moet minstens 6 tekens bevatten",
                  },
                })}
              />

              <TextField
                label="Wachtwoord bevestigen"
                type="password"
                fullWidth
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
                {...register("confirmPassword", {
                  required: "U moet het wachtwoord bevestigen",
                  validate: (value) =>
                    value === password || "Wachtwoorden komen niet overeen",
                })}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isPending}
                sx={{
                  height: 50,
                  borderRadius: 3,
                }}
              >
                {isPending ? "Bijwerken..." : "Wachtwoord bijwerken"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
