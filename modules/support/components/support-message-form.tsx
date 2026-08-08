"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider, Controller, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import SendIcon from "@mui/icons-material/Send";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { submitSupportMessage } from "@/modules/support/actions/support.actions";
import {
  CreateSupportMessageInput,
  CreateSupportMessageSchema,
} from "@/modules/support/services/support.validators";
import { SUPPORT_MESSAGE_TYPE_OPTIONS } from "@/modules/support/utils/support-status";
import { SupportMessageType } from "@/modules/support/constants/support-message";

const defaultValues: CreateSupportMessageInput = {
  type: SupportMessageType.SUGGESTION,
  subject: "",
  caseReference: "",
  message: "",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  SUGGESTION: <LightbulbOutlinedIcon fontSize="medium" />,
  COMPLAINT: <ReportProblemOutlinedIcon fontSize="medium" />,
  TECHNICAL_ISSUE: <SettingsOutlinedIcon fontSize="medium" />,
};

const MAX_MESSAGE_LENGTH = 2000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Geel is te licht om als tekst-/icoonkleur te gebruiken (slecht contrast) —
// voor dat accent tekenen we het icoon/de titel bijna zwart, terwijl de
// cirkelachtergrond wel het gele accent behoudt.
const accentTextColor = (accent: string) =>
  accent === "warning" ? "text.primary" : `${accent}.main`;

export const SupportMessageForm: React.FC = () => {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);

  const methods = useForm<CreateSupportMessageInput>({
    resolver: zodResolver(
      CreateSupportMessageSchema,
    ) as unknown as Resolver<CreateSupportMessageInput>,
    defaultValues,
  });
  const {
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = methods;

  const selectedType = watch("type");
  const messageLength = watch("message")?.length ?? 0;

  const handleFileSelected = (selected: File | null) => {
    if (selected && selected.size > MAX_FILE_SIZE) {
      notifyError("Het bestand mag maximaal 10 MB zijn");
      return;
    }
    setFile(selected);
  };

  const onSubmit = async (data: CreateSupportMessageInput) => {
    setLoading(true);
    try {
      const created = await submitSupportMessage(data, file ?? undefined);
      notifySuccess("Uw bericht is verzonden naar CFSB.");
      router.push(`/support/${created.id}`);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Verzenden mislukt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 1.5, sm: 4 } }}>
      <Typography variant="h5" gutterBottom fontWeight={700} sx={{ mb: 4 }}>
        Feedback &amp; Ondersteuning
      </Typography>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {SUPPORT_MESSAGE_TYPE_OPTIONS.map((option) => {
              const selected = selectedType === option.value;
              return (
                <Grid key={option.value} size={{ xs: 12, sm: 4 }}>
                  <Paper
                    onClick={() =>
                      setValue("type", option.value as SupportMessageType)
                    }
                    variant="outlined"
                    sx={{
                      p: 2.5,
                      textAlign: "center",
                      cursor: "pointer",
                      borderRadius: 2,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected
                        ? `${option.accent}.main`
                        : "divider",
                      transition: "border-color .15s ease",
                      "&:hover": { borderColor: `${option.accent}.main` },
                    }}
                  >
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        bgcolor: (theme) =>
                          alpha(
                            theme.palette[option.accent].main,
                            option.accent === "warning" ? 0.25 : 0.12,
                          ),
                        color: accentTextColor(option.accent),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mx: "auto",
                        mb: 1.5,
                      }}
                    >
                      {TYPE_ICONS[option.value]}
                    </Box>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      color={accentTextColor(option.accent)}
                    >
                      {option.label}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {option.description}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>

          <Divider sx={{ mb: 3 }} />

          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            Bericht details
          </Typography>

          <Stack spacing={2.5}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="subject"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Onderwerp"
                      required
                      fullWidth
                      size="small"
                      error={!!errors.subject}
                      helperText={errors.subject?.message}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="caseReference"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value ?? ""}
                      label="Dossier (optioneel)"
                      fullWidth
                      size="small"
                    />
                  )}
                />
              </Grid>
            </Grid>

            <Box>
              <Controller
                name="message"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Uw bericht"
                    required
                    fullWidth
                    multiline
                    minRows={5}
                    slotProps={{ htmlInput: { maxLength: MAX_MESSAGE_LENGTH } }}
                    error={!!errors.message}
                    helperText={errors.message?.message}
                  />
                )}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", textAlign: "right", mt: 0.5 }}
              >
                {messageLength} / {MAX_MESSAGE_LENGTH}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                Bijlage toevoegen (optioneel)
              </Typography>
              <Box
                component="label"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFileSelected(e.dataTransfer.files?.[0] ?? null);
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  p: 3,
                  border: "1px dashed",
                  borderColor: dragOver ? "primary.main" : "divider",
                  bgcolor: dragOver ? "action.hover" : "transparent",
                  borderRadius: 2,
                  cursor: "pointer",
                  transition: "all .15s ease",
                }}
              >
                <CloudUploadOutlinedIcon color="action" fontSize="large" />
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {file
                      ? file.name
                      : "Sleep een bestand hierheen of klik om te bladeren"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Max. 1 bestand, maximaal 10 MB.
                  </Typography>
                </Box>
                <input
                  type="file"
                  hidden
                  onChange={(e) =>
                    handleFileSelected(e.target.files?.[0] ?? null)
                  }
                />
              </Box>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SendIcon />}
                loading={loading}
              >
                Verzenden
              </Button>
            </Box>
          </Stack>
        </form>
      </FormProvider>
    </Container>
  );
};

export default SupportMessageForm;
