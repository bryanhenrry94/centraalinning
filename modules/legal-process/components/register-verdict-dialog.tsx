"use client";
import React, { useEffect, useState } from "react";
import { useForm, FormProvider, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
} from "@mui/material";
import InputHookForm from "@/shared/ui/InputHookForm";
import SelectHookForm from "@/shared/ui/SelectHookForm";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { getActiveBailiffsDirectory } from "@/modules/bailiff/actions/bailiff.actions";
import { Bailiff } from "@/modules/bailiff/services/bailiff.validators";
import {
  RegisterVerdictObjectSchema,
} from "@/modules/legal-process/services/legal-process.validators";
import { registerGopVerdict } from "@/modules/legal-process/actions/legal-process.actions";

interface RegisterVerdictDialogProps {
  open: boolean;
  onClose: () => void;
  caseTransferId: string;
  defaultBailiffId?: string | null;
  onRegistered: (legalProcessId: string) => void;
}

// La versión simplificada del formulario de sentencia: en vez del cálculo
// tramo por tramo de intereses (ya disponible en el módulo `verdict`), aquí
// se captura un único monto total de interés acumulado a la fecha de la
// sentencia, suficiente para la base de facturación del 5% (sección 6).
const formSchema = RegisterVerdictObjectSchema.omit({
  caseTransferId: true,
  legalProcessId: true,
  verdict_interest: true,
}).extend({
  total_interest: RegisterVerdictObjectSchema.shape.procesal_cost,
});
type FormValues = ReturnType<typeof formSchema.parse>;

const defaultValues = {
  invoice_number: "",
  creditor_name: "",
  registration_number: "",
  sentence_amount: 0,
  sentence_date: "",
  court: "",
  notification_date: "",
  prescription_term_months: undefined,
  prescription_due_date: "",
  procesal_cost: 0,
  notes: "",
  bailiff_id: "",
  total_interest: 0,
} as unknown as FormValues;

export const RegisterVerdictDialog: React.FC<RegisterVerdictDialogProps> = ({
  open,
  onClose,
  caseTransferId,
  defaultBailiffId,
  onRegistered,
}) => {
  const [bailiffs, setBailiffs] = useState<Bailiff[]>([]);
  const [loading, setLoading] = useState(false);

  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    defaultValues,
  });
  const { handleSubmit, reset } = methods;

  useEffect(() => {
    if (!open) return;
    getActiveBailiffsDirectory()
      .then(setBailiffs)
      .catch(() => notifyError("Kon deurwaarders niet laden"));
    reset({ ...defaultValues, bailiff_id: defaultBailiffId || "" });
  }, [open, defaultBailiffId, reset]);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const { total_interest, ...rest } = values;

      const verdict = await registerGopVerdict({
        ...rest,
        caseTransferId,
        verdict_interest:
          total_interest && total_interest > 0
            ? [
                {
                  interest_type: "Wettelijke rente",
                  base_amount: values.sentence_amount,
                  calculation_start: values.sentence_date,
                  calculation_end: values.sentence_date,
                  total_interest,
                  details: [],
                },
              ]
            : [],
      });

      notifySuccess("Vonnis geregistreerd. GOP is actief.");
      onRegistered(verdict.legal_process_id);
      onClose();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Registratie mislukt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Vonnis registreren</DialogTitle>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InputHookForm name="registration_number" label="Vonnisnummer" required />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InputHookForm name="invoice_number" label="Factuurnummer" required />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InputHookForm name="creditor_name" label="Naam schuldeiser" required />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InputHookForm name="court" label="Rechtbank" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InputHookForm name="sentence_amount" label="Toegewezen bedrag" type="number" required />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InputHookForm name="total_interest" label="Rente tot op heden" type="number" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InputHookForm name="sentence_date" label="Datum vonnis" type="date" required />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InputHookForm name="notification_date" label="Datum betekening" type="date" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InputHookForm
                  name="prescription_term_months"
                  label="Verjaringstermijn (maanden)"
                  type="number"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InputHookForm name="prescription_due_date" label="Verjaringsdatum" type="date" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InputHookForm name="procesal_cost" label="Proceskosten" type="number" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <SelectHookForm
                  name="bailiff_id"
                  label="Deurwaarder"
                  options={bailiffs.map((b) => ({ value: b.id, label: b.fullname }))}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <InputHookForm name="notes" label="Opmerkingen" />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Annuleren</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              Vonnis registreren
            </Button>
          </DialogActions>
        </form>
      </FormProvider>
    </Dialog>
  );
};
