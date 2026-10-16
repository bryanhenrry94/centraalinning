"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FormProvider,
  useForm,
  Controller,
  Resolver,
  useWatch,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { NumericFormat } from "react-number-format";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { AlertService } from "@/shared/ui/alerts";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";

import {
  RegisterVerdictInput,
  RegisterVerdictSchema,
} from "@/modules/legal-process/services/legal-process.validators";
import { registerGopVerdict } from "@/modules/legal-process/actions/legal-process.actions";
import StatutoryInterestSection from "@/modules/verdict/components/sections/statutory-interest-section";
import VerdictDocumentsSection from "@/modules/verdict/components/sections/verdict-documents-section";
import ServiceCostsSection from "@/modules/verdict/components/sections/service-costs-section";
import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";

interface VerdictRegistrationFormProps {
  caseTransferId?: string | null;
  legalProcessId?: string | null;
  debtorName: string;
  defaultBailiffId?: string | null;
  gopFeeRatePercent: number;
  dossierReference?: string | null;
  // Directe GOP (CCP-document "Directe COP en Directe GOP", §13): borrador
  // que el deelnemer ya ingresó antes de que el deurwaarder aceptara — se
  // precarga acá en vez de que el deurwaarder lo vuelva a escribir desde
  // cero. Undefined/null para la ruta normal (AOP -> advocaat/deurwaarder).
  directVerdictNumber?: string | null;
  directVerdictDate?: Date | null;
  directSentenceAmount?: number | null;
  directLegalInterest?: number | null;
}

const RECHTBANK_OPTIONS = [
  "Rechtbank Bonaire",
  "Rechtbank Curaçao",
  "Rechtbank Aruba",
  "Gemeenschappelijk Hof van Justitie",
];

const ZAAKTYPE_OPTIONS = [
  "Civiel",
  "Arbeidsrecht",
  "Huurrecht",
  "Incasso",
  "Overig",
];

// CCP-scherm (ajuste sponsor): 2 pasos, no 5 — paso 1 "Vonnis registreren"
// agrupa vonnisgegevens + wettelijke rente + documenten + financiële
// specificatie deelnemer (todo junto, sin sub-navegación); paso 2
// "Deurwaarderskosten" agrupa deurwaarderskosten + specificatie deurwaarder
// + status betalingen.
const STEP_LABELS = ["Vonnis registreren", "Deurwaarderskosten"];
const FIRST_SCREEN_LAST_STEP = 0;

const buildDefaultValues = (
  caseTransferId?: string | null,
  legalProcessId?: string | null,
  defaultBailiffId?: string | null,
  directVerdictNumber?: string | null,
  directVerdictDate?: Date | null,
  directSentenceAmount?: number | null,
): RegisterVerdictInput => ({
  caseTransferId: caseTransferId || null,
  legalProcessId: legalProcessId || null,
  invoice_number: "",
  creditor_name: "",
  registration_number: directVerdictNumber || "",
  sentence_amount: directSentenceAmount || 0,
  sentence_date: directVerdictDate || new Date(),
  court: "",
  case_type: "",
  short_description: "",
  notification_date: null,
  prescription_term_months: null,
  prescription_due_date: null,
  procesal_cost: 0,
  notes: "",
  bailiff_id: defaultBailiffId || "",
  documents: [],
  verdict_interest: [],
  verdict_embargo: [],
  bailiff_services: [],
});

// Campos que se validan antes de poder avanzar de cada paso — no todo el
// formulario, solo lo relevante a lo que el usuario ya completó.
const STEP_FIELDS: (keyof RegisterVerdictInput)[][] = [
  [
    "registration_number",
    "sentence_date",
    "sentence_amount",
    "procesal_cost",
    "documents",
  ],
  [],
];

function FinancialSummaryRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
      <Typography
        variant={bold ? "subtitle1" : "body2"}
        fontWeight={bold ? 700 : 400}
      >
        {label}
      </Typography>
      <Typography
        variant={bold ? "subtitle1" : "body2"}
        fontWeight={bold ? 700 : 600}
      >
        {value}
      </Typography>
    </Stack>
  );
}

