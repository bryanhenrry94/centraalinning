"use client";
import React, { useEffect, useState } from "react";
import { useForm, FormProvider, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  bailiffCreateSchema,
  BailiffCreate,
  Bailiff,
} from "@/lib/validations/bailiff";

import {
  Button,
  Box,
  Stack,
  IconButton,
  Modal,
  Paper,
  Typography,
} from "@mui/material";
import InputHookForm from "@/components/ui/InputHookForm";
import {
  createBailiff,
  getBailiffById,
  updateBailiff,
} from "@/actions/bailiff";
import { useTenant } from "@/hooks/useTenant";
import { notifyError, notifySuccess } from "@/lib/notifications";
import CloseIcon from "@mui/icons-material/Close";

interface ModalFormBailiffProps {
  open: boolean;
  onClose: () => void;
  onSave: (bailiff: Bailiff) => void;
  id?: string;
}

export const ModalFormBailiff: React.FC<ModalFormBailiffProps> = ({
  open,
  onClose,
  onSave,
  id,
}) => {
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(false);

  const defaultValues: BailiffCreate = { fullname: "", email: "", phone: "" };

  const methods = useForm<BailiffCreate>({
    resolver: zodResolver(
      bailiffCreateSchema
    ) as unknown as Resolver<BailiffCreate>,
    defaultValues,
  });

  const { handleSubmit, reset } = methods;

  useEffect(() => {
    if (!open || !id || !tenant) return;

    let isMounted = true;

    const loadBailiff = async () => {
      setLoading(true);
      try {
        const response = await getBailiffById(id);
        if (!response.success || !response.data) {
          notifyError("Bailiff not found");
          if (isMounted) reset(defaultValues);
          return;
        }
        if (isMounted)
          reset({
            fullname: response.data.fullname,
            email: response.data.email,
            phone: response.data.phone || "",
          });
      } catch (error) {
        console.error(error);
        notifyError("Error fetching bailiff");
        if (isMounted) reset(defaultValues);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadBailiff();

    return () => {
      isMounted = false;
    };
  }, [id, open, tenant, reset]);

  const onSubmit = async (values: BailiffCreate) => {
    if (!tenant) {
      notifyError("Tenant not found");
      return;
    }

    setLoading(true);
    try {
      if (id) {
        const result = await updateBailiff(id, values);

        if (!result.success || !result.data) {
          notifyError("Failed to update bailiff");
          return;
        }

        notifySuccess("Bailiff updated successfully");

        onSave(result.data);
        reset(defaultValues);
        onClose();
      } else {
        const result = await createBailiff(values, tenant.id);
        if (!result.success || !result.data) {
          notifyError("Failed to create bailiff");
          return;
        }

        notifySuccess("Bailiff created successfully");
        onSave(result.data);
        reset(defaultValues);
        onClose();
      }
    } catch (error) {
      console.error("Error saving bailiff:", error);
      notifyError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="bailiff-modal-title"
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
            DEURWAARDER
          </Typography>
          <IconButton onClick={onClose} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ p: 2 }}>
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <InputHookForm name="fullname" label="Full Name" required />
                <InputHookForm name="email" label="Email" required />
                <InputHookForm name="phone" label="Phone" required />

                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <Button onClick={onClose} color="secondary" fullWidth>
                    CANCEL
                  </Button>
                  <Button
                    type="submit"
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
