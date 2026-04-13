"use client";
import React, { useEffect, useState } from "react";
import { useForm, FormProvider, Resolver, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DebtorCreateSchema, DebtorCreate } from "@/lib/validations/debtor";

import {
  Button,
  Box,
  Stack,
  IconButton,
  Modal,
  Paper,
  Typography,
  TextField,
  MenuItem,
} from "@mui/material";
import InputHookForm from "@/components/ui/InputHookForm";
import SelectHookForm from "@/components/ui/SelectHookForm";
import { personTypeOptions } from "@/constants/identification";
import {
  createDebtor,
  getDebtorById,
  updateDebtor,
} from "@/actions/debtor";
import { useTenant } from "@/hooks/useTenant";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notifications";
import CloseIcon from "@mui/icons-material/Close";
import { $Enums } from "@prisma/client";
import { DebtorIncomeCreate } from "@/lib/validations/debtor-incomes";
import { getPersonById, getPersonByIdentification } from "@/actions/person";

interface ModalFormDebtorProps {
  open: boolean;
  onClose: () => void;
  onSave: (debtor: any) => void;
  id?: string;
}

const identificationTypeOptions = [
  { value: $Enums.IdentificationType.DNI, label: "DNI" },
  { value: $Enums.IdentificationType.PASSPORT, label: "PASPOORT" },
  { value: $Enums.IdentificationType.NIE, label: "NIE" },
  { value: $Enums.IdentificationType.OTHER, label: "OTHER " },
];

const incomes: DebtorIncomeCreate[] = [];

