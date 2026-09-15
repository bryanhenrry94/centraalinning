"use client";
import React, { useState } from "react";
import { useForm, FormProvider, Controller, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Box,
  Button,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import { notifyError } from "@/shared/ui/notifications";
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
  message: "",
};

const MAX_MESSAGE_LENGTH = 1000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface SupportMessageFormProps {
  onSubmitted?: () => void;
}

export const SupportMessageForm: React.FC<SupportMessageFormProps> = ({
  onSubmitted,
}) => {
  const [file, setFile] = useState<File | null>(null);
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
    reset,
    formState: { errors },
  } = methods;

  const messageLength = watch("message")?.length ?? 0;

  const handleFileSelected = (selected: File | null) => {
    if (selected && selected.size > MAX_FILE_SIZE) {
      notifyError("Het bestand mag maximaal 10 MB zijn");
      return;
    }
    setFile(selected);
  };

  const handleCancel = () => {
    reset(defaultValues);
    setFile(null);
  };

  const onSubmit = async (data: CreateSupportMessageInput) => {
    setLoading(true);
    try {
      await submitSupportMessage(data, file ?? undefined);
      reset(defaultValues);
      setFile(null);
      onSubmitted?.();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Verzenden mislukt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
        Nieuw bericht
      </Typography>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
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
                      placeholder="Vul het onderwerp in"
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
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Categorie"
                      required
                      fullWidth
                      size="small"
                      error={!!errors.type}
                      helperText={errors.type?.message}
                    >
                      {SUPPORT_MESSAGE_TYPE_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
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
                    placeholder="Typ hier uw bericht..."
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

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Button
                component="label"
                variant="outlined"
                size="small"
                startIcon={<AttachFileIcon />}
              >
                Bijlage toevoegen
                <input
                  type="file"
                  hidden
                  onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
                />
              </Button>
              {file && (
                <>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {file.name}
                  </Typography>
                  <IconButton size="small" onClick={() => setFile(null)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </>
              )}
            </Box>

            <Divider />

            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
              <Button
                type="button"
                variant="outlined"
                onClick={handleCancel}
                disabled={loading}
              >
                Annuleren
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SendIcon />}
                loading={loading}
              >
                Versturen
              </Button>
            </Box>
          </Stack>
        </form>
      </FormProvider>
    </Paper>
  );
};

export default SupportMessageForm;
