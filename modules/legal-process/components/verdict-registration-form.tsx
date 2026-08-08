"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, Controller, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { AlertService } from "@/shared/ui/alerts";

import {
  RegisterVerdictInput,
  RegisterVerdictSchema,
} from "@/modules/legal-process/services/legal-process.validators";
import { registerGopVerdict } from "@/modules/legal-process/actions/legal-process.actions";
import { getActiveBailiffsDirectory } from "@/modules/bailiff/actions/bailiff.actions";
import { Bailiff } from "@/modules/bailiff/services/bailiff.validators";
import { BailiffSection } from "@/modules/verdict/components/sections/bailiff-section";
import StatutoryInterestSection from "@/modules/verdict/components/sections/statutory-interest-section";
import AttachmentSection from "@/modules/verdict/components/sections/attachment-section";
import ServiceCostsSection from "@/modules/verdict/components/sections/service-costs-section";
import VerdictTotals from "@/modules/verdict/components/verdict-totals";

interface VerdictRegistrationFormProps {
  caseTransferId?: string | null;
  legalProcessId?: string | null;
  debtorName: string;
  defaultBailiffId?: string | null;
}

const buildDefaultValues = (
  caseTransferId?: string | null,
  legalProcessId?: string | null,
  defaultBailiffId?: string | null,
): RegisterVerdictInput => ({
  caseTransferId: caseTransferId || null,
  legalProcessId: legalProcessId || null,
  invoice_number: "",
  creditor_name: "",
  registration_number: "",
  sentence_amount: 0,
  sentence_date: new Date(),
  court: "",
  notification_date: null,
  prescription_term_months: null,
  prescription_due_date: null,
  procesal_cost: 0,
  notes: "",
  bailiff_id: defaultBailiffId || "",
  verdict_interest: [],
  verdict_embargo: [],
  bailiff_services: [],
});

