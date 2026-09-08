"use client";

import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { BlokCheckResponse } from "@/modules/block-check/services/block-check.types";
import { inviteForFinancialDeclaration } from "@/modules/block-check/actions/block-check.actions";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";

export interface ResultViewProps {
  result: BlokCheckResponse | null;
}

export const ResultView: React.FC<ResultViewProps> = ({ result }) => {
  const [inviteChecked, setInviteChecked] = useState(false);
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  if (!result) return null;

  const hasBlockade = result.has_blockade;

  const handleSendInvitation = async () => {
    setInviteSending(true);
    try {
      const response = await inviteForFinancialDeclaration(result.reference);
      if (!response.success) {
        notifyError(response.error ?? "Kon de uitnodiging niet versturen.");
        return;
      }
      setInviteSent(true);
      notifySuccess("Uitnodiging voor de Financiële Verklaring verstuurd.");
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Kon de uitnodiging niet versturen.");
    } finally {
      setInviteSending(false);
    }
  };

  return (
    <Card
      elevation={0}
      sx={{
        mt: 2,
        border: 1,
        borderColor: "divider",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          bgcolor: "secondary.main",
          color: "white",
          px: 2,
          py: 1.5,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          borderBottom: "1px solid #e0e0e0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={2}
        >
          <Box>
            <Typography variant="h6" fontWeight={600} color="white">
              Blok-Check resultaat
            </Typography>
          </Box>
        </Stack>
      </Box>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Información */}
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Persoonsgegevens
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                ID-nummer
              </Typography>

              <Typography variant="body1" fontWeight={500}>
                {result.document_number}
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Identificatietype
              </Typography>

              <Typography variant="body1" fontWeight={500}>
                {result.identification_type}
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="caption" color="text.secondary">
              Volledige naam
            </Typography>

            <Typography variant="h6" fontWeight={600} sx={{ mt: 0.5 }}>
              {result.fullname}
            </Typography>
          </Grid>
        </Grid>

        {/* Estado */}
        <Alert
          severity={hasBlockade ? "error" : "success"}
          variant="outlined"
          sx={{
            mt: 4,
            borderRadius: 2,
            alignItems: "center",
            fontSize: "1rem",
          }}
        >
          {hasBlockade
            ? "Er is een actieve economische blokkade geregistreerd."
            : "Er is geen actieve economische blokkade geregistreerd"}
        </Alert>

        {hasBlockade && (
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={inviteChecked}
                  disabled={inviteSent}
                  onChange={(e) => setInviteChecked(e.target.checked)}
                />
              }
              label="Nodig de debiteur uit om een Financiële Verklaring in te dienen"
            />
            {inviteChecked && !inviteSent && (
              <Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleSendInvitation}
                  disabled={inviteSending}
                >
                  {inviteSending ? "Versturen..." : "Uitnodiging versturen"}
                </Button>
              </Box>
            )}
            {inviteSent && (
              <Typography variant="caption" color="success.main" sx={{ display: "block", mt: 0.5 }}>
                Uitnodiging verstuurd.
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
