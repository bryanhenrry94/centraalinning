"use client";
import React, { useEffect, useState } from "react";
import { useForm, FormProvider, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  lawyerCreateSchema,
  LawyerCreate,
  Lawyer,
} from "@/modules/lawyer/services/lawyer.validators";
import { LawyerStatus } from "@/modules/lawyer/constants/lawyer-status";

import {
  Button,
  Box,
  Stack,
  IconButton,
  Modal,
  Paper,
  Typography,
} from "@mui/material";
import InputHookForm from "@/shared/ui/InputHookForm";
import SelectHookForm from "@/shared/ui/SelectHookForm";
import {
  createLawyer,
  getLawyerById,
  updateLawyer,
} from "@/modules/lawyer/actions/lawyer.actions";
import { useTenant } from "@/modules/auth/hooks/useTenant";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import CloseIcon from "@mui/icons-material/Close";

interface ModalFormLawyerProps {
  open: boolean;
  onClose: () => void;
  onSave: (lawyer: Lawyer) => void;
  id?: string;
}

const STATUS_OPTIONS = [
  { value: LawyerStatus.ACTIVE, label: "Actief" },
  { value: LawyerStatus.INACTIVE, label: "Inactief" },
  { value: LawyerStatus.SUSPENDED, label: "Geschorst" },
];

const defaultValues: LawyerCreate = {
  firstName: "",
  lastName: "",
  companyName: "",
  identification: "",
  barRegistration: "",
  email: "",
  phone: "",
  mobile: "",
  address: "",
  city: "",
  country: "",
  status: LawyerStatus.ACTIVE,
  notes: "",
  userId: null,
};

export const ModalFormLawyer: React.FC<ModalFormLawyerProps> = ({
  open,
  onClose,
  onSave,
  id,
}) => {
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(false);

  const methods = useForm<LawyerCreate>({
    resolver: zodResolver(lawyerCreateSchema) as unknown as Resolver<LawyerCreate>,
    defaultValues,
  });

  const { handleSubmit, reset } = methods;

  useEffect(() => {
    if (!open || !id || !tenant) return;

    let isMounted = true;

    const loadLawyer = async () => {
      setLoading(true);
      try {
        const response = await getLawyerById(id);
        if (!response.success || !response.data) {
          notifyError("Advocaat niet gevonden");
          if (isMounted) reset(defaultValues);
          return;
        }
        if (isMounted)
          reset({
            firstName: response.data.firstName,
            lastName: response.data.lastName,
            companyName: response.data.companyName || "",
            identification: response.data.identification || "",
            barRegistration: response.data.barRegistration || "",
            email: response.data.email || "",
            phone: response.data.phone || "",
            mobile: response.data.mobile || "",
            address: response.data.address || "",
            city: response.data.city || "",
            country: response.data.country || "",
            status: response.data.status as LawyerStatus,
            notes: response.data.notes || "",
            userId: response.data.userId,
          });
      } catch (error) {
        console.error(error);
        notifyError("Fout bij het ophalen van de advocaat");
        if (isMounted) reset(defaultValues);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadLawyer();

    return () => {
      isMounted = false;
    };
  }, [id, open, tenant, reset]);

  const onSubmit = async (values: LawyerCreate) => {
    if (!tenant) {
      notifyError("Organisatie niet gevonden");
      return;
    }

    setLoading(true);
    try {
      if (id) {
        const result = await updateLawyer(id, values);

        if (!result.success || !result.data) {
          notifyError("De advocaat kon niet worden bijgewerkt");
          return;
        }

        notifySuccess("Advocaat succesvol bijgewerkt");

        onSave(result.data);
        reset(defaultValues);
        onClose();
      } else {
        const result = await createLawyer(values, tenant.id);
        if (!result.success || !result.data) {
          notifyError("De advocaat kon niet worden aangemaakt");
          return;
        }

        notifySuccess("Advocaat succesvol aangemaakt");
        onSave(result.data);
        reset(defaultValues);
        onClose();
      }
    } catch (error) {
      console.error("Error saving lawyer:", error);
      notifyError(error instanceof Error ? error.message : "Er is een fout opgetreden");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="lawyer-modal-title"
      keepMounted
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
          width: 420,
          maxHeight: "90vh",
          overflowY: "auto",
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
            ADVOCAAT
          </Typography>
          <IconButton onClick={onClose} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ p: 2 }}>
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <InputHookForm name="firstName" label="Voornaam" required />
                <InputHookForm name="lastName" label="Achternaam" required />
                <InputHookForm name="companyName" label="Kantoor / bedrijf" />
                <InputHookForm name="identification" label="Identificatie" />
                <InputHookForm name="barRegistration" label="Registratienummer (balie)" />
                <InputHookForm name="email" label="E-mailadres" />
                <InputHookForm name="phone" label="Telefoon" />
                <InputHookForm name="mobile" label="Mobiel" />
                <InputHookForm name="address" label="Adres" />
                <InputHookForm name="city" label="Stad" />
                <InputHookForm name="country" label="Land" />
                <SelectHookForm name="status" label="Status" options={STATUS_OPTIONS} />
                <InputHookForm name="notes" label="Notities" />

                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <Button onClick={onClose} color="secondary" fullWidth>
                    ANNULEREN
                  </Button>
                  <Button
                    type="submit"
                    color="primary"
                    variant="contained"
                    disabled={loading}
                    fullWidth
                  >
                    {id ? "BIJWERKEN" : "OPSLAAN"}
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
