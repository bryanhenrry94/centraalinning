"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Box,
  Button,
  Divider,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Stack,
  Typography,
} from "@mui/material";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { formatCurrency } from "@/shared/utils/formatters";
import { notifyError } from "@/shared/ui/notifications";
import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";
import { getParameterForTenantAction } from "@/modules/settings/actions/parameter.actions";
import { createFinancialAgreementWithDebtor } from "@/modules/financial-agreement/actions/financial-agreement.actions";
import { FAR_REGISTRATION_FEE } from "@/modules/financial-agreement/constants/financial-agreement";
import {
  FAR_WIZARD_DEFAULT_VALUES,
  FarWizardFormValues,
  FarWizardSchema,
} from "@/modules/financial-agreement/types/far-wizard.types";
import { FarWizardStepDebtor } from "@/modules/financial-agreement/components/far-wizard-step-debtor";
import { FarWizardStepAgreement } from "@/modules/financial-agreement/components/far-wizard-step-agreement";
import { FarWizardStepDocuments } from "@/modules/financial-agreement/components/far-wizard-step-documents";
import { FarWizardStepOverview } from "@/modules/financial-agreement/components/far-wizard-step-overview";
import { FarWizardStepSuccess } from "@/modules/financial-agreement/components/far-wizard-step-success";

const STEP_LABELS = ["Gegevens", "Overeenkomst", "Documenten", "Overzicht"];

const STEP_FIELDS: Record<
  number,
  (keyof FarWizardFormValues | `debtor.${string}` | `agreement.${string}`)[]
> = {
  0: [
    "debtor.person_type",
    "debtor.identification_type",
    "debtor.identification",
    "debtor.fullname",
    "debtor.address",
    "debtor.phone",
    "debtor.email",
  ],
  1: [
    "agreement.description",
    "agreement.reference",
    "agreement.invoiceDate",
    "agreement.dueDate",
    "agreement.amount",
    "agreement.notes",
  ],
};