// Pantalla partida en 2 pasos (CCP-scherm, ajuste sponsor): paso 1 "Vonnis
// registreren" agrupa vonnisgegevens + wettelijke rente + documenten +
// financiële specificatie deelnemer (sin sub-navegación entre ellas, todo
// visible junto); paso 2 "Deurwaarderskosten" agrupa deurwaarderskosten +
// specificatie deurwaarder + status betalingen. Si es el PRIMER vonnis
// (caseTransferId), el paso 2 registra el borrador (GOP_DRAFT) y genera los
// dos pagos CFSB (deelnemer + deurwaarder, ver
// LegalProcessService.registerFirstVerdict); el GOP recién queda activo
// cuando AMBOS se confirman. Si es una sentencia ADICIONAL sobre un GOP ya
// activo (legalProcessId), sigue sin gate de pago.
export const VerdictRegistrationForm: React.FC<
  VerdictRegistrationFormProps
> = ({
  caseTransferId,
  legalProcessId,
  debtorName,
  defaultBailiffId,
  gopFeeRatePercent,
  dossierReference,
  directVerdictNumber,
  directVerdictDate,
  directSentenceAmount,
  directLegalInterest,
}) => {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  // Se setea al registrar el borrador (primer vonnis), para poder navegar
  // al detalle del GOP una vez ambos pagos confirman.
  const [registeredLegalProcessId, setRegisteredLegalProcessId] = useState<
    string | null
  >(null);
  // Doble gate de activación (punto 10-11 GOP-analyse): el GOP recién queda
  // activo cuando AMBOS pagos se confirman — el del deelnemer (comisión CFSB
  // 5%, PaymentIntent de arriba) y el del deurwaarder (tarifa fija por
  // dossier vía CFSB, segundo PaymentIntent). Si el backend no generó pago
  // para el deurwaarder (tarifa en 0 para esta isla/tenant), ese lado ya
  // cuenta como saldado desde el inicio.
  const [participantPayment, setParticipantPayment] = useState<{
    paymentId: string;
    paymentUrl: string;
  } | null>(null);
  const [bailiffPayment, setBailiffPayment] = useState<{
    paymentId: string;
    paymentUrl: string;
  } | null>(null);
  const [participantPaid, setParticipantPaid] = useState(false);
  const [bailiffPaid, setBailiffPaid] = useState(false);

  const defaultValues = useMemo(
    () =>
      buildDefaultValues(
        caseTransferId,
        legalProcessId,
        defaultBailiffId,
        directVerdictNumber,
        directVerdictDate,
        directSentenceAmount,
      ),
    [
      caseTransferId,
      legalProcessId,
      defaultBailiffId,
      directVerdictNumber,
      directVerdictDate,
      directSentenceAmount,
    ],
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

  const sentenceAmount = useWatch({ control, name: "sentence_amount" });
  const sentenceDate = useWatch({ control, name: "sentence_date" });
  const verdictInterest = useWatch({ control, name: "verdict_interest" });
  const bailiffServices = useWatch({ control, name: "bailiff_services" });

  const totalInterest = useMemo(
    () =>
      (verdictInterest ?? []).reduce(
        (sum, item) => sum + (Number(item?.total_interest) || 0),
        0,
      ),
    [verdictInterest],
  );
  const totalBailiffCost = useMemo(
    () =>
      (bailiffServices ?? []).reduce(
        (sum, item) => sum + (Number(item?.service_cost) || 0),
        0,
      ),
    [bailiffServices],
  );
  const participantClaimTotal = (Number(sentenceAmount) || 0) + totalInterest;
  const participantCfsbCost = participantClaimTotal * (gopFeeRatePercent / 100);
  const bailiffCfsbCost = totalBailiffCost * (gopFeeRatePercent / 100);

  const handleNext = async () => {
    const fields = STEP_FIELDS[activeStep];
    if (fields.length) {
      const valid = await trigger(fields as any);
      if (!valid) {
        notifyError("Controleer de invoer voordat u doorgaat.");
        return;
      }
    }
    setActiveStep((step) => Math.min(step + 1, STEP_LABELS.length - 1));
  };
  const handleBack = () => setActiveStep((step) => Math.max(step - 1, 0));

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
      "U staat op het punt een vonnis te registreren als conceptregistratie. De GOP-activeringscommissie (5%) van de deelnemer wordt berekend over het vonnisbedrag plus de wettelijke rente. Mogelijk wordt hierbij ook een doorverwijzingstarief voor u als deurwaarder aangemaakt — het GOP wordt pas actief zodra beide betalingen bevestigd zijn. Wilt u doorgaan?",
      "Ja, registreren en betalen",
      "Annuleren",
    );
    if (!confirmed) return { success: false };

    try {
      const draft = (await registerGopVerdict(getValues())) as {
        legalProcessId: string;
        paymentId: string;
        paymentUrl: string;
        bailiffPaymentId: string | null;
        bailiffPaymentUrl: string | null;
      };
      setRegisteredLegalProcessId(draft.legalProcessId);
      setParticipantPayment({
        paymentId: draft.paymentId,
        paymentUrl: draft.paymentUrl,
      });
      if (draft.bailiffPaymentId && draft.bailiffPaymentUrl) {
        setBailiffPayment({
          paymentId: draft.bailiffPaymentId,
          paymentUrl: draft.bailiffPaymentUrl,
        });
      } else {
        // Geen doorverwijzingstarief vereist voor deze isla/tenant — dat
        // lado del gate ya está saldado de entrada.
        setBailiffPaid(true);
      }
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

  // Segundo PaymentIntent (lado del deurwaarder): el pago ya fue creado por
  // registerDraftAndPay, acá solo se abre el link/polling correspondiente.
  const payBailiffReferralFee = async (): Promise<{
    success: boolean;
    error?: string;
    paymentId?: string;
    paymentUrl?: string;
  }> => {
    if (!bailiffPayment) {
      return { success: false, error: "Er is nog geen betaling beschikbaar." };
    }
    return {
      success: true,
      paymentId: bailiffPayment.paymentId,
      paymentUrl: bailiffPayment.paymentUrl,
    };
  };

  const handleParticipantPaymentConfirmed = async () => {
    notifySuccess("Betaling van de deelnemer bevestigd.");
    setParticipantPaid(true);
  };

  const handleBailiffPaymentConfirmed = async () => {
    notifySuccess("Betaling van de deurwaarder bevestigd.");
    setBailiffPaid(true);
  };

  // Navega al GOP-dossier recién cuando AMBOS lados del gate confirmaron.
  useEffect(() => {
    if (participantPaid && bailiffPaid && registeredLegalProcessId) {
      notifySuccess("Beide betalingen bevestigd. GOP is actief.");
      router.push(`/legal-processes/${registeredLegalProcessId}`);
    }
  }, [participantPaid, bailiffPaid, registeredLegalProcessId, router]);

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

  const onScreen1 = activeStep <= FIRST_SCREEN_LAST_STEP;

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
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ sm: "center" }}
            spacing={1}
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography variant="h4" fontWeight={700}>
                {onScreen1 ? "Vonnis registreren" : "Deurwaarderskosten"}
              </Typography>
              {dossierReference && (
                <Typography variant="body2" color="text.secondary">
                  Dossier {dossierReference} — Schuldenaar: {debtorName}
                </Typography>
              )}
            </Box>
            {registeredLegalProcessId && (
              <Chip
                label="Conceptregistratie — betaling in afwachting"
                color="warning"
                sx={{ fontWeight: 700 }}
              />
            )}
          </Stack>

          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
            {STEP_LABELS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {directVerdictNumber && activeStep === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Directe GOP: de deelnemer registreerde dit vonnis zelf vóór uw
              acceptatie. Vonnisnummer, datum en veroordelingsbedrag hieronder
              zijn al voorgevuld — controleer en corrigeer indien nodig.
              {directLegalInterest
                ? ` De deelnemer gaf ook een wettelijke rente van ${directLegalInterest} door — voeg de bijbehorende renteberekening(en) hieronder toe.`
                : ""}
            </Alert>
          )}

          {/* Paso 1: Vonnisgegevens */}
          {activeStep === 0 && (
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
                <Typography
                  variant="h6"
                  component="h3"
                  sx={{ fontWeight: 600 }}
                >
                  VONNISGEGEVENS
                </Typography>
              </Box>
              <Box sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="court"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          value={field.value ?? ""}
                          select
                          label="Rechtbank"
                          size="small"
                          fullWidth
                        >
                          {RECHTBANK_OPTIONS.map((option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="registration_number"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Vonnisnummer / Zaaknummer"
                          size="small"
                          fullWidth
                          required
                          error={!!errors.registration_number}
                          helperText={errors.registration_number?.message}
                        />
                      )}
                    />
                  </Grid>
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
                      name="sentence_date"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          type="date"
                          label="Beslissing datum"
                          size="small"
                          fullWidth
                          required
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

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="case_type"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          value={field.value ?? ""}
                          select
                          label="Zaaktype"
                          size="small"
                          fullWidth
                        >
                          {ZAAKTYPE_OPTIONS.map((option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Controller
                      name="sentence_amount"
                      control={control}
                      render={({ field }) => (
                        <NumericFormat
                          customInput={TextField}
                          label="Veroordelingsbedrag"
                          size="small"
                          fullWidth
                          required
                          value={field.value ?? ""}
                          thousandSeparator
                          decimalScale={2}
                          fixedDecimalScale
                          allowNegative={false}
                          prefix="$ "
                          onValueChange={(values) =>
                            field.onChange(Number(values.value) || 0)
                          }
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
                        <NumericFormat
                          customInput={TextField}
                          label="Overige proceskosten"
                          size="small"
                          fullWidth
                          value={field.value ?? ""}
                          thousandSeparator
                          decimalScale={2}
                          fixedDecimalScale
                          allowNegative={false}
                          prefix="$ "
                          onValueChange={(values) =>
                            field.onChange(Number(values.value) || 0)
                          }
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
                </Grid>
              </Box>
            </Paper>
          )}

          {/* Wettelijke rente — agrupado dentro del paso 1 "Vonnis registreren" */}
          {activeStep === 0 && <StatutoryInterestSection />}

          {/* Documenten — agrupado dentro del paso 1 "Vonnis registreren" */}
          {activeStep === 0 && (
            <VerdictDocumentsSection uploadContext={uploadContext} />
          )}

          {/* Financiële specificatie deelnemer — agrupado dentro del paso 1 */}
          {activeStep === 0 && (
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
                <Typography
                  variant="h6"
                  component="h3"
                  sx={{ fontWeight: 600 }}
                >
                  FINANCIËLE SPECIFICATIE DEELNEMER
                </Typography>
              </Box>
              <Box sx={{ p: 2 }}>
                <FinancialSummaryRow
                  label="Veroordelingsbedrag (hoofdsom)"
                  value={formatCurrency(Number(sentenceAmount) || 0)}
                />
                <FinancialSummaryRow
                  label={`Wettelijke rente${sentenceDate ? ` (t/m ${formatDate(new Date(sentenceDate).toString())})` : ""}`}
                  value={formatCurrency(totalInterest)}
                />
                <Divider sx={{ my: 1 }} />
                <FinancialSummaryRow
                  label="Totaal (vordering + rente)"
                  value={formatCurrency(participantClaimTotal)}
                  bold
                />
                <Box sx={{ mt: 2, p: 2, bgcolor: "#EAF2FE", borderRadius: 1 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={700}>
                        CFSB-kosten deelnemer
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Totaalbedrag (inclusief ABB)
                      </Typography>
                    </Box>
                    <Typography
                      variant="h6"
                      fontWeight={700}
                      color="primary.main"
                    >
                      {formatCurrency(participantCfsbCost)}
                    </Typography>
                  </Stack>
                </Box>
              </Box>
            </Paper>
          )}

          {/* Paso 2 / Scherm 2: Deurwaarderskosten */}
          {activeStep === 1 && (
            <>
              <ServiceCostsSection uploadContext={uploadContext} />

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
                  <Typography
                    variant="h6"
                    component="h3"
                    sx={{ fontWeight: 600 }}
                  >
                    SPECIFICATIE DEURWAARDER
                  </Typography>
                </Box>
                <Box sx={{ p: 2 }}>
                  <FinancialSummaryRow
                    label="Totaal deurwaarderskosten"
                    value={formatCurrency(totalBailiffCost)}
                  />
                  <Box
                    sx={{ mt: 2, p: 2, bgcolor: "#EAF2FE", borderRadius: 1 }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          CFSB-kosten deurwaarder
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Totaalbedrag (inclusief ABB)
                        </Typography>
                      </Box>
                      <Typography
                        variant="h6"
                        fontWeight={700}
                        color="primary.main"
                      >
                        {formatCurrency(bailiffCfsbCost)}
                      </Typography>
                    </Stack>
                  </Box>
                </Box>
              </Paper>

              {caseTransferId && (
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
                    <Typography
                      variant="h6"
                      component="h3"
                      sx={{ fontWeight: 600 }}
                    >
                      STATUS BETALINGEN
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2 }}>
                    <Stack spacing={2}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        justifyContent="space-between"
                        alignItems={{ sm: "center" }}
                        spacing={1}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          Deelnemer — CFSB-kosten
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            size="small"
                            label={
                              participantPaid ? "Betaald" : "In afwachting"
                            }
                            color={participantPaid ? "success" : "warning"}
                          />
                          {!registeredLegalProcessId ? (
                            <PaymentIntent
                              onCreateTransaction={registerDraftAndPay}
                              onPaymentConfirmed={
                                handleParticipantPaymentConfirmed
                              }
                              buttonLabel="Betaal via Sentoo"
                            />
                          ) : !participantPaid && participantPayment ? (
                            <PaymentIntent
                              onCreateTransaction={async () => ({
                                success: true,
                                paymentId: participantPayment.paymentId,
                                paymentUrl: participantPayment.paymentUrl,
                              })}
                              onPaymentConfirmed={
                                handleParticipantPaymentConfirmed
                              }
                              existingPayment={participantPayment}
                              buttonLabel="Betaal via Sentoo"
                            />
                          ) : participantPaid && participantPayment ? (
                            <Button
                              size="small"
                              variant="outlined"
                              sx={{ textTransform: "none" }}
                              onClick={() =>
                                window.open(
                                  participantPayment.paymentUrl,
                                  "_blank",
                                )
                              }
                            >
                              Bekijk betaling
                            </Button>
                          ) : null}
                        </Stack>
                      </Stack>

                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        justifyContent="space-between"
                        alignItems={{ sm: "center" }}
                        spacing={1}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          Deurwaarder — CFSB-kosten
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            size="small"
                            label={bailiffPaid ? "Betaald" : "In afwachting"}
                            color={bailiffPaid ? "success" : "warning"}
                          />
                          {bailiffPayment && !bailiffPaid && (
                            <PaymentIntent
                              onCreateTransaction={payBailiffReferralFee}
                              onPaymentConfirmed={handleBailiffPaymentConfirmed}
                              existingPayment={bailiffPayment}
                              buttonLabel="Betaal via Sentoo"
                            />
                          )}
                          {bailiffPayment && bailiffPaid && (
                            <Button
                              size="small"
                              variant="outlined"
                              sx={{ textTransform: "none" }}
                              onClick={() =>
                                window.open(bailiffPayment.paymentUrl, "_blank")
                              }
                            >
                              Bekijk betaling
                            </Button>
                          )}
                        </Stack>
                      </Stack>
                    </Stack>

                    <Alert severity="info" sx={{ mt: 2 }}>
                      Het vonnis is als conceptregistratie geregistreerd. De GOP
                      wordt geactiveerd zodra beide CFSB-betalingen zijn
                      ontvangen.
                    </Alert>

                    <Box sx={{ mt: 2 }}>
                      <Controller
                        name="notes"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            value={field.value ?? ""}
                            label="Opmerkingen (optioneel)"
                            size="small"
                            fullWidth
                            multiline
                            minRows={2}
                          />
                        )}
                      />
                    </Box>
                  </Box>
                </Paper>
              )}
            </>
          )}

          <Box
            sx={{
              mb: 2,
              mt: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "stretch", sm: "center" },
              flexDirection: { xs: "column", sm: "row" },
              gap: 1,
            }}
          >
            <Button
              type="button"
              color="inherit"
              startIcon={<ArrowBackIcon />}
              disabled={activeStep === 0}
              onClick={handleBack}
              sx={{ textTransform: "none" }}
            >
              Terug
            </Button>

            {activeStep < STEP_LABELS.length - 1 ? (
              <Button
                type="button"
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                onClick={handleNext}
                sx={{ textTransform: "none" }}
              >
                {activeStep === FIRST_SCREEN_LAST_STEP
                  ? "Deurwaarderskosten invoeren"
                  : "Volgende"}
              </Button>
            ) : (
              !caseTransferId && (
                <Button
                  color="primary"
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  loading={isSubmitting}
                  sx={{ textTransform: "none" }}
                >
                  Vonnis registreren
                </Button>
              )
            )}
          </Box>

          {registeredLegalProcessId &&
            (participantPaid !== true || bailiffPaid !== true) && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Het GOP wordt pas actief zodra{" "}
                {!participantPaid && !bailiffPaid
                  ? "zowel de deelnemer als de deurwaarder betaald hebben"
                  : !participantPaid
                    ? "de deelnemer betaald heeft (de deurwaarder betaalde al)"
                    : "de deurwaarder betaald heeft (de deelnemer betaalde al)"}
                .
              </Alert>
            )}
        </form>
      </FormProvider>
    </Container>
  );
};

export default VerdictRegistrationForm;
