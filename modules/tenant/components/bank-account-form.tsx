"use client";

import React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
  CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
import { useSession } from "next-auth/react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createBankAccount,
  deleteBankAccount,
  getAllBankAccountsByTenantId,
  updateBankAccount,
} from "@/modules/tenant/actions/bank-account.actions";
import {
  BankAccount,
  CreateBankAccount,
  createBankAccountSchema,
} from "@/modules/tenant/services/bank-account.validators";
import { AlertService } from "@/shared/ui/alerts";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  SAVINGS: "Ahorro",
  CHECKING: "Corriente",
};

const defaultFormValues: CreateBankAccount = {
  bank_name: "",
  account_number: "",
  account_type: "SAVINGS",
};

export const BankAccountForm = () => {
  const { data: session } = useSession();
  const [open, setOpen] = React.useState(false);
  const [bankAccounts, setBankAccounts] = React.useState<BankAccount[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedBankAccount, setSelectedBankAccount] =
    React.useState<BankAccount | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateBankAccount>({
    resolver: zodResolver(createBankAccountSchema),
    defaultValues: defaultFormValues,
  });

  React.useEffect(() => {
    if (session?.user?.tenant_id) {
      fetchBankAccounts();
    }
  }, [session]);

  const fetchBankAccounts = async () => {
    setLoading(true);
    try {
      if (!session?.user?.tenant_id) {
        setBankAccounts([]);
        return;
      }

      const response = await getAllBankAccountsByTenantId(
        session.user.tenant_id,
      );
      if (response.success && response.data) {
        setBankAccounts(response.data);
      }
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (bankAccount?: BankAccount) => {
    if (bankAccount) {
      setSelectedBankAccount(bankAccount);
      reset(bankAccount);
    } else {
      setSelectedBankAccount(null);
      reset(defaultFormValues);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    reset(defaultFormValues);
    setSelectedBankAccount(null);
  };

  const onSubmit = async (data: CreateBankAccount) => {
    try {
      const response = selectedBankAccount
        ? await updateBankAccount(selectedBankAccount.id, data)
        : await createBankAccount(data, session!.user!.tenant_id);

      if (!response.success) throw new Error(response.error);

      await fetchBankAccounts();
      handleClose();
    } catch (error) {
      console.error("Error saving bank account:", error);
    }
  };

  const handleDelete = async (id: string) => {
    const confirm = await AlertService.showConfirm(
      "Bankrekening Verwijderen",
      "Weet je zeker dat je deze bankrekening wilt verwijderen?",
      "Ja",
      "Annuleren",
    );

    if (!confirm) return;
    try {
      const response = await deleteBankAccount(id);
      if (!response.success) throw new Error(response.error);
      await fetchBankAccounts();
    } catch (error) {
      console.error("Error deleting bank account:", error);
    }
  };

  return (
    <Box>
      <Box mb={2}>
        <Typography variant="h6" fontWeight="bold">
          Bankrekeningen
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mt={1}>
          <Button variant="contained" onClick={() => handleOpen()}>
            Nieuwe Bankrekening
          </Button>
        </Stack>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        (() => {
          const columns: ListColumn<(typeof bankAccounts)[number]>[] = [
            { key: "bank_name", label: "Bank", render: (b) => b.bank_name },
            { key: "account_number", label: "Rekeningnummer", render: (b) => b.account_number },
            {
              key: "account_type",
              label: "Type",
              render: (b) => ACCOUNT_TYPE_LABELS[b.account_type] || b.account_type,
            },
            {
              key: "actions",
              label: "Acties",
              render: (bankAccount) => (
                <>
                  <IconButton color="secondary" size="small" onClick={() => handleOpen(bankAccount)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton color="error" size="small" onClick={() => handleDelete(bankAccount.id)}>
                    <DeleteIcon />
                  </IconButton>
                </>
              ),
            },
          ];

          return (
            <ResponsiveListTable
              columns={columns}
              rows={bankAccounts}
              getRowKey={(b) => b.id}
              emptyMessage="Geen bankrekeningen gevonden."
            />
          );
        })()
      )}

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle
          sx={{
            bgcolor: "secondary.main",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontWeight: 600,
          }}
        >
          {selectedBankAccount ? "Bankrekening Bewerken" : "Nieuwe Bankrekening"}
          <IconButton onClick={handleClose} disabled={isSubmitting} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Box sx={{ p: { xs: 2, sm: 3 }, minWidth: { xs: "auto", sm: 400 } }}>
          <Box
            component="form"
            noValidate
            autoComplete="off"
            onSubmit={handleSubmit(onSubmit)}
          >
            <Stack spacing={2}>
              <Controller
                name="bank_name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Banknaam"
                    fullWidth
                    value={field.value || ""}
                    error={!!errors.bank_name}
                    helperText={errors.bank_name?.message || ""}
                  />
                )}
              />
              <Controller
                name="account_number"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Rekeningnummer"
                    fullWidth
                    value={field.value || ""}
                    error={!!errors.account_number}
                    helperText={errors.account_number?.message || ""}
                  />
                )}
              />
              <Controller
                name="account_type"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Type rekening"
                    fullWidth
                    value={field.value || "SAVINGS"}
                    error={!!errors.account_type}
                    helperText={errors.account_type?.message || ""}
                  >
                    <MenuItem value="SAVINGS">Ahorro</MenuItem>
                    <MenuItem value="CHECKING">Corriente</MenuItem>
                  </TextField>
                )}
              />
            </Stack>

            <Stack direction="row" spacing={2} mt={2} justifyContent="flex-end">
              <Button onClick={handleClose} disabled={isSubmitting}>
                Annuleren
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Opslaan..." : "Opslaan"}
              </Button>
            </Stack>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
};
