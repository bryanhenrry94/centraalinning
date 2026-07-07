"use client";

import React, { useEffect, useMemo } from "react";
import { Box, Button, Slider, Typography } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { CreateAgreement, UpdateAgreement } from "@/lib/validations/agreement";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { notifyError, notifyInfo } from "@/lib/notifications";
import { useSession } from "next-auth/react";
import { getDebtorByUserId } from "@/actions/debtor";
import {
  createPaymentAgreement,
  existsPaymentAgreement,
  updatePaymentAgreement,
} from "@/actions/agreement";
import { notifyTenantNewAgreement } from "@/actions/tenant";
import { AgreementStatus } from "@/constants/agreement-status";

interface AgreementFormProps {
  id?: string;
  initialData?: CreateAgreement;
  debtClaim_id: string;
  onSave?: () => void;
}

export const AgreementForm: React.FC<AgreementFormProps> = ({
  id,
  initialData,
  debtClaim_id,
  onSave,
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
    },
  });

  const totalAmount = watch("total_amount");
  const installmentsCount = watch("installments_count");
  const startDate = watch("start_date");

  // Calcular installment_amount
  useEffect(() => {
    if (totalAmount > 0 && installmentsCount > 0) {
      setValue("installment_amount", totalAmount / installmentsCount);
    }
  }, [totalAmount, installmentsCount, setValue]);

  // Calcular end_date automáticamente
  const endDate = useMemo(() => {
    if (!startDate || !installmentsCount) return null;
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + installmentsCount);
    return date;
  }, [startDate, installmentsCount]);

  useEffect(() => {
    if (endDate) {
      setValue("end_date", endDate);
    }
  }, [endDate, setValue]);

  // SUBMIT
  const onSubmit = async (data: CreateAgreement) => {
    try {
      setLoading(true);

      if (!session?.user?.tenant_id) {
        return notifyError("No se encontró el tenant del usuario");
      }

      if (new Date(data.start_date) < new Date()) {
        return notifyError("La fecha de inicio debe ser mayor a la actual");
      }

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
          total_amount: Number(data.total_amount),
          installments_count: Number(data.installments_count),
          installment_amount: Number(data.installment_amount),
          start_date: data.start_date,
          end_date: data.end_date,
          status: data.status ?? AgreementStatus.COUNTEROFFER,
        };

        await updatePaymentAgreement(id, payload);
        notifyInfo("Acuerdo de pago actualizado correctamente");
        return onSave?.();
      }

      // CREATE MODE
      const debtor = await getDebtorByUserId(session.user.id);
      if (!debtor)
        return notifyError("No se encontró deudor asociado al usuario");

      const payload: CreateAgreement = {
        debtClaim_id,
        debtor_id: debtor.id,
        total_amount: data.total_amount,
        installments_count: data.installments_count,
        installment_amount: data.installment_amount,
        start_date: data.start_date,
        end_date: data.end_date,
        status: data.status,
      };

      await createPaymentAgreement(session.user.tenant_id, payload);
      notifyInfo("Acuerdo de pago creado correctamente");

      // notifica al tenant que se ha creado un nuevo acuerdo de pago (para que pueda revisar y aceptar/rechazar)
      await notifyTenantNewAgreement(session.user.tenant_id, payload);
      notifyInfo("El tenant ha sido notificado sobre el nuevo acuerdo de pago");

      onSave?.();
    } catch (err) {
      console.error(err);
      notifyError("Error al procesar el acuerdo de pago");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2 }}>
        {/* --- SLIDER DE CUOTAS --- */}
        <Controller
          name="installments_count"
          control={control}
          render={({ field }) => (
            <Box>
              <Box sx={{ width: "100%", px: 1 }}>
                <Slider
                  {...field}
                  step={1}
                  min={1}
                  max={24}
                  valueLabelDisplay="auto"
                  onChange={(_, value) => field.onChange(Number(value))}
                />
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="caption">1 Maand</Typography>
                <Typography variant="caption">24 Maanden</Typography>
              </Box>
            </Box>
          )}
        />

        {/* --- RESUMEN --- */}
        <Box
          sx={{
            borderRadius: 1,
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <SummaryRow
            label="Totaal te bedrag:"
            value={formatCurrency(totalAmount)}
          />
          <SummaryRow label="Termijn:" value={installmentsCount} />
          <SummaryRow
            label="Startdatum:"
            value={formatDate(startDate?.toString())}
          />
          <SummaryRow
            label="Einddatum:"
            value={formatDate(endDate?.toString() || "")}
          />

          {/* Monto por cuota */}
          <Box
            sx={{
              borderTop: 1,
              borderColor: "divider",
              pt: 2,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Aflosbedrag:
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {formatCurrency(totalAmount / installmentsCount || 0)}
            </Typography>
          </Box>
        </Box>

        {/* BOTÓN */}
        <Button
          variant="contained"
          type="submit"
          disabled={loading || isSubmitting}
        >
          {modeEdit ? "Update" : "Save"}
        </Button>
      </Box>
    </form>
  );
};

/* COMPONENTE PEQUEÑO REUTILIZABLE */
const SummaryRow = ({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) => (
  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2">{value ?? "-"}</Typography>
  </Box>
);
