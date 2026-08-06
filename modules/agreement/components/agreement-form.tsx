"use client";

import React from "react";
import {
  Alert,
  Box,
  Button,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useForm, Controller } from "react-hook-form";
import { CreateAgreement, UpdateAgreement } from "@/modules/agreement/services/agreement.validators";
import { formatCurrency } from "@/shared/utils/formatters";
import { notifyError, notifyInfo } from "@/shared/ui/notifications";
import { useSession } from "next-auth/react";
import { getDebtorByUserId } from "@/modules/collection/actions/debtor.actions";
import {
  createPaymentAgreement,
  existsPaymentAgreement,
  updatePaymentAgreement,
} from "@/modules/agreement/actions/agreement.actions";
import { AgreementStatus } from "@/modules/agreement/constants/agreement-status";

interface AgreementFormProps {
  id?: string;
  initialData?: CreateAgreement;
  debtClaim_id: string;
  referenceLabel?: string;
  outstandingAmount?: number;
  onSave?: () => void;
  onClose?: () => void;
}

export const AgreementForm: React.FC<AgreementFormProps> = ({
  id,
  initialData,
  debtClaim_id,
  referenceLabel,
  outstandingAmount,
  onSave,
  onClose,
}) => {
  const { data: session } = useSession();
  const modeEdit = Boolean(id);

  const [loading, setLoading] = React.useState(false);

  const {
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<CreateAgreement>({
    defaultValues: initialData || {
      debtClaim_id,
      total_amount: 0,
      installments_count: 1,
      installment_amount: 0,
      start_date: new Date(),
      end_date: new Date(),
      status: undefined,
      debtor_id: "",
      comment: "",
    },
  });

  const outstanding = outstandingAmount ?? initialData?.total_amount ?? 0;
  const installmentsCount = watch("installments_count");

  // El monto por cuota siempre se deriva del saldo pendiente y la cantidad
  // de términos: es la cuota mensual, no un valor que el deudor pueda fijar
  // libremente.
  React.useEffect(() => {
    if (outstanding > 0 && installmentsCount > 0) {
      setValue(
        "installment_amount",
        Math.round((outstanding / installmentsCount) * 100) / 100,
      );
    }
  }, [outstanding, installmentsCount, setValue]);

  // SUBMIT
  const onSubmit = async (data: CreateAgreement) => {
    try {
      setLoading(true);

      if (!session?.user?.tenant_id) {
        return notifyError("Geen organisatie gevonden voor deze gebruiker");
      }

      if (new Date(data.start_date) < new Date()) {
        return notifyError("La fecha de inicio debe ser mayor a la actual");
      }

      const installmentsCount = Number(data.installments_count);
      if (!installmentsCount || installmentsCount <= 0) {
        return notifyError("Het aantal termijnen moet groter zijn dan 0");
      }

      const installmentAmount =
        Math.round((outstanding / installmentsCount) * 100) / 100;

      const endDate = new Date(data.start_date);
      endDate.setMonth(endDate.getMonth() + installmentsCount);

      if (!modeEdit) {
        const exists = await existsPaymentAgreement(debtClaim_id);
        if (exists) {
          return notifyError(
            "Ya existe un acuerdo de pago para esta collection",
          );
        }
      }

      if (modeEdit && id) {
        const payload: UpdateAgreement = {
          debtClaim_id: data.debtClaim_id,
          debtor_id: data.debtor_id,
          total_amount: outstanding,
          installments_count: installmentsCount,
          installment_amount: installmentAmount,
          start_date: data.start_date,
          end_date: endDate,
          comment: data.comment,
          status: data.status ?? AgreementStatus.COUNTEROFFER,
        };

        await updatePaymentAgreement(id, payload);
        notifyInfo("Acuerdo de pago actualizado correctamente");
        return onSave?.();
      }

      // CREATE MODE
      const debtor = await getDebtorByUserId(
        session.user.id,
        session.user.tenant_id,
      );
      if (!debtor)
        return notifyError("Geen debiteur gevonden voor deze gebruiker");

      const payload: CreateAgreement = {
        debtClaim_id,
        debtor_id: debtor.id,
        total_amount: outstanding,
        installments_count: installmentsCount,
        installment_amount: installmentAmount,
        start_date: data.start_date,
        end_date: endDate,
        comment: data.comment,
        status: AgreementStatus.PENDING,
      };

      await createPaymentAgreement(session.user.tenant_id, payload);
      notifyInfo("Acuerdo de pago creado correctamente");

      onSave?.();
    } catch (err) {
      console.error(err);
      notifyError(err instanceof Error ? err.message : "Fout bij het verwerken van de betalingsregeling");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2.5 }}>
        {!modeEdit && (
          <Typography variant="body2" color="text.secondary">
            Vul uw voorstel in. De deelnemer ontvangt uw aanvraag en neemt
            daarna een besluit.
          </Typography>
        )}

        <TextField
          label="Dossier / Referentie"
          value={referenceLabel || debtClaim_id}
          disabled
          fullWidth
          size="small"
        />

        <TextField
          label="Openstaand bedrag"
          value={formatCurrency(outstanding)}
          disabled
          fullWidth
          size="small"
        />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Controller
            name="start_date"
            control={control}
            rules={{ required: true }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Gewenste startdatum"
                required
                type="date"
                size="small"
                fullWidth
                error={!!fieldState.error}
                helperText="Vanaf welke datum wilt u starten?"
                value={
                  field.value
                    ? new Date(field.value).toISOString().substring(0, 10)
                    : ""
                }
                onChange={(e) => field.onChange(new Date(e.target.value))}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            )}
          />

          <Controller
            name="installments_count"
            control={control}
            rules={{ required: true, min: 1 }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                value={field.value || ""}
                label="Aantal termijnen"
                required
                type="number"
                size="small"
                fullWidth
                error={!!fieldState.error}
                helperText="In hoeveel maandelijkse termijnen wilt u betalen?"
                onChange={(e) =>
                  field.onChange(
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
              />
            )}
          />
        </Stack>

        <TextField
          label="Termijnbedrag (maandelijks)"
          value={formatCurrency(watch("installment_amount") || 0)}
          disabled
          fullWidth
          size="small"
          helperText="Automatisch berekend: openstaand bedrag ÷ aantal termijnen. Elke termijn wordt maandelijks betaald."
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">$</InputAdornment>
              ),
            },
          }}
        />

        <Controller
          name="comment"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              value={field.value || ""}
              label="Opmerking (optioneel)"
              placeholder="Uw opmerking..."
              multiline
              minRows={2}
              fullWidth
              size="small"
              helperText="Extra informatie voor de deelnemer."
            />
          )}
        />

        <Alert icon={<InfoOutlinedIcon fontSize="small" />} severity="info">
          <strong>Belangrijk</strong>
          <br />
          Uw aanvraag is een voorstel. De deelnemer kan uw aanvraag
          accepteren, wijzigen of afwijzen.
        </Alert>

        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 1 }}>
          <Button onClick={onClose} disabled={loading || isSubmitting}>
            Annuleren
          </Button>
          <Button
            variant="contained"
            color="primary"
            type="submit"
            endIcon={<SendIcon fontSize="small" />}
            disabled={loading || isSubmitting}
          >
            Verzenden
          </Button>
        </Stack>
      </Box>
    </form>
  );
};
