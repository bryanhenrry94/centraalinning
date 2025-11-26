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
import { CollectionCaseCreate } from "@/lib/validations/collection";
import { ModalFormDebtor } from "@/components/debtor/modal-debtor-form";
import { DebtorBase, DebtorResponse } from "@/lib/validations/debtor";
import { getParameter } from "@/app/actions/parameter";
import { createCollectionCase } from "@/app/actions/collection-case";
import { notifyError, notifySuccess } from "@/lib/notifications";
import { useTenant } from "@/hooks/useTenant";
import { getAllDebtorsByTenantId } from "@/app/actions/debtor";
import { IParamGeneral } from "@/lib/validations/parameter";
import { $Enums } from "@/prisma/generated/prisma";

const InitialCollectionCaseCreate: CollectionCaseCreate = {
  debtor_id: "",
  reference_number: "",
  issue_date: new Date(),
  due_date: new Date(),
  amount_original: 0,
  fee_rate: 0,
  fee_amount: 0,
  abb_rate: 0,
  abb_amount: 0,
  total_fined: 0,
  total_due: 0,
  total_paid: 0,
  total_to_receive: 0,
  balance: 0,
  status: $Enums.CollectionCaseStatus.AANMANING,
};

interface IRegisterInvoiceProps {
  onSave?: () => void;
}

const RegisterInvoice: React.FC<IRegisterInvoiceProps> = ({ onSave }) => {
  const { tenant } = useTenant();

  const [formData, setFormData] = useState<CollectionCaseCreate>(
    InitialCollectionCaseCreate
  );
  const [loading, setLoading] = useState(false);

  const [_parameter, setParameters] = useState<IParamGeneral>();
  // const [_ModalSearchDebtors, setModalSearchDebtors] = useState(false);
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
      const result = await getParameter();

      if (!result) return;

      setParameters(result);
    } catch (error) {
      console.error("Error al obtener el parámetro:", error);
    }
  };

  const fetchDebtors = async () => {
    if (!tenant?.id) return;

    const result = await getAllDebtorsByTenantId(tenant?.id);
    console.log("result: ", result);
    setDebtors(result);
  };

  // const collection_fee_rate = demo?.collection_fee_rate ? demo?.collection_fee_rate : 0;
  const collection_fee_rate = _parameter?.collection_fee_rate ?? 0;
  const abb_rate = _parameter?.abb_rate ?? 0;

  const invoiceAmount = formData.amount_original || 0;
  const subtotal = Number(invoiceAmount);
  const cobranza = (subtotal * collection_fee_rate) / 100; // 0.15
  const abbValue = (cobranza * abb_rate) / 100;
  const totalFinal = subtotal - cobranza - abbValue;

  const formatUSD = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const handleClickNewDebtor = () => {
    setModalFormDebtor({ open: true, debtor_id: formData.debtor_id });
  };

  const handleSetDebtor = (debtor: DebtorBase) => {
    // consulta y setea el debtor_id en el formulario de factura
    fetchDebtors();
    setFormData({
      ...formData,
      debtor_id: debtor.id,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!tenant) return;

      setLoading(true);
      // Ensure debtor_id is not changed when updating other fields
      const newInvoice = await createCollectionCase(formData, tenant?.id);
      setFormData(InitialCollectionCaseCreate);
      console.log("New invoice: ", newInvoice);
      notifySuccess("Opgenomen verzameltaak");
      onSave?.();
    } catch (error) {
      console.error("Error: ", error);
      notifyError(
        "Er is een fout opgetreden bij het registreren van de verzameltaak"
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
              value={formData.reference_number}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  reference_number: e.target.value,
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
                  debtors.find((debtor) => debtor.id === formData.debtor_id) ||
                  null
                }
                onChange={(_, newValue) => {
                  setFormData({
                    ...formData,
                    debtor_id: newValue ? newValue.id : "",
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
              value={formData.amount_original ?? ""}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  amount_original: Number(e.target.value),
                });
              }}
            />
            <TextField
              type="date"
              fullWidth
              size="small"
              label={"Datum vordering"}
              InputLabelProps={{ shrink: true }}
              disabled
              value={
                formData.issue_date
                  ? formData.issue_date instanceof Date
                    ? formData.issue_date.toISOString().slice(0, 10)
                    : new Date(formData.issue_date).toISOString().slice(0, 10)
                  : ""
              }
              onChange={(e) => {
                setFormData({
                  ...formData,
                  issue_date: new Date(e.target.value),
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
                      cobranza + abbValue
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
          setModalFormDebtor({ open: false, debtor_id: formData.debtor_id })
        }
        id={_ModalFormDebtor.debtor_id} // Aquí puedes pasar el ID del deudor si estás editando
        onSave={handleSetDebtor}
      />
    </>
  );
};

export default RegisterInvoice;