// Wizard de alta de FAR (4 pasos + pago), reemplaza el formulario de una
// sola página. Ver docs de la tarea / mockup del sponsor para el detalle de
// cada paso — cada paso vive en su propio componente bajo
// modules/financial-agreement/components/far-wizard-step-*.tsx.
export const FarRegistrationWizard: React.FC = () => {
  const router = useRouter();
  const { data: session } = useSession();

  const [activeStep, setActiveStep] = useState(0);
  const [documents, setDocuments] = useState<File[]>([]);
  const [abbRate, setAbbRate] = useState(0);
  const [result, setResult] = useState<{
    financialAgreementId: string;
    farNumber: string;
    createdAt: string;
  } | null>(null);

  const { control, trigger, watch, getValues, setValue, reset } =
    useForm<FarWizardFormValues>({
      resolver: zodResolver(FarWizardSchema),
      mode: "onBlur",
      defaultValues: FAR_WIZARD_DEFAULT_VALUES,
    });

  useEffect(() => {
    getParameterForTenantAction()
      .then((parameter) => setAbbRate(parameter?.abb_rate ?? 0))
      .catch(() => setAbbRate(0));
  }, []);

  const abbAmount = useMemo(
    () => Number(((FAR_REGISTRATION_FEE * abbRate) / 100).toFixed(2)),
    [abbRate],
  );
  const totalAmount = useMemo(
    () => Number((FAR_REGISTRATION_FEE + abbAmount).toFixed(2)),
    [abbAmount],
  );

  const values = watch();

  // Auto-avance (pedido sponsor): recién cuando el usuario termina de editar
  // un campo y le quita el foco (blur) — no en cada tecla — se revisa si
  // todos los campos requeridos del paso ya quedaron completos y válidos, y
  // si es así se salta al siguiente sin esperar clic en "Volgende". El
  // onBlur se pone una sola vez en el contenedor de cada paso (React lo
  // burbujea desde cualquier campo interno) en vez de repetirlo campo por
  // campo. Los refs guardan el último estado de validez conocido por paso,
  // para avanzar solo en la transición inválido → válido, así "Vorige" para
  // revisar un paso ya completo no te vuelve a empujar hacia adelante.
  const step0ValidRef = useRef(false);
  const step1ValidRef = useRef(false);

  const handleStepBlur = async (stepIndex: number, validRef: React.RefObject<boolean>) => {
    const fields = STEP_FIELDS[stepIndex];
    if (!fields) return;

    const isValid = await trigger(fields as never);
    if (isValid && !validRef.current) {
      validRef.current = true;
      setActiveStep((prev) => (prev === stepIndex ? stepIndex + 1 : prev));
    } else if (!isValid) {
      validRef.current = false;
    }
  };

  const handleNext = async () => {
    const fields = STEP_FIELDS[activeStep];
    if (fields) {
      const valid = await trigger(fields as never);
      if (!valid) return;
    }
    setActiveStep((step) => step + 1);
  };

  const handleBack = () => setActiveStep((step) => Math.max(0, step - 1));

  const handleAddFiles = (files: File[]) =>
    setDocuments((prev) => [...prev, ...files]);
  const handleRemoveFile = (index: number) =>
    setDocuments((prev) => prev.filter((_, i) => i !== index));

  const resetWizard = () => {
    reset(FAR_WIZARD_DEFAULT_VALUES);
    setDocuments([]);
    setResult(null);
    setActiveStep(0);
  };

  const handleCreateTransaction = async (): Promise<{
    success: boolean;
    error?: string;
    paymentId?: string;
    paymentUrl?: string;
  }> => {
    const valid = await trigger();
    if (!valid) {
      return { success: false, error: "Controleer de ingevulde gegevens." };
    }
    if (!session?.user?.tenant_id) {
      return { success: false, error: "Geen organisatie gevonden." };
    }

    const formValues = getValues();

    // "Aanvullende opmerkingen" no tiene columna propia — se agrega al
    // final de description, ver nota en far-wizard.types.ts.
    const description = [
      formValues.agreement.description,
      formValues.agreement.notes,
    ]
      .filter((part) => part && part.trim().length > 0)
      .join("\n\nOpmerkingen: ");

    try {
      const response = await createFinancialAgreementWithDebtor(
        session.user.tenant_id,
        {
          debtor: {
            person_type: formValues.debtor.person_type,
            identification_type: formValues.debtor.identification_type,
            identification: formValues.debtor.identification,
            fullname: formValues.debtor.fullname,
            email: formValues.debtor.email,
            phone: formValues.debtor.phone || null,
            address: formValues.debtor.address,
          },
          agreement: {
            reference: formValues.agreement.reference,
            description,
            amount: formValues.agreement.amount,
            currency: "USD",
            invoiceDate: new Date(formValues.agreement.invoiceDate),
            dueDate: new Date(formValues.agreement.dueDate),
            contractId: null,
          },
        },
        documents,
      );

      setResult({
        financialAgreementId: response.financialAgreementId,
        farNumber: response.farNumber,
        createdAt: new Date().toISOString(),
      });
      return {
        success: true,
        paymentId: response.paymentId,
        paymentUrl: response.paymentUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Registratie mislukt.",
      };
    }
  };

  const handlePaymentConfirmed = async () => {
    setActiveStep(4);
  };

  const handlePaymentFailed = async () => {
    notifyError("De betaling is niet gelukt. Probeer het opnieuw.");
  };

  if (activeStep === 4 && result) {
    return (
      <FarWizardStepSuccess
        farNumber={result.farNumber}
        debtorName={values.debtor.fullname}
        amount={values.agreement.amount}
        createdAt={result.createdAt}
        onGoToList={() => router.push("/financial-agreements")}
        onRegisterAnother={resetWizard}
      />
    );
  }

  return (
    <Stack spacing={3}>
      {activeStep < 4 && (
        <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2.5 }}>
            FAR – Financiële Afspraken Registreren
          </Typography>
          <Stepper
            activeStep={activeStep}
            alternativeLabel
            sx={{
              "& .MuiStepIcon-root": { color: "grey.300", fontSize: "2rem" },
              "& .MuiStepIcon-root.Mui-active": { color: "secondary.main" },
              "& .MuiStepIcon-root.Mui-completed": { color: "secondary.main" },
              "& .MuiStepLabel-label": { color: "text.disabled" },
              "& .MuiStepLabel-label.Mui-active": {
                color: "text.primary",
                fontWeight: 700,
              },
              "& .MuiStepLabel-label.Mui-completed": { color: "text.primary" },
              "& .MuiStepConnector-line": { borderColor: "grey.300" },
              "& .Mui-active .MuiStepConnector-line": {
                borderColor: "secondary.main",
              },
              "& .Mui-completed .MuiStepConnector-line": {
                borderColor: "secondary.main",
              },
            }}
          >
            {STEP_LABELS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>
      )}

      {activeStep === 0 && (
        <Box onBlur={() => handleStepBlur(0, step0ValidRef)}>
          <FarWizardStepDebtor
            control={control}
            personType={values.debtor.person_type}
            getValues={getValues}
            setValue={setValue}
          />
        </Box>
      )}
      {activeStep === 1 && (
        <Box onBlur={() => handleStepBlur(1, step1ValidRef)}>
          <FarWizardStepAgreement control={control} />
        </Box>
      )}
      {activeStep === 2 && (
        <FarWizardStepDocuments
          files={documents}
          onAddFiles={handleAddFiles}
          onRemoveFile={handleRemoveFile}
        />
      )}
      {activeStep === 3 && (
        <>
          <FarWizardStepOverview
            values={values}
            documents={documents}
            onEditStep={setActiveStep}
          />

          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Bedrag (excl. ABB)
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatCurrency(FAR_REGISTRATION_FEE)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  ABB {abbRate}%
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatCurrency(abbAmount)}
                </Typography>
              </Stack>
              <Divider />
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="subtitle1" fontWeight={700}>
                  Totaal te betalen
                </Typography>
                <Typography variant="h5" fontWeight={700} color="primary.main">
                  {formatCurrency(totalAmount)}
                </Typography>
              </Stack>
            </Stack>
          </Paper>

          <Typography variant="body2" color="text.secondary">
            Betaal met: online betaling (Sentoo)
          </Typography>
        </>
      )}

      <Stack direction="row" spacing={1.5} justifyContent="space-between">
        <Box>
          {activeStep === 0 ? (
            <Button onClick={() => router.push("/financial-agreements")}>
              Annuleren
            </Button>
          ) : (
            <Button onClick={handleBack}>Vorige</Button>
          )}
        </Box>

        {activeStep < 3 ? (
          <Button variant="contained" onClick={handleNext}>
            Volgende
          </Button>
        ) : (
          <Box sx={{ minWidth: 200 }}>
            <PaymentIntent
              onCreateTransaction={handleCreateTransaction}
              onPaymentConfirmed={handlePaymentConfirmed}
              onPaymentFailed={handlePaymentFailed}
            />
          </Box>
        )}
      </Stack>

      {activeStep === 3 && (
        <Typography variant="caption" color="text.secondary" textAlign="center">
          🔒 Uw betaling is veilig en beveiligd.
        </Typography>
      )}
    </Stack>
  );
};
