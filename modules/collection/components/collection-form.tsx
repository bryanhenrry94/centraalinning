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
import SaveIcon from "@mui/icons-material/Save";
import { DebtClaimCreate } from "@/modules/collection/services/collection.validators";
import { ModalFormDebtor } from "@/modules/collection/components/modal-debtor-form";
import { DebtorResponse, DebtorInput } from "@/modules/collection/services/debtor.type";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { useTenant } from "@/modules/auth/hooks/useTenant";
import { getParameterAction } from "@/modules/settings/actions/parameter.actions";
import { ParameterInput } from "@/modules/settings/services/parameter/parameter.type";
import { getDebtorsAction } from "@/modules/collection/actions/debtor.actions";

const InitialDebtClaimCreate: DebtClaimCreate = {
  debtorId: "",
  reference: "",
  description: "",
  principalAmount: 0,
  currentAmount: 0,
  currency: "USD",
  origin: "MANUAL",
  status: "IN_PROGRESS",
};

interface IRegisterInvoiceProps {
  onSave?: () => void;
}

const RegisterInvoice: React.FC<IRegisterInvoiceProps> = ({ onSave }) => {
  const { tenant } = useTenant();

  const [formData, setFormData] = useState<DebtClaimCreate>(
    InitialDebtClaimCreate,
  );
  const [loading, setLoading] = useState(false);

  const [_parameter, setParameters] = useState<ParameterInput | null>(null);
  // const [, setModalSearchDebtors] = useState(false);
  const [_ModalFormDebtor, setModalFormDebtor] = useState({
    open: false,
    debtor_id: "",
  });
  const [debtors, setDebtors] = useState<DebtorResponse[]>([]);

  useEffect(() => {
    fetchDebtors();
    fetchParameter();
  }, [tenant?.id]);

  const fetchParameter = async () => {
    try {
      const result = await getParameterAction();
      setParameters(result);
    } catch (error) {
      console.error("Error al obtener el parámetro:", error);
    }
  };

  const fetchDebtors = async () => {
    if (!tenant?.id) return;
    const result = await getDebtorsAction(tenant?.id);
    setDebtors(result);
  };

  const collection_fee_rate = _parameter?.collection_fee_rate ?? 0;
  const abb_rate = _parameter?.abb_rate ?? 0;

  const invoiceAmount = formData.principalAmount || 0;
  const subtotal = Number(invoiceAmount);
  let cobranza = (subtotal * collection_fee_rate) / 100; // 0.15

  if (_parameter?.collection_fee_minimum_amount) {
    if (cobranza < _parameter?.collection_fee_minimum_amount) {
      cobranza = _parameter?.collection_fee_minimum_amount ?? 0;
    }
  }

  const abbValue = (cobranza * abb_rate) / 100;
  const aditionalCosts = _parameter?.digital_file_costs || 0;
  const totalFinal = subtotal - cobranza - abbValue - aditionalCosts;

  const formatUSD = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const handleClickNewDebtor = () => {
    setModalFormDebtor({ open: true, debtor_id: formData.debtorId });
  };

  const handleSetDebtor = (debtor: DebtorInput) => {
    fetchDebtors();
    setFormData({
      ...formData,
      debtorId: debtor.id,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await fetch("/api/collection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create collection case");
      }

      setFormData(InitialDebtClaimCreate);
      notifySuccess("Opgenomen verzameltaak");
      onSave?.();
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
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label={"Factuurnummer"}
              size="small"
              variant="outlined"
              type={"text"}
              placeholder="Bijv. REF-2025-001"
              value={formData.reference ?? ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  reference: e.target.value,
                })
              }
              required
            />
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Autocomplete
                disablePortal
                options={debtors}
                getOptionLabel={(option) =>
                  `${option.person?.first_name || ""} ${
                    option.person?.last_name || ""
                  }`
                }
                isOptionEqualToValue={(option, val) => option.id === val.id}
                value={
                  debtors.find((debtor) => debtor.id === formData.debtorId) ||
                  null
                }
                onChange={(_, newValue) => {
                  setFormData({
                    ...formData,
                    debtorId: newValue ? newValue.id : "",
                  });
                }}
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
                    required
                  />
                )}
              />
              <Stack direction="row" spacing={2} alignItems="center">
                <IconButton
                  onClick={handleClickNewDebtor}
                  sx={{
                    bgcolor: "background.paper",
                    borderRadius: 1,
                  }}
                >
                  <PersonIcon />
                </IconButton>
              </Stack>
            </Box>
            <TextField
              fullWidth
              label={"Vorderingsbedrag"}
              size="small"
              variant="outlined"
              type="number"
              required
              value={formData.principalAmount ?? ""}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  principalAmount: Number(e.target.value),
                });
              }}
            />
            <Box display="flex" flexDirection="column" gap={1}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Vordering:</Typography>
                    <Typography>{formatUSD(subtotal)}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Factuur:</Typography>
                    <Typography>{`-${formatUSD(
                      cobranza + abbValue + aditionalCosts,
                    )}`}</Typography>
                  </Box>

                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="h6">Te ontvangen:</Typography>
                    <Typography variant="h6">
                      {formatUSD(totalFinal)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
            <Stack spacing={2} direction="row">
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                fullWidth
                sx={{ mt: 1 }}
                color="primary"
                disabled={loading}
                loading={loading}
              >
                SAVE
              </Button>
            </Stack>
          </Box>
        </form>
      </Box>

      <ModalFormDebtor
        open={_ModalFormDebtor.open}
        onClose={() =>
          setModalFormDebtor({ open: false, debtor_id: formData.debtorId })
        }
        id={_ModalFormDebtor.debtor_id} // Aquí puedes pasar el ID del deudor si estás editando
        onSave={handleSetDebtor}
      />
    </>
  );
};

export default RegisterInvoice;