export const ModalFormDebtor: React.FC<ModalFormDebtorProps> = ({
  open,
  onClose,
  onSave,
  id,
}) => {
  const { tenant } = useTenant();

  const [loading, setLoading] = useState(false);

  const methods = useForm<DebtorCreate>({
    resolver: zodResolver(DebtorCreateSchema),
    defaultValues: {
      email: "",
      person_id: "",
      total_income: 1,
      incomes: incomes,
      person: {
        person_type: "INDIVIDUAL",
        identification_type: "DNI",
        identification: "",
        email: "",
        address: "",
        phone: "",
        first_name: "",
        last_name: "",
        business_name: "",
      },
    },
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
    setValue,
  } = methods;

  const fetchDebtor = async () => {
    if (!id) {
      notifyError("ID is required");
      return;
    }

    const debtor = await getDebtorById(id);
    if (!debtor) {
      notifyError("Debtor not found");
      return;
    }

    const person = await getPersonById(debtor.person_id);
    if (!debtor) {
      throw new Error("Debtor not found");
    }

    reset({ ...debtor, person: { ...person } });
  };

  useEffect(() => {
    if (id && open) {
      try {
        setLoading(true);

        fetchDebtor();
      } catch (error) {
        console.error("Error fetching debtor:", error);
        reset();
      } finally {
        setLoading(false);
      }
    } else if (open) {
      handleClearForm();
    }
  }, [id, open]);

  const handleClearForm = () => {
    reset({ person_id: "" });
  };

  const onSubmit = async (values: DebtorCreate) => {
    if (!tenant) return;

    try {
      console.log("Submitting debtor:", values);

      if (id) {
        const updDebtor = await updateDebtor(values, tenant.id, id);

        if (!updDebtor.success) {
          notifyError("Error updating debtor");
          return;
        }

        onSave(updDebtor.data);
      } else {
        const newDebtor = await createDebtor(values, tenant.id);

        if (!newDebtor.success) {
          notifyError(newDebtor.error || "Error creating debtor");
          return;
        }

        onSave(newDebtor.data);
      }

      notifySuccess(`Debtor ${id ? "updated" : "created"} successfully`);
      reset();
      onClose();
    } catch (error) {
      console.error("Error creating debtor:", error);
      notifyError(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const handleLoadPerson = async (identification: string) => {
    if (!identification) return;

    const person = await getPersonByIdentification(identification);

    reset({
      ...methods.getValues(),
      person: {
        ...methods.getValues().person,
        id: person?.id || undefined,
        first_name: person?.first_name || "",
        last_name: person?.last_name || "",
        email: person?.email || "",
        phone: person?.phone || "",
        address: person?.address || "",
      },
      total_income: 1,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Paper
        component="section"
        sx={{
          mt: 2,
          elevation: 1,
          borderRadius: 1,
          overflow: "hidden",
          mb: 2,
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 300,
        }}
      >
        <Box
          sx={{
            bgcolor: "secondary.main",
            color: "white",
            px: 2,
            py: 1.5,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            borderBottom: "1px solid #e0e0e0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
            {"DEBITEUR"}
          </Typography>
          <IconButton onClick={onClose} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Box sx={{ p: 2 }}>
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} id="debtor-form">
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {/* {JSON.stringify(errors)} */}
                <Controller
                  control={control}
                  name="person.id"
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="id"
                      type="text"
                      required={true}
                      size="small"
                      value={field.value || ""}
                      disabled={true}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="person.person_type"
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Person Type"
                      select
                      required={true}
                      size="small"
                      value={field.value || ""}
                      onChange={(e: any) => {
                        field.onChange(e);
                        const value = e.target.value;
                        console.log("Person Type changed to:", value);
                      }}
                    >
                      {personTypeOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />

                <SelectHookForm
                  name="person.identification_type"
                  label="Identification Type"
                  options={identificationTypeOptions}
                />

                <Controller
                  control={control}
                  name="person.identification"
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Identification"
                      type="text"
                      required={true}
                      size="small"
                      value={field.value || ""}
                      onChange={(e: any) => {
                        const value = e.target.value.toUpperCase();
                        field.onChange(value);
                        console.log("Identification changed to:", value);
                      }}
                      onBlur={(e: any) => {
                        const value = e.target.value.toUpperCase();
                        handleLoadPerson(value);
                      }}
                    />
                  )}
                />

                {watch("person.person_type") === "INDIVIDUAL" && (
                  <>
                    <InputHookForm
                      name="person.first_name"
                      label="First Name"
                      required={true}
                    />
                    <InputHookForm
                      name="person.last_name"
                      label="Last Name"
                      required={true}
                    />
                  </>
                )}
                {watch("person.person_type") === "COMPANY" && (
                  <InputHookForm
                    name="business_name"
                    label="Business Name"
                    required={true}
                  />
                )}
                <Controller
                  control={control}
                  name="email"
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Email"
                      type="email"
                      required={true}
                      size="small"
                      value={field.value || ""}
                      onChange={(e: any) => {
                        const value = e.target.value;
                        field.onChange(value);
                        console.log("Email changed to:", value);
                        setValue("person.email", value);
                      }}
                    />
                  )}
                />
                <InputHookForm
                  name="person.phone"
                  label="Phone"
                  required={true}
                />
                <InputHookForm
                  name="person.address"
                  label="Address"
                  required={true}
                />
                <Controller
                  control={control}
                  name="total_income"
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Total Income"
                      type="number"
                      required={true}
                      size="small"
                      value={field.value || 1}
                      onChange={(e: any) => {
                        const value = parseFloat(e.target.value);
                        field.onChange(isNaN(value) ? 0 : value);
                        console.log("Total Income changed to:", value);
                      }}
                    />
                  )}
                />

                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <Button onClick={onClose} color="secondary" fullWidth>
                    ANNULEREN
                  </Button>
                  <Button
                    type="submit"
                    form="debtor-form"
                    color="primary"
                    variant="contained"
                    disabled={loading}
                    fullWidth
                  >
                    {id ? "UPDATE" : "SAVE"}
                  </Button>
                </Stack>
              </Box>
            </form>
          </FormProvider>
        </Box>
      </Paper>
    </Modal>
  );
};