// Pantalla única de registro de vonnis: intereses (por tramos), embargos y
// costos del alguacil se cargan en el mismo paso que activa el GOP —
// LegalProcessService.registerVerdict crea LegalProcess + Verdict +
// Blockade + factura del 5% en una sola transacción.
export const VerdictRegistrationForm: React.FC<VerdictRegistrationFormProps> = ({
  caseTransferId,
  legalProcessId,
  debtorName,
  defaultBailiffId,
}) => {
  const router = useRouter();
  const [bailiffs, setBailiffs] = useState<Bailiff[]>([]);

  useEffect(() => {
    getActiveBailiffsDirectory()
      .then(setBailiffs)
      .catch(() => notifyError("Kon deurwaarders niet laden"));
  }, []);

  const defaultValues = useMemo(
    () => buildDefaultValues(caseTransferId, legalProcessId, defaultBailiffId),
    [caseTransferId, legalProcessId, defaultBailiffId],
  );

  const methods = useForm<RegisterVerdictInput>({
    resolver: zodResolver(RegisterVerdictSchema) as unknown as Resolver<RegisterVerdictInput>,
    defaultValues,
  });

  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = methods;

  const uploadContext = { caseTransferId, legalProcessId };

  const onSubmit = async (data: RegisterVerdictInput) => {
    const confirmed = await AlertService.showConfirm(
      "Weet je het zeker?",
      "U staat op het punt een vonnis te registreren. Hierdoor wordt het GOP-dossier geactiveerd. Wilt u doorgaan?",
      "Ja, vonnis registreren",
      "Annuleren",
    );
    if (!confirmed) return;

    try {
      const verdict = await registerGopVerdict(data);
      notifySuccess("Vonnis geregistreerd. GOP is actief.");
      router.push(`/legal-processes/${verdict.legal_process_id}`);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Registratie mislukt");
    }
  };

  return (
    <Container
      maxWidth="lg"
      disableGutters
      sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
    >
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Box
            sx={{
              mb: 2,
              mt: 2,
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "stretch", sm: "center" },
              gap: 1,
            }}
          >
            <Typography variant="h6" gutterBottom>
              VONNIS REGISTREREN — GOP ACTIVEREN
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                color="primary"
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                loading={isSubmitting}
              >
                Vonnis registreren
              </Button>
            </Stack>
          </Box>

          <Paper component="section" sx={{ borderRadius: 1, overflow: "hidden", mb: 2 }}>
            <Box
              sx={{
                bgcolor: "secondary.main",
                color: "white",
                px: 2,
                py: 1.5,
              }}
            >
              <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                VONNIS INFORMATIE
              </Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Schuldenaar"
                    size="small"
                    fullWidth
                    value={debtorName}
                    InputProps={{ readOnly: true }}
                    disabled
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="registration_number"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Zaaknummer / Vonnisnummer"
                        size="small"
                        fullWidth
                        error={!!errors.registration_number}
                        helperText={errors.registration_number?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="invoice_number"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Factuurnummer"
                        size="small"
                        fullWidth
                        error={!!errors.invoice_number}
                        helperText={errors.invoice_number?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="creditor_name"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Naam schuldeiser"
                        size="small"
                        fullWidth
                        error={!!errors.creditor_name}
                        helperText={errors.creditor_name?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="court"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        value={field.value ?? ""}
                        label="Rechtbank"
                        size="small"
                        fullWidth
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Controller
                    name="sentence_amount"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Toegewezen bedrag"
                        type="number"
                        size="small"
                        fullWidth
                        error={!!errors.sentence_amount}
                        helperText={errors.sentence_amount?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Controller
                    name="procesal_cost"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        value={field.value ?? 0}
                        label="Overige proceskosten"
                        type="number"
                        size="small"
                        fullWidth
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Controller
                    name="sentence_date"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="date"
                        label="Datum vonnis"
                        size="small"
                        fullWidth
                        slotProps={{ inputLabel: { shrink: true } }}
                        value={
                          field.value ? new Date(field.value).toISOString().slice(0, 10) : ""
                        }
                        onChange={(e) =>
                          field.onChange(e.target.value ? new Date(e.target.value) : null)
                        }
                        error={!!errors.sentence_date}
                        helperText={errors.sentence_date?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Controller
                    name="notification_date"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="date"
                        label="Datum betekening"
                        size="small"
                        fullWidth
                        slotProps={{ inputLabel: { shrink: true } }}
                        value={
                          field.value ? new Date(field.value).toISOString().slice(0, 10) : ""
                        }
                        onChange={(e) =>
                          field.onChange(e.target.value ? new Date(e.target.value) : null)
                        }
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Controller
                    name="prescription_term_months"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value ? Number(e.target.value) : null)
                        }
                        type="number"
                        label="Verjaringstermijn (maanden)"
                        size="small"
                        fullWidth
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Controller
                    name="prescription_due_date"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="date"
                        label="Verjaringsdatum"
                        size="small"
                        fullWidth
                        slotProps={{ inputLabel: { shrink: true } }}
                        value={
                          field.value ? new Date(field.value).toISOString().slice(0, 10) : ""
                        }
                        onChange={(e) =>
                          field.onChange(e.target.value ? new Date(e.target.value) : null)
                        }
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Controller
                    name="notes"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        value={field.value ?? ""}
                        label="Opmerkingen"
                        size="small"
                        fullWidth
                        multiline
                        minRows={2}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Box>
          </Paper>

          <BailiffSection
            handleOpenModalBailiff={() => {}}
            onSelectBailiff={() => {}}
            bailiffs={bailiffs}
          />

          <StatutoryInterestSection />

          <AttachmentSection uploadContext={uploadContext} />

          <ServiceCostsSection uploadContext={uploadContext} />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 8 }} />
            <Grid size={{ xs: 12, md: 4 }}>
              <VerdictTotals />
            </Grid>
          </Grid>
        </form>
      </FormProvider>
    </Container>
  );
};

export default VerdictRegistrationForm;
