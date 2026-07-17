"use client";

import React, { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogContent,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { NumericFormat } from "react-number-format";
import { useTenant } from "@/modules/auth/hooks/useTenant";
import { DebtorPicker } from "@/modules/collection/components/DebtorPicker";
import { DebtorResponse } from "@/modules/collection/services/debtor.validators";
import UploadIcon from "@mui/icons-material/Upload";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  BlockadeDocument,
  BlockadeSchema,
  CreateBlockadeInput,
} from "@/modules/blockade/services/blockade.validators";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createBlockadeAction,
  updatePaymentReference,
} from "@/modules/blockade/actions/create-blockade";
import { notifyError, notifyInfo } from "@/shared/ui/notifications";
import CloseIcon from "@mui/icons-material/Close";
import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";
import { formatCurrency } from "@/shared/utils/formatters";
import { useRouter } from "next/navigation";
import { REASONS } from "@/modules/blockade/constants/reason-blockades";
import { PaymentType } from "@/modules/payment/services/payment.validators";

const ALLOWED_TYPES = [
  "application/pdf",

  // Word
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  // Excel
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  // Imágenes
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];

export default function BlockCreatePage() {
  const { tenant } = useTenant();

  const router = useRouter();

  // Estados locales para manejar los documentos y el deudor seleccionado
  const [documents, setDocuments] = useState<File[]>([]);

  const [debtor, setDebtor] = React.useState<DebtorResponse | null>(null);

  const [showCostDialog, setShowCostDialog] = useState(false);
  const [pendingFormValues, setPendingFormValues] =
    useState<CreateBlockadeInput>();

  const amountService = 35.0; // monto fijo para el servicio, se puede ajustar según sea necesario

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<CreateBlockadeInput>({
    resolver: zodResolver(BlockadeSchema),
    defaultValues: {
      debtorId: "",
      amount: 0,
      reason: "UNPAID_PAYMENT",
      documents: [],
    },
  });

  const onSubmit = async (data: CreateBlockadeInput) => {
    // Validación con react-hook-form + zod ya pasó
    setPendingFormValues(data);
    setShowCostDialog(true);
  };

  const handleChangeDebtor = (debtor: DebtorResponse | null) => {
    if (debtor) {
      const debtorWithDates = {
        ...debtor,
      };
      setDebtor(debtorWithDates);
    } else {
      setDebtor(null);
    }
  };

  const handleSearchPersons = async (query: string) => {
    if (!tenant?.id) return [];

    const response = await fetch(
      `/api/debtors/search?q=${encodeURIComponent(query)}`,
    );
    const data = await response.json();

    return data.data;
  };

  const mapFileToDocument = (file: File): BlockadeDocument => {
    return {
      file: file,
      fileName: file.name,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
    };
  };

  // logica de manejo de documentos (agregar, eliminar, etc.) se puede implementar aquí
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    const validFiles = files.filter((file) =>
      ALLOWED_TYPES.includes(file.type),
    );

    const invalidFiles = files.filter(
      (file) => !ALLOWED_TYPES.includes(file.type),
    );

    if (invalidFiles.length > 0) {
      notifyError("Solo se permiten archivos PDF, Word, Excel e imágenes.");
    }

    if (validFiles.length === 0) {
      event.target.value = "";
      return;
    }

    setDocuments((prevFiles) => {
      const updatedFiles = [...prevFiles, ...validFiles];

      const mappedDocuments = updatedFiles.map(mapFileToDocument);

      setValue("documents", mappedDocuments, {
        shouldValidate: true,
        shouldDirty: true,
      });

      return updatedFiles;
    });

    event.target.value = "";
  };

  const removeDocument = (index: number) => {
    setDocuments((prevFiles) => {
      const updatedFiles = prevFiles.filter((_, i) => i !== index);

      const mappedDocuments = updatedFiles.map(mapFileToDocument);

      setValue("documents", mappedDocuments, {
        shouldValidate: true,
        shouldDirty: true,
      });

      return updatedFiles;
    });
  };

  const downloadDocument = (file: File) => {
    const url = URL.createObjectURL(file);

    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();

    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handlePaymentFailed = async (_paymentId: string) => {
    setShowCostDialog(false);
    notifyError("Betaling mislukt. Probeer het opnieuw.");

    // espera 3 segundos antes de resetear el formulario para que el usuario pueda ver la notificación
    setTimeout(() => {
      router.push("/blocks");
    }, 3000);
  };

  const handlePaymentConfirmed = async (paymentId: string) => {
    setShowCostDialog(false);
    notifyInfo("Betaling bevestigd. Blokkade wordt geregistreerd...");
  };

  const handleCreateTransaction = async (): Promise<{
    success: boolean;
    error?: string;
    paymentId?: string;
    paymentUrl?: string;
  }> => {
    if (!pendingFormValues) {
      notifyError("Geen formuliergegevens beschikbaar");
      return { success: false, error: "Geen formuliergegevens beschikbaar" };
    }

    if (amountService <= 0) {
      notifyError("Het servicebedrag moet groter zijn dan 0");
      return { success: false, error: "Servicebedrag is 0" };
    }

    const resBlockade = await createBlockadeAction(
      pendingFormValues,
      tenant?.id || "",
    );

    if (!resBlockade.success) {
      return {
        success: false,
        error:
          resBlockade.message ||
          "Error al registrar la blokkade. Inténtalo de nuevo.",
      };
    }

    const res = await fetch("/api/payments/create", {
      method: "POST",
      body: JSON.stringify({
        amount: amountService,
        currency: "USD",
        description: "Payment for registering blokkade",
        payment_type: PaymentType.BLOK_CHECK,
      }),
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      notifyError("Fout bij het aanmaken van de betaling");
      return { success: false, error: "Payment creation failed" };
    }

    const data = await res.json();

    // relaciona de daadwerkelijke betaling met de blokkade (DRAFT)
    const linkResult = await updatePaymentReference(resBlockade.id!, {
      paymentId: data.paymentId,
    });

    if (!linkResult.success) {
      notifyError(
        linkResult.message ||
          "Kon de betaling niet koppelen aan de blokkade.",
      );
      return {
        success: false,
        error: linkResult.message || "Kon de betaling niet koppelen",
      };
    }

    return {
      success: true,
      paymentId: data.paymentId,
      paymentUrl: data.paymentUrl,
    };
  };

  return (
    <Container
      maxWidth="lg"
      disableGutters
      sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: 1,
          alignItems: "center",
          mb: { xs: 2, sm: 4 },
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Nieuwe blokkade registreren
          </Typography>

          <Typography color="text.secondary">
            Registreer een economische blokkade conform de geldende voorwaarden.
          </Typography>
        </Box>
      </Box>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={3} sx={{ py: { xs: 2, sm: 8 } }}>
          {/* Cabecera */}
          <Paper
            component="section"
            sx={{
              elevation: 1,
              borderRadius: 1,
              mb: 2,
            }}
          >
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
              }}
            >
              <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                BLOKKADE INFORMATIE
              </Typography>
            </Box>

            <Box sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Controller
                      name="debtorId"
                      control={control}
                      render={({ field }) => (
                        <Box
                          sx={{
                            width: "100%",
                            display: "flex",
                            flexDirection: "column",
                          }}
                        >
                          <DebtorPicker
                            value={debtor}
                            onChange={(option) => {
                              handleChangeDebtor(option);
                              field.onChange(option?.id || "");
                            }}
                            onSearch={handleSearchPersons}
                            // disabled
                          />

                          {errors.debtorId && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: "error.main",
                                display: "block",
                                mt: 0.5,
                              }}
                            >
                              {errors.debtorId.message}
                            </Typography>
                          )}
                        </Box>
                      )}
                    />
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Controller
                    name="amount"
                    control={control}
                    render={({ field, fieldState }) => (
                      <NumericFormat
                        customInput={TextField}
                        fullWidth
                        label="Openstaand bedrag"
                        value={field.value ?? ""}
                        thousandSeparator
                        decimalScale={2}
                        fixedDecimalScale
                        allowNegative={false}
                        prefix="$ "
                        size="small"
                        onValueChange={(values) => {
                          field.onChange(Number(values.value) || 0);
                        }}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Controller
                    name="reason"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        select
                        label="Reden Blokkade"
                        fullWidth
                        size="small"
                        error={!!errors.reason}
                        helperText={errors.reason?.message}
                      >
                        {REASONS.map((reason) => (
                          <MenuItem key={reason.value} value={reason.value}>
                            {reason.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>
              </Grid>
            </Box>
          </Paper>

          {/* Detalle */}
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Bewijsstukken
              </Typography>

              <Button
                variant="outlined"
                component="label"
                color="secondary"
                startIcon={<UploadIcon />}
                sx={{ textTransform: "none" }}
              >
                Document toevoegen
                <input
                  type="file"
                  hidden
                  multiple
                  accept="
                    .pdf,
                    .doc,.docx,
                    .xls,.xlsx,
                    .png,.jpg,.jpeg,.gif,.webp
                  "
                  onChange={handleFileChange}
                />
              </Button>

              {documents.length > 0 && (
                <Stack spacing={1.5} mt={2}>
                  {documents.map((file, index) => (
                    <Box
                      key={`${file.name}-${index}`}
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      border={1}
                      borderColor="divider"
                      borderRadius={1}
                      p={1.5}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {file.name}
                        </Typography>

                        <Typography variant="caption" color="text.secondary">
                          {formatFileSize(file.size)}
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={0.5}>
                        <IconButton
                          size="small"
                          type="button"
                          onClick={() => downloadDocument(file)}
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>

                        <IconButton
                          size="small"
                          color="error"
                          type="button"
                          onClick={() => removeDocument(index)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}

              {errors.documents && (
                <Typography
                  color="error"
                  variant="caption"
                  sx={{ mt: 1, display: "block" }}
                >
                  {errors.documents.message}
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Botones */}
          <Box
            sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 2 }}
          >
            <Button
              variant="contained"
              type="submit"
              sx={{ textTransform: "none" }}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Bezig met registreren..."
                : "Blokkade registreer"}
            </Button>
          </Box>
        </Stack>
      </form>

      {/* Dialoogvenster kostenbevesting */}
      <Dialog
        open={showCostDialog}
        onClose={() => setShowCostDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogContent sx={{ p: { xs: 2, sm: 4 } }}>
          <Stack spacing={3} alignItems="center">
            {/* Titel */}
            <Stack spacing={1} textAlign="center">
              <Typography variant="h5" fontWeight={700}>
                Betaling bevestigen
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Deze service vereist betaling voordat u de blokkade registreert.
              </Typography>
            </Stack>

            {/* Prijs */}
            <Paper
              variant="outlined"
              sx={{
                width: "100%",
                p: 2,
                borderRadius: 2,
                textAlign: "center",
                bgcolor: "background.default",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Servicewaarde
              </Typography>

              <Typography variant="h4" fontWeight={700} color="primary.main">
                {formatCurrency(amountService)}
              </Typography>
            </Paper>

            {/* Bericht */}
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
            >
              Als u doorgaat, wordt u doorgestuurd naar het beveiligde
              betalingsproces.
            </Typography>

            {/* Acties */}
            <Stack direction="row" spacing={2} width="100%">
              <Button
                fullWidth
                variant="outlined"
                color="inherit"
                startIcon={<CloseIcon />}
                onClick={() => setShowCostDialog(false)}
                sx={{ textTransform: "none" }}
              >
                Annuleren
              </Button>

              <PaymentIntent
                onCreateTransaction={handleCreateTransaction}
                onPaymentConfirmed={handlePaymentConfirmed}
                onPaymentFailed={handlePaymentFailed}
              />
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </Container>
  );
}
