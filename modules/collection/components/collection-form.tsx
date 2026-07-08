"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Typography,
  Autocomplete,
  TextField,
  Stack,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import CloseIcon from "@mui/icons-material/Close";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  DebtClaimCreate,
  DebtClaimCreateSchema,
} from "@/modules/collection/services/collection.validators";
import { ModalFormDebtor } from "@/modules/collection/components/modal-debtor-form";
import {
  DebtorResponse,
  DebtorInput,
} from "@/modules/collection/services/debtor.type";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { useTenant } from "@/modules/auth/hooks/useTenant";
import { getParameterAction } from "@/modules/settings/actions/parameter.actions";
import { ParameterInput } from "@/modules/settings/services/parameter/parameter.type";
import { getDebtorsAction } from "@/modules/collection/actions/debtor.actions";
import { createDebtClaimAction } from "@/modules/collection/actions/collection-case.actions";
import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";
import { PaymentType } from "@/modules/payment/services/payment.validators";

interface IRegisterInvoiceProps {
  onSave?: () => void;
  onClose?: () => void;
}

const RegisterInvoice: React.FC<IRegisterInvoiceProps> = ({
  onSave,
  onClose,
}) => {
  const { tenant } = useTenant();

  const [loading, setLoading] = useState(false);
  const [parameter, setParameter] = useState<ParameterInput | null>(null);
  const [modalFormDebtor, setModalFormDebtor] = useState({
    open: false,
    debtor_id: "",
  });
  const [debtors, setDebtors] = useState<DebtorResponse[]>([]);

  type FormValues = z.input<typeof DebtClaimCreateSchema>;

  const {
    register,
    control,
    trigger,
    watch,
    getValues,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues, unknown, DebtClaimCreate>({
    resolver: zodResolver(DebtClaimCreateSchema),
    defaultValues: {
      debtorId: "",
      principalAmount: 0,
      currentAmount: 0,
      currency: "USD",
      origin: "MANUAL",
      status: "IN_PROGRESS",
      reference: "",
      description: "",
    },
  });

  const principalAmount = watch("principalAmount") ?? 0;
  const debtorId = watch("debtorId") ?? "";

  useEffect(() => {
    fetchDebtors();
    fetchParameter();
  }, [tenant?.id]);

  const fetchParameter = async () => {
    try {
      const result = await getParameterAction();
      setParameter(result);
    } catch (error) {
      console.error("Error al obtener el parámetro:", error);
    }
  };

  const fetchDebtors = async () => {
    if (!tenant?.id) return;
    const result = await getDebtorsAction(tenant.id);
    setDebtors(result);
  };

  const collection_fee_rate = parameter?.collection_fee_rate ?? 0;
  const abb_rate = parameter?.abb_rate ?? 0;

  const subtotal = Number(principalAmount);

  let cobranza = 0;
  let abbValue = 0;
  let additionalCosts = 0;

  if (subtotal > 0) {
    cobranza = (subtotal * collection_fee_rate) / 100;

    if (
      parameter?.collection_fee_minimum_amount &&
      cobranza < parameter.collection_fee_minimum_amount
    ) {
      cobranza = parameter.collection_fee_minimum_amount;
    }

    abbValue = (cobranza * abb_rate) / 100;
    additionalCosts = parameter?.digital_file_costs ?? 0;
  }

  const amountService = cobranza + abbValue + additionalCosts;
  const totalFinal = subtotal - amountService;

  const formatUSD = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const handleClickNewDebtor = () => {
    setModalFormDebtor({ open: true, debtor_id: debtorId });
  };

  const handleSetDebtor = (debtor: DebtorInput) => {
    fetchDebtors();
    setValue("debtorId", debtor.id ?? "");
  };

  /**
   * Paso 1: validar formulario y crear la transacción en Sentoo.
   * Se ejecuta cuando el usuario pulsa "Nu betalen".
   * Si hay errores de validación o el monto del servicio es 0, se aborta.
   */
  const handleCreateTransaction = async (): Promise<{
    success: boolean;
    error?: string;
    paymentId?: string;
    paymentUrl?: string;
  }> => {
    const isValid = await trigger();
    if (!isValid) {
      return { success: false, error: "Formulario inválido" };
    }

    if (amountService <= 0) {
      notifyError("Het servicebedrag moet groter zijn dan 0");
      return { success: false, error: "Servicebedrag is 0" };
    }

    const res = await fetch("/api/payments/create", {
      method: "POST",
      body: JSON.stringify({
        amount: amountService,
        currency: "USD",
        description: "Registratie incassovordering",
        payment_type: PaymentType.COLLECTION,
      }),
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      notifyError("Fout bij het aanmaken van de betaling");
      throw new Error("Payment creation failed");
    }

    const data = await res.json();
    return {
      success: true,
      paymentId: data.paymentId,
      paymentUrl: data.paymentUrl,
    };
  };

  /**
   * Paso 2: registrar el caso de cobro una vez que el webhook de Sentoo
   * marcó el pago como "paid" y el polling lo detectó.
   */
  const handlePaymentConfirmed = async () => {
    try {
      setLoading(true);

      const res = await createDebtClaimAction(getValues() as DebtClaimCreate);

      if (!res || res.error) {
        notifyError(
          res?.error ??
            "Er is een fout opgetreden bij het registreren van de verzameltaak",
        );
        return;
      }

      reset();
      notifySuccess("Opgenomen verzameltaak");
      onSave?.();
      onClose?.();
    } catch (error) {
      console.error("Error: ", error);
      notifyError(
        "Er is een fout opgetreden bij het registreren van de verzameltaak",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box sx={{ p: 2 }}>
        {/* form como contenedor para react-hook-form; el envío ocurre via PaymentIntent */}
        <form onSubmit={(e) => e.preventDefault()}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="Factuurnummer"
              size="small"
              variant="outlined"
              placeholder="Bijv. REF-2025-001"
              {...register("reference")}
              error={!!errors.reference}
              helperText={errors.reference?.message ?? ""}
            />

            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Controller
                name="debtorId"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    disablePortal
                    options={debtors}
                    getOptionLabel={(option) =>
                      `${option.person?.first_name ?? ""} ${option.person?.last_name ?? ""}`
                    }
                    isOptionEqualToValue={(option, val) => option.id === val.id}
                    value={debtors.find((d) => d.id === field.value) ?? null}
                    onChange={(_, newValue) =>
                      field.onChange(newValue ? newValue.id : "")
                    }
                    fullWidth
                    renderOption={(props, option) => (
                      <li {...props} key={option.id}>
                        {option.person?.first_name} {option.person?.last_name}
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Debiteurnaam"
                        size="small"
                        error={!!errors.debtorId}
                        helperText={errors.debtorId?.message ?? ""}
                      />
                    )}
                  />
                )}
              />
              <Stack direction="row" spacing={2} alignItems="center">
                <IconButton
                  onClick={handleClickNewDebtor}
                  sx={{ bgcolor: "background.paper", borderRadius: 1 }}
                >
                  <PersonIcon />
                </IconButton>
              </Stack>
            </Box>

            <TextField
              fullWidth
              label="Vorderingsbedrag"
              size="small"
              variant="outlined"
              type="number"
              {...register("principalAmount", { valueAsNumber: true })}
              error={!!errors.principalAmount}
              helperText={errors.principalAmount?.message ?? ""}
            />

            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between">
                  <Typography>Vordering:</Typography>
                  <Typography>{formatUSD(subtotal)}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography>Factuur:</Typography>
                  <Typography>{`-${formatUSD(amountService)}`}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="h6">Te ontvangen:</Typography>
                  <Typography variant="h6">{formatUSD(totalFinal)}</Typography>
                </Box>
              </CardContent>
            </Card>

            <Stack direction="row" spacing={2} width="100%">
              <Button
                fullWidth
                variant="outlined"
                color="inherit"
                startIcon={<CloseIcon />}
                onClick={() => onClose?.()}
                disabled={loading}
                sx={{ textTransform: "none" }}
              >
                Cancelar
              </Button>

              <PaymentIntent
                onCreateTransaction={handleCreateTransaction}
                onPaymentConfirmed={handlePaymentConfirmed}
              />
            </Stack>
          </Box>
        </form>
      </Box>

      <ModalFormDebtor
        open={modalFormDebtor.open}
        onClose={() => setModalFormDebtor({ open: false, debtor_id: debtorId })}
        id={modalFormDebtor.debtor_id}
        onSave={handleSetDebtor}
      />
    </>
  );
};

export default RegisterInvoice;
