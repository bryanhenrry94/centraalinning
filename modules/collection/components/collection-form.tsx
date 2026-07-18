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
import { createPendingDebtClaimAction } from "@/modules/collection/actions/collection-case.actions";
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
      currency: "USD",
      origin: "MANUAL",
      status: "IN_PROGRESS",
      externalReference: "",
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
   * Paso 1: validar form → crear DebtClaim (OPEN) → crear pago Sentoo vinculado.
   * Retorna { success, paymentId, paymentUrl } al componente PaymentIntent.
   */
  const handleCreateTransaction = async (): Promise<{
    success: boolean;
    error?: string;
    paymentId?: string;
    paymentUrl?: string;
  }> => {
    const isValid = await trigger();
    if (!isValid) {
      return { success: false, error: "Vul alle verplichte velden in" };
    }

    if (amountService <= 0) {
      notifyError("Het servicebedrag moet groter zijn dan 0");
      return { success: false, error: "Servicebedrag is 0" };
    }

    // Crear DebtClaim en estado OPEN (pre-pago)
    const claimRes = await createPendingDebtClaimAction(
      getValues() as DebtClaimCreate,
    );
    if (!claimRes.success || !claimRes.claimId) {
      notifyError(claimRes.error ?? "Kon de vordering niet aanmaken");
      return { success: false, error: claimRes.error };
    }

    // Crear pago en Sentoo vinculado al claim
    const res = await fetch("/api/payments/create", {
      method: "POST",
      body: JSON.stringify({
        amount: amountService,
        currency: "USD",
        description: "Administratieve Opvolging (AOP)",
        payment_type: PaymentType.COLLECTION,
        obligationId: claimRes.obligationId,
      }),
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      notifyError("Fout bij het aanmaken van de betaling");
      return { success: false, error: "Payment creation failed" };
    }

    const data = await res.json();
    return {
      success: true,
      paymentId: data.paymentId,
      paymentUrl: data.paymentUrl,
    };
  };

  /**
   * Paso 2: el webhook ya activó el claim (activate + factura + aanmaning).
   * Aquí solo limpiamos la UI.
   */
  const handlePaymentConfirmed = async (_paymentId: string) => {
    reset();
    notifySuccess("Opgenomen verzameltaak");
    onSave?.();
    onClose?.();
  };

  const handlePaymentFailed = async (_paymentId: string) => {
    notifyError("De betaling is mislukt. Probeer het opnieuw.");
    onClose?.();
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
              {...register("externalReference")}
              error={!!errors.externalReference}
              helperText={errors.externalReference?.message ?? ""}
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
                sx={{ textTransform: "none" }}
              >
                Cancelar
              </Button>

              <PaymentIntent
                onCreateTransaction={handleCreateTransaction}
                onPaymentConfirmed={handlePaymentConfirmed}
                onPaymentFailed={handlePaymentFailed}
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
