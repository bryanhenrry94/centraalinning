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
import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";

interface VerdictRegistrationFormProps {
  caseTransferId?: string | null;
  legalProcessId?: string | null;
  debtorName: string;
  defaultBailiffId?: string | null;
  gopFeeRatePercent: number;
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
// costos del alguacil se cargan en el mismo paso. Si es el PRIMER vonnis
// (caseTransferId), LegalProcessService.registerFirstVerdict lo registra
// como borrador (GOP_DRAFT) y genera el pago de la comisión CFSB (5% sobre
// el vonnisbedrag + wettelijke rente — es el participante quien paga a
// CFSB); el usuario paga en el momento vía PaymentIntent y el GOP recién
// queda oficialmente activo cuando ese pago se confirma. Los eventuales
// deurwaarderskosten cargados arriba tienen su propia comisión CFSB
// independiente (ver submitBailiffFeeInvoice), no ligada a esta activación.
// Si es una sentencia ADICIONAL sobre un GOP ya activo (legalProcessId),
// sigue sin gate de pago.
export const VerdictRegistrationForm: React.FC<
  VerdictRegistrationFormProps
> = ({
  caseTransferId,
  legalProcessId,
  debtorName,
  defaultBailiffId,
  gopFeeRatePercent,
}) => {
  const router = useRouter();
  const [bailiffs, setBailiffs] = useState<Bailiff[]>([]);
  // Se setea al registrar el borrador (primer vonnis), para poder navegar
  // al detalle del GOP una vez PaymentIntent confirma el pago.
  const [registeredLegalProcessId, setRegisteredLegalProcessId] = useState<
    string | null
  >(null);

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
    resolver: zodResolver(
      RegisterVerdictSchema,
    ) as unknown as Resolver<RegisterVerdictInput>,
    defaultValues,
  });

  const {
    handleSubmit,
    trigger,
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = methods;

  const uploadContext = { caseTransferId, legalProcessId };

  // Primer vonnis: se registra como borrador y el pago se hace en el momento
  // vía PaymentIntent (botón "Nu betalen" con polling propio) — el GOP recién
  // queda activo cuando ese pago se confirma (ver
  // LegalProcessService.registerFirstVerdict / processGopActivationPaymentConfirmed).
  const registerDraftAndPay = async (): Promise<{
    success: boolean;
    error?: string;
    paymentId?: string;
    paymentUrl?: string;
  }> => {
    const valid = await trigger();
    if (!valid) {
      notifyError("Controleer de invoer voordat u doorgaat.");
      return { success: false };
    }

    const confirmed = await AlertService.showConfirm(
      "Weet je het zeker?",
      "U staat op het punt een vonnis te registreren als borrador. De GOP-activeringscommissie (5%) wordt berekend over het vonnisbedrag plus de wettelijke rente. Wilt u doorgaan?",
      "Ja, registreren en betalen",
      "Annuleren",
    );
    if (!confirmed) return { success: false };

    try {
      const draft = (await registerGopVerdict(getValues())) as {
        legalProcessId: string;
        paymentId: string;
        paymentUrl: string;
      };
      setRegisteredLegalProcessId(draft.legalProcessId);
      return {
        success: true,
        paymentId: draft.paymentId,
        paymentUrl: draft.paymentUrl,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Registratie mislukt";
      notifyError(message);
      return { success: false, error: message };
    }
  };

  const handlePaymentConfirmed = async () => {
    notifySuccess("Betaling bevestigd. GOP is actief.");
    if (registeredLegalProcessId) {
      router.push(`/legal-processes/${registeredLegalProcessId}`);
    }
  };

  // Sentencia ADICIONAL sobre un GOP ya activo: sin gate de pago, igual que
  // antes.
  const onSubmitAdditional = async (data: RegisterVerdictInput) => {
    const confirmed = await AlertService.showConfirm(
      "Weet je het zeker?",
      "U staat op het punt een aanvullend vonnis te registreren. Wilt u doorgaan?",
      "Ja, vonnis registreren",
      "Annuleren",
    );
    if (!confirmed) return;

    try {
      const verdict = (await registerGopVerdict(data)) as {
        legal_process_id: string;
      };
      notifySuccess("Vonnis geregistreerd.");
      router.push(`/legal-processes/${verdict.legal_process_id}`);
    } catch (error) {
      notifyError(
        error instanceof Error ? error.message : "Registratie mislukt",
      );
    }
  };

  return (
    <Container
      maxWidth="lg"
      disableGutters
      sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
    >
      <FormProvider {...methods}>
        <form
          onSubmit={(e) => {
            // El registro del primer vonnis se dispara únicamente con el
            // botón de PaymentIntent (registra + paga), nunca con
            // Enter/submit nativo del formulario.
            if (caseTransferId) {
              e.preventDefault();
              return;
            }
            handleSubmit(onSubmitAdditional)(e);
          }}
        >
          <Paper
            component="section"
            sx={{ borderRadius: 1, overflow: "hidden", mb: 2 }}
          >
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
                        label="Beslissing bedrag"
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
                          field.value
                            ? new Date(field.value).toISOString().slice(0, 10)
                            : ""
                        }
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? new Date(e.target.value) : null,
                          )
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
                        label="Beslissing datum"
                        size="small"
                        fullWidth
                        slotProps={{ inputLabel: { shrink: true } }}
                        value={
                          field.value
                            ? new Date(field.value).toISOString().slice(0, 10)
                            : ""
                        }
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? new Date(e.target.value) : null,
                          )
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
                          field.onChange(
                            e.target.value ? Number(e.target.value) : null,
                          )
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
                          field.value
                            ? new Date(field.value).toISOString().slice(0, 10)
                            : ""
                        }
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? new Date(e.target.value) : null,
                          )
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
              <VerdictTotals gopFeeRatePercent={gopFeeRatePercent} />
            </Grid>
          </Grid>

          <Box
            sx={{
              mb: 2,
              mt: 2,
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "right",
              alignItems: { xs: "stretch", sm: "center" },
              gap: 1,
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{ minWidth: { sm: 220 } }}
            >
              {caseTransferId ? (
                <PaymentIntent
                  onCreateTransaction={registerDraftAndPay}
                  onPaymentConfirmed={handlePaymentConfirmed}
                />
              ) : (
                <Button
                  color="primary"
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  loading={isSubmitting}
                >
                  Vonnis registreren
                </Button>
              )}
            </Stack>
          </Box>
        </form>
      </FormProvider>
    </Container>
  );
};

export default VerdictRegistrationForm;
