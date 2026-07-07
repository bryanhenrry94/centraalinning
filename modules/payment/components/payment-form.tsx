import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { TextField, Button, MenuItem, Box, Autocomplete } from "@mui/material";
import { notifyError, notifyInfo } from "@/shared/ui/notifications";

import {
  PaymentMethodEnum,
  PaymentCreateSchema,
  PaymentCreate,
} from "@/modules/payment/services/payment.validators";
import { DebtorSummary } from "@/modules/collection/types/DebtorSummary";
import { useSession } from "next-auth/react";
import { getDebts } from "@/modules/collection/actions/debtor.actions";
import { formatCurrency } from "@/shared/utils/formatters";
import { PaymentMethod } from "@/modules/payment/constants/payment-method";
import { PaymentService } from "@/modules/payment/services/payment.service";

const initialState: PaymentCreate = {
  debtClaim_id: "",
  total_amount: 0,
  method: PaymentMethod.TRANSFER,
  reference_number: "",
  paid_at: new Date().toISOString().slice(0, 16), // Format for datetime-local input
  status: "pending",
  provider: "",
  provider_payload: null,
  provider_ref: null,
  payment_type: "OTHER",
};

interface PaymentFormProps {
  debtId?: string;
  onSave?: () => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ debtId, onSave }) => {
  const [debts, setDebs] = React.useState<DebtorSummary[]>([]);
  const { data: session } = useSession();

  React.useEffect(() => {
    if (!session?.user?.tenant_id) return;
    fetchDebts();
  }, [session?.user?.tenant_id]);

  const fetchDebts = async () => {
    if (!session?.user?.tenant_id) return;

    const response = await getDebts({ tenant_id: session.user.tenant_id });

    if (response.success) setDebs(response.data || []);
  };

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(PaymentCreateSchema),
    defaultValues: initialState,
  });

  const onSubmit = async (data: PaymentCreate) => {
    try {
      const tenantId = session?.user?.tenant_id;
      if (!tenantId) {
        notifyError("Tenant ID is missing");
        return;
      }

      console.log("Payment Data:", data);
      await PaymentService.registerPayment(tenantId, data);

      notifyInfo("Payment registered successfully");
      await fetchDebts();
      reset(initialState);
      onSave?.();
    } catch (error) {
      console.error("Error registering payment:", error);
      notifyError("Error registering payment");
    }
  };

  // Collect all error messages with field names
  const allErrorMessages = Object.entries(errors)
    .map(([key, err]) => (err?.message ? `${key}: ${String(err.message)}` : ""))
    .filter(Boolean);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        p: 2,
        width: 400,
      }}
    >
      {allErrorMessages.length > 0 && (
        <Box sx={{ color: "error.main", mb: 2 }}>
          {allErrorMessages.map((msg, idx) => (
            <div key={idx}>{msg}</div>
          ))}
        </Box>
      )}
      <Controller
        name="debtClaim_id"
        control={control}
        render={({ field }) => (
          <Autocomplete
            options={debts}
            getOptionLabel={(option) =>
              option.id
                ? `${option.reference} - Open: ${formatCurrency(option.balance)}`
                : ""
            }
            onChange={(_, value) => field.onChange(value ? value.id : "")}
            value={debts.find((inv) => inv.id === field.value) || null}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Schulden"
                error={!!errors.debtClaim_id}
                helperText={errors.debtClaim_id?.message}
                required
              />
            )}
            isOptionEqualToValue={(option, value) => option.id === value.id}
          />
        )}
      />
      <Controller
        name="total_amount"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Amount"
            type="number"
            error={!!errors.total_amount}
            helperText={errors.total_amount?.message}
            required
          />
        )}
      />
      <Controller
        name="method"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            select
            label="Payment Method"
            error={!!errors.method}
            helperText={errors.method?.message}
            required
          >
            {PaymentMethodEnum.options.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      <Controller
        name="reference_number"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Reference"
            error={!!errors.reference_number}
            helperText={errors.reference_number?.message}
          />
        )}
      />
      <Controller
        name="paid_at"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Paid At"
            type="datetime-local"
            error={!!errors.paid_at}
            helperText={errors.paid_at?.message}
            required
            InputLabelProps={{ shrink: true }}
          />
        )}
      />

      <Button type="submit" variant="contained" color="primary">
        Submit
      </Button>
    </Box>
  );
};
