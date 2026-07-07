// app/forgot-password/page.tsx

"use client";

import { useState, useTransition } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { useForm } from "react-hook-form";
import { requestPasswordReset } from "@/modules/auth/actions/request-password-reset.actions";

type FormValues = {
  email: string;
};

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();

  const onSubmit = (data: FormValues) => {
    setMessage("");

    startTransition(async () => {
      const response = await requestPasswordReset(data.email);

      setMessage(response.message);
    });
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
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight={700} mb={1}>
            Wachtwoord herstellen
          </Typography>

          <Typography color="text.secondary" mb={4}>
            Voer je e-mailadres in en we sturen je een link om je wachtwoord
            opnieuw in te stellen.
          </Typography>

          {message && (
            <Alert severity="info" sx={{ mb: 3 }}>
              {message}
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
              label="E-mailadres"
              fullWidth
              type="email"
              error={!!errors.email}
              helperText={errors.email?.message}
              {...register("email", {
                required: "E-mailadres is verplicht",
                pattern: {
                  value: /\S+@\S+\.\S+/,
                  message: "Ongeldig e-mailadres",
                },
              })}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isPending}
              sx={{
                height: 50,
                textTransform: "none",
              }}
            >
              {isPending ? "Verzenden..." : "Herstelkoppeling verzenden"}
            </Button>
          </Box>
        </CardContent>
      </Paper>
    </Box>
  );
}
