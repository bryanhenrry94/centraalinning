"use client";

import React, { useEffect, useMemo, useState } from "react";
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

const STEP_FIELDS: Record<number, (keyof FarWizardFormValues | `debtor.${string}` | `agreement.${string}`)[]> = {
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

  const {
    control,
    trigger,
    watch,
    getValues,
    setValue,
    reset,
  } = useForm<FarWizardFormValues>({
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

  const handleNext = async () => {
    const fields = STEP_FIELDS[activeStep];
    if (fields) {
      const valid = await trigger(fields as never);
      if (!valid) return;
    }
    setActiveStep((step) => step + 1);
  };

  const handleBack = () => setActiveStep((step) => Math.max(0, step - 1));

  const handleAddFiles = (files: File[]) => setDocuments((prev) => [...prev, ...files]);
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
    const description = [formValues.agreement.description, formValues.agreement.notes]
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
            address: formValues.debtor.address || null,
          },
          agreement: {
            reference: formValues.agreement.reference || null,
            description: description || null,
            amount: formValues.agreement.amount,
            currency: "USD",
            invoiceDate: formValues.agreement.invoiceDate
              ? new Date(formValues.agreement.invoiceDate)
              : null,
            dueDate: formValues.agreement.dueDate
              ? new Date(formValues.agreement.dueDate)
              : null,
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
      return { success: true, paymentId: response.paymentId, paymentUrl: response.paymentUrl };
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
      <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEP_LABELS.map((label, index) => (
            <Step key={label}>
              <StepLabel>
                {`Stap ${index + 1} van 4 — ${label}`}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {activeStep === 0 && (
        <FarWizardStepDebtor
          control={control}
          personType={values.debtor.person_type}
          getValues={getValues}
          setValue={setValue}
        />
      )}
      {activeStep === 1 && <FarWizardStepAgreement control={control} />}
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
            documentCount={documents.length}
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
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" fontWeight={700}>
                  Totaal te betalen
                </Typography>
                <Typography variant="h5" fontWeight={700} color="primary.main">
                  {formatCurrency(totalAmount)}
                </Typography>
              </Stack>
            </Stack>
          </Paper>
        </>
      )}

      <Stack direction="row" spacing={1.5} justifyContent="space-between">
        <Box>
          {activeStep === 0 ? (
            <Button onClick={() => router.push("/financial-agreements")}>Annuleren</Button>
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
    </Stack>
  );
};
