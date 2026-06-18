"use client";

import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
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
import { useTenant } from "@/hooks/useTenant";
import { DebtorPicker } from "@/components/debtor-picker/DebtorPicker";
import { DebtorResponse } from "@/lib/validations/debtor";
import UploadIcon from "@mui/icons-material/Upload";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";

interface FormValues {
  debtorId: string;
  amount: number;
  reason: string;
}

export default function BlockCreatePage() {
  const { tenant } = useTenant();

  // Estados locales para manejar los documentos y el deudor seleccionado
  const [documents, setDocuments] = useState<File[]>([]);

  const [debtor, setDebtor] = React.useState<DebtorResponse | null>(null);

  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      debtorId: "",
      amount: 0,
      reason: "DEFAULT",
    },
  });

  const onSubmit = (data: FormValues) => {
    console.log(data);
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

  // logica de manejo de documentos (agregar, eliminar, etc.) se puede implementar aquí
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    setDocuments((prev) => [...prev, ...files]);

    // Permite volver a seleccionar el mismo archivo
    event.target.value = "";
  };

  const removeDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
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

  return (
    <Container maxWidth="lg">
      <Stack spacing={3} sx={{ py: 8 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            gap: 1,
            alignItems: "center",
          }}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Nieuwe blokkade registreren
            </Typography>

            <Typography color="text.secondary">
              Registreer een economische blokkade conform de geldende
              voorwaarden.
            </Typography>
          </Box>
        </Box>

        <Paper
          component="section"
          sx={{
            elevation: 1,
            borderRadius: 1,
            // overflow: "hidden",
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
                      <DebtorPicker
                        value={debtor}
                        onChange={(option) => {
                          handleChangeDebtor(option);
                          field.onChange(option?.id || "");
                        }}
                        onSearch={handleSearchPersons}
                        // disabled
                      />
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
                    >
                      <MenuItem value="DEFAULT">
                        Niet nagekomen betalingsverplichting
                      </MenuItem>
                    </TextField>
                  )}
                />
              </Grid>
            </Grid>
          </Box>
        </Paper>

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
              <input type="file" hidden multiple onChange={handleFileChange} />
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
                        onClick={() => downloadDocument(file)}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>

                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeDocument(index)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        <Box
          sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 2 }}
        >
          <Button
            variant="contained"
            onClick={handleSubmit(onSubmit)}
            sx={{ textTransform: "none" }}
          >
            Blokkade registreer
          </Button>
        </Box>
      </Stack>
    </Container>
  );
}
