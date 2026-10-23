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
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
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
import LockIcon from "@mui/icons-material/Lock";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { AlertService } from "@/shared/ui/alerts";
import { formatCurrency } from "@/shared/utils/formatters";

import {
  RegisterVerdictInput,
  RegisterVerdictSchema,
} from "@/modules/legal-process/services/legal-process.validators";
import { registerGopVerdict } from "@/modules/legal-process/actions/legal-process.actions";
import StatutoryInterestSection from "@/modules/verdict/components/sections/statutory-interest-section";
import VerdictDocumentsSection from "@/modules/verdict/components/sections/verdict-documents-section";
import ServiceCostsSection from "@/modules/verdict/components/sections/service-costs-section";

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
// agrupa vonnisgegevens + wettelijke rente + documenten (todo junto, sin
// sub-navegación); paso 2 "Deurwaarderskosten" agrupa deurwaarderskosten +
// specificatie deurwaarder + el botón único "Betalen en registreren".
const STEP_LABELS = ["Vonnis registreren", "Executie en kosten"];
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
  // Alt. a que el alguacil tenga que hacer clic en "Nieuwe renteberekening
  // toevoegen" antes de poder ingresar nada — la mayoría de los vonnissen
  // llevan al menos un tramo de rente, así que se deja una fila en blanco
  // lista para completar.
  verdict_interest: [
    {
      interest_type: "",
      base_amount: 0,
      calculated_interest: 0,
      calculation_start: new Date(),
      calculation_end: new Date(),
      total_interest: 0,
      details: [],
    },
  ],
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
// registreren" agrupa vonnisgegevens + wettelijke rente + documenten (sin
// sub-navegación entre ellas, todo visible junto); paso 2
// "Deurwaarderskosten" agrupa deurwaarderskosten + specificatie deurwaarder
// + el botón "Betalen en registreren". Si es el PRIMER vonnis
// (caseTransferId), ese botón registra el borrador (GOP_DRAFT) y cobra EN
// PANTALLA solo el tarifa propio del deurwaarder — el deelnemer no interactúa
// con esta pantalla; recibe su link de pago por correo recién cuando ese
// tarifa se confirma (ver LegalProcessService.registerFirstVerdict /
// processBailiffReferralPaymentConfirmed). El GOP recién queda activo cuando
// AMBOS pagos se confirman. Si es una sentencia ADICIONAL sobre un GOP ya
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
  // al detalle del GOP una vez el alguacil pagó su propio tarifa.
  const [registeredLegalProcessId, setRegisteredLegalProcessId] = useState<
    string | null
  >(null);
  // Acá solo se cobra/espera el lado del DEURWAARDER (su propio tarifa CFSB,
  // in-app). El lado del deelnemer (comisión CFSB 5%) ya no se muestra ni se
  // paga desde esta pantalla — una vez confirmado el pago del deurwaarder, el
  // backend le envía el link de pago por correo (ver
  // LegalProcessService.processBailiffReferralPaymentConfirmed). El GOP sigue
  // en GOP_DRAFT ("Wacht op betaling") hasta que el deelnemer también pague.
  const [bailiffPayment, setBailiffPayment] = useState<{
    paymentId: string;
    paymentUrl: string;
  } | null>(null);
  const [bailiffPaid, setBailiffPaid] = useState(false);
  const [payingAndRegistering, setPayingAndRegistering] = useState(false);
  const [waitingBailiffConfirmation, setWaitingBailiffConfirmation] =
    useState(false);

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

  const bailiffServices = useWatch({ control, name: "bailiff_services" });

  const totalBailiffCost = useMemo(
    () =>
      (bailiffServices ?? []).reduce(
        (sum, item) => sum + (Number(item?.service_cost) || 0),
        0,
      ),
    [bailiffServices],
  );
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

  // Primer vonnis: registra el borrador (GOP_DRAFT) y, en el mismo clic,
  // cobra el tarifa propio del deurwaarder vía Sentoo — el deelnemer no
  // interactúa con esta pantalla; recibe su link de pago por correo recién
  // cuando ese tarifa se confirma (ver
  // LegalProcessService.registerFirstVerdict /
  // processBailiffReferralPaymentConfirmed). Als er voor deze isla/tenant
  // geen doorverwijzingstarief geldt, is dat lado van entrada saldado.
  const handlePayAndRegister = async () => {
    const valid = await trigger();
    if (!valid) {
      notifyError("Controleer de invoer voordat u doorgaat.");
      return;
    }

    const confirmed = await AlertService.showConfirm(
      "Weet je het zeker?",
      "U staat op het punt het vonnis als concept te registreren. Na bevestiging van de betaling ontvangt de deelnemer een betaalverzoek voor de GOP-activering, die ingaat zodra de vereiste activeringsbetaling is bevestigd.",
      "Ja, betalen en registreren",
      "Annuleren",
    );
    if (!confirmed) return;

    setPayingAndRegistering(true);
    try {
      const draft = (await registerGopVerdict(getValues())) as {
        legalProcessId: string;
        bailiffPaymentId: string | null;
        bailiffPaymentUrl: string | null;
      };
      setRegisteredLegalProcessId(draft.legalProcessId);

      if (draft.bailiffPaymentId && draft.bailiffPaymentUrl) {
        setBailiffPayment({
          paymentId: draft.bailiffPaymentId,
          paymentUrl: draft.bailiffPaymentUrl,
        });
        window.open(draft.bailiffPaymentUrl, "_blank");
        setWaitingBailiffConfirmation(true);
      } else {
        // Geen doorverwijzingstarief vereist voor deze isla/tenant — dat
        // lado del gate ya está saldado de entrada.
        notifySuccess(
          "Vonnis geregistreerd. Er is voor dit dossier geen deurwaarderstarief vereist.",
        );
        setBailiffPaid(true);
      }
    } catch (error) {
      notifyError(
        error instanceof Error ? error.message : "Registratie mislukt",
      );
    } finally {
      setPayingAndRegistering(false);
    }
  };

  const handleBailiffPaymentConfirmed = () => {
    setWaitingBailiffConfirmation(false);
    notifySuccess(
      "Betaling van de deurwaarderskosten bevestigd. De deelnemer ontvangt nu de betalingslink per e-mail.",
    );
    setBailiffPaid(true);
  };

  // Polling propio del pago del deurwaarder (mismo patrón que
  // PaymentIntent, pero sin su botón: el link ya se abrió en
  // handlePayAndRegister).
  useEffect(() => {
    if (!waitingBailiffConfirmation || !bailiffPayment) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/payments/${bailiffPayment.paymentId}/status`,
        );
        const data = await res.json();
        if (data.status === "paid") {
          clearInterval(interval);
          handleBailiffPaymentConfirmed();
        } else if (data.status === "failed") {
          clearInterval(interval);
          setWaitingBailiffConfirmation(false);
          notifyError("De betaling van de deurwaarderskosten is mislukt.");
        }
      } catch (err) {
        console.error("Error en polling de pago", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [waitingBailiffConfirmation, bailiffPayment]);

  // Navega al GOP-dossier una vez el lado del deurwaarder quedó resuelto
  // (pagado, o sin tarifa requerida) — el GOP sigue en GOP_DRAFT hasta que
  // el deelnemer también pague, desde el link que recibió por correo.
  useEffect(() => {
    if (registeredLegalProcessId && bailiffPaid) {
      router.push(`/legal-processes/${registeredLegalProcessId}`);
    }
  }, [registeredLegalProcessId, bailiffPaid, router]);

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
            // botón "Betalen en registreren" (registra + paga), nunca con
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
                {onScreen1 ? "Vonnis registreren" : "Executie en kosten"}
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
                      BETALEN EN REGISTREREN
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2 }}>
                    <Box sx={{ mb: 2 }}>
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

                    {!registeredLegalProcessId ? (
                      <Button
                        type="button"
                        variant="contained"
                        color="primary"
                        onClick={handlePayAndRegister}
                        startIcon={<LockIcon />}
                        fullWidth
                        disabled={payingAndRegistering}
                        sx={{
                          textTransform: "none",
                          fontSize: "1rem",
                          fontWeight: 700,
                          bgcolor: "#F97316",
                          "&:hover": { bgcolor: "#EA580C" },
                        }}
                      >
                        {payingAndRegistering
                          ? "Verwerken..."
                          : "Betalen en registreren"}
                      </Button>
                    ) : (
                      <Alert severity="info">
                        Het vonnis is als conceptregistratie geregistreerd. De
                        GOP blijft in afwachting van betaling tot ook de
                        deelnemer de CFSB-activeringscommissie betaalt — die
                        ontvangt de betalingslink per e-mail zodra uw eigen
                        deurwaarderstarief bevestigd is.
                      </Alert>
                    )}
                  </Box>
                </Paper>
              )}
            </>
          )}

          <Dialog open={waitingBailiffConfirmation} disableEscapeKeyDown>
            <DialogContent sx={{ textAlign: "center", p: 4 }}>
              <CircularProgress size={48} sx={{ mt: 2 }} />
              <Typography variant="body2" sx={{ mt: 2 }}>
                ⏳ Wachten op bevestiging van de deurwaarderskosten...
              </Typography>
            </DialogContent>
          </Dialog>

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
        </form>
      </FormProvider>
    </Container>
  );
};

export default VerdictRegistrationForm;
