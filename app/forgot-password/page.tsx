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
  TextField,
  Typography,
} from "@mui/material";
import { useForm } from "react-hook-form";
import { requestPasswordReset } from "@/actions/request-password-reset";

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
                  borderRadius: 3,
                }}
              >
                {isPending ? "Verzenden..." : "Herstelkoppeling verzenden"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
