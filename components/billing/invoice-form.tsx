"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// mui
import {
  Box,
  Button,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Grid,
} from "@mui/material";
// icons
import SaveIcon from "@mui/icons-material/Save";
import { Delete as DeleteIcon, Print } from "@mui/icons-material";
// context
import { useTenant } from "@/hooks/useTenant";
// utils
import { formatCurrency } from "@/utils/formatters";
// react-hook-form
import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// schemas
import {
  BillingInvoiceCreate,
  BillingInvoiceCreateSchema,
} from "@/lib/validations/billing-invoice";
import { BillingInvoiceDetailBase } from "@/lib/validations/billing-invoice-detail";
import { Tenant } from "@/lib/validations/tenant";
// actions
import {
  createInvoice,
  getInvoiceById,
  getNextInvoiceNumber,
  updateInvoice,
} from "@/actions/billing-invoice";
import { getAllTenants } from "@/actions/tenant";
// libs
import { notifyError, notifyInfo } from "@/lib/notifications";
import { AlertService } from "@/lib/alerts";

interface InvoiceFormPageProps {
  id?: string;
}

const InvoiceFormPage: React.FC<InvoiceFormPageProps> = ({ id }) => {
  const { tenant } = useTenant();
  const [modeEdit, setModeEdit] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const router = useRouter();

  const fetchTenants = async () => {
    if (!tenant) return;
    const data = await getAllTenants();
    setTenants(data);
  };

  const methods = useForm<BillingInvoiceCreate>({
    resolver: zodResolver(BillingInvoiceCreateSchema) as any,
  });

  const {
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = methods;

  const { fields, append, remove } = useFieldArray<BillingInvoiceCreate>({
    control,
    name: "invoice_details",
  });

  const onSubmit = async (data: BillingInvoiceCreate) => {
    AlertService.showConfirm(
      "Weet je het zeker?",
      "Deze actie registreert de factuur. Wil je doorgaan?",
      "Ja, registreren",
      "Annuleren"
    ).then(async (confirmed) => {
      if (confirmed) {
        if (!tenant) {
          notifyError(
            "Onverwerkte fout, neem contact op met uw systeembeheerder"
          );
          return;
        }

        if (id) {
          await updateInvoice(id, data);
          notifyInfo("Registratie is bijgewerkt");
        } else {
          const newInvoice = await createInvoice(data, tenant?.id);
          if (newInvoice) {
            notifyInfo("Registro creado exitosamente");
            router.push(`/admin/invoices/${newInvoice.id}/edit`); // Redirect to the newly created invoice page
            reset();
          }
        }
      }
    });
  };

  const CustomRow = ({
    item,
    index,
  }: {
    item: BillingInvoiceDetailBase;
    index: number;
  }) => (
    <TableRow key={item.id}>
      <TableCell sx={{ textAlign: "center" }}>
        <Controller
          name={`invoice_details.${index}.item_quantity`}
          control={control}
          defaultValue={item.item_quantity ?? 0}
          render={({ field }) => (
            <TextField
              {...field}
              type="number"
              size="small"
              error={!!errors.invoice_details?.[index]?.item_quantity}
              helperText={
                errors.invoice_details?.[index]?.item_quantity?.message
              }
              // slotProps={{ input: { min: 1 } }}
              fullWidth
            />
          )}
        />
      </TableCell>
      <TableCell sx={{ textAlign: "center" }}>
        <Controller
          name={`invoice_details.${index}.item_description`}
          control={control}
          defaultValue={item.item_description ?? ""}
          render={({ field }) => (
            <TextField
              {...field}
              size="small"
              error={!!errors.invoice_details?.[index]?.item_description}
              helperText={
                errors.invoice_details?.[index]?.item_description?.message
              }
              fullWidth
            />
          )}
        />
      </TableCell>
      <TableCell sx={{ textAlign: "center" }}>
        <Controller
          name={`invoice_details.${index}.item_unit_price`}
          control={control}
          defaultValue={item.item_unit_price ?? 0}
          render={({ field }) => (
            <TextField
              {...field}
              type="number"
              size="small"
              error={!!errors.invoice_details?.[index]?.item_unit_price}
              helperText={
                errors.invoice_details?.[index]?.item_unit_price?.message
              }
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;

                const quantity =
                  methods.getValues(`invoice_details.${index}.item_quantity`) ||
                  0;
                const taxRate =
                  methods.getValues(`invoice_details.${index}.item_tax_rate`) ||
                  0;

                const totalPrice = Number(value) * Number(quantity);
                const taxAmount = (Number(totalPrice) * Number(taxRate)) / 100;
                const totalWithTax = Number(totalPrice) + Number(taxAmount);

                methods.setValue(
                  `invoice_details.${index}.item_total_price`,
                  Number(totalPrice.toFixed(2))
                );
                methods.setValue(
                  `invoice_details.${index}.item_tax_amount`,
                  Number(taxAmount.toFixed(2))
                );
                methods.setValue(
                  `invoice_details.${index}.item_total_with_tax`,
                  Number(totalWithTax.toFixed(2))
                );

                field.onChange(value);
              }}
              fullWidth
            />
          )}
        />
      </TableCell>
      <TableCell sx={{ textAlign: "center" }}>
        <Controller
          name={`invoice_details.${index}.item_tax_amount`}
          control={control}
          defaultValue={item.item_tax_amount ?? 0}
          render={({ field }) => (
            <TextField
              {...field}
              type="number"
              size="small"
              error={!!errors.invoice_details?.[index]?.item_tax_amount}
              helperText={
                errors.invoice_details?.[index]?.item_tax_amount?.message
              }
              fullWidth
            />
          )}
        />
      </TableCell>
      <TableCell sx={{ textAlign: "center" }}>
        <Controller
          name={`invoice_details.${index}.item_total_with_tax`}
          control={control}
          defaultValue={item?.item_total_with_tax ?? 0}
          render={({ field }) => (
            <TextField
              {...field}
              type="number"
              size="small"
              error={!!errors.invoice_details?.[index]?.item_total_with_tax}
              helperText={
                errors.invoice_details?.[index]?.item_total_with_tax?.message
              }
              slotProps={{ input: { readOnly: true } }}
              fullWidth
            />
          )}
        />
      </TableCell>
      <TableCell sx={{ textAlign: "center" }}>
        <IconButton color="error" onClick={() => remove(index)} size="small">
          <DeleteIcon />
        </IconButton>
      </TableCell>
    </TableRow>
  );

  useEffect(() => {
    setModeEdit(false);

    if (id) {
      const fetchInvoice = async () => {
        setModeEdit(true);
        const data = await getInvoiceById(id);
        if (data) {
          reset({
            ...data,
            invoice_details: data.invoice_details || [],
          });
        } else {
          notifyError("No se encontró la factura");
        }
      };
      fetchInvoice();
    } else {
      const fetchNextInvoiceNumber = async () => {
        if (!tenant) return;
        const nextInvoiceNumber = await getNextInvoiceNumber(tenant.id);
        reset({
          invoice_number: nextInvoiceNumber,
          issue_date: new Date(),
          invoice_details: [],
        });
      };
      fetchNextInvoiceNumber();
    }
  }, [id]);

  useEffect(() => {
    fetchTenants();
  }, [tenant]);

  const TotalComponent: React.FC<{ control: any }> = ({ control }) => {
    const dataInvoice_details = useWatch({ control, name: "invoice_details" });
    const subtotal =
      (dataInvoice_details as BillingInvoiceDetailBase[] | undefined)?.reduce(
        (sum: number, item: BillingInvoiceDetailBase) =>
          sum +
          (Number(item?.item_total_price) + Number(item?.item_tax_amount) || 0),
        0
      ) ?? 0;
    const totalTax =
      (dataInvoice_details as BillingInvoiceDetailBase[] | undefined)?.reduce(
        (sum: number, item: BillingInvoiceDetailBase) =>
          sum + (Number(item?.item_tax_amount) || 0),
        0
      ) ?? 0;
    const total = subtotal + totalTax;

    return (
      <Paper
        component="section"
        sx={{
          elevation: 1,
          borderRadius: 1,
          overflow: "hidden",
          mb: 2,
          minWidth: 400,
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body1" component="h3">
              Subtotaal:
            </Typography>
            <Typography variant="body1" component="h3">
              {formatCurrency(subtotal)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body1" component="h3">
              ABB 6%:
            </Typography>
            <Typography variant="body1" component="h3">
              {formatCurrency(totalTax)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body1" component="h3">
              Totaal:
            </Typography>
            <Typography variant="body1" component="h3">
              {formatCurrency(total)}
            </Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="h6" component="h3">
              Te betalen:
            </Typography>
            <Typography variant="h6" component="h3">
              {formatCurrency(total)}
            </Typography>
          </Box>
        </Box>
      </Paper>
    );
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography variant="h5" component="h3">
          FACTUUR
        </Typography>
      </Box>

      <FormProvider {...methods}>
        <Box component={"form"} onSubmit={handleSubmit(onSubmit)}>
          {/* Mostrar todos los errores de validación */}
          {Object.keys(errors).length > 0 && (
            <Box sx={{ mb: 2 }}>
              {Object.entries(errors).map(([key, error]) => (
                <Typography key={key} color="error" variant="body2">
                  {key}: {error?.message?.toString()}
                </Typography>
              ))}
            </Box>
          )}
          {/* Vonnis Information Section */}
          <Paper
            component="section"
            sx={{
              mt: 2,
              elevation: 1,
              borderRadius: 1,
              overflow: "hidden",
              mb: 2,
            }}
          >
            <Box
              sx={{
                p: 2,
                gap: 2,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  gap: 0.5,
                  alignItems: "center",
                  width: "100%",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Controller
                    name="tenant_id"
                    control={control}
                    defaultValue=""
                    render={({ field }) => (
                      <TextField
                        label="Klant"
                        {...field}
                        value={field.value ?? ""}
                        select
                        sx={{ width: 200 }}
                        size="small"
                        error={!!errors.tenant_id}
                        helperText={errors.tenant_id?.message}
                        required
                      >
                        {tenants.map((tenant) => (
                          <MenuItem key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Box>

                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      mt: 1,
                    }}
                  >
                    <Controller
                      name="invoice_number"
                      control={control}
                      defaultValue=""
                      render={({ field }) => (
                        <TextField
                          label="Factuurnummer"
                          {...field}
                          sx={{ maxWidth: 400 }}
                          size="small"
                          error={!!errors.invoice_number}
                          helperText={errors.invoice_number?.message}
                          required
                        />
                      )}
                    />
                    <Controller
                      name="issue_date"
                      control={control}
                      defaultValue={new Date()}
                      render={({ field }) => (
                        <TextField
                          label="Factuurdatum"
                          {...field}
                          value={
                            field.value
                              ? new Date(field.value)
                                  .toISOString()
                                  .substring(0, 10)
                              : ""
                          }
                          sx={{ maxWidth: 400 }}
                          size="small"
                          type="date"
                          slotProps={{ inputLabel: { shrink: true } }}
                          error={!!errors.issue_date}
                          helperText={errors.issue_date?.message}
                          required
                        />
                      )}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>
          </Paper>

          <TableContainer>
            <Table
              stickyHeader
              sx={{
                // minWidth: 900,
                "& .MuiTableCell-root": {
                  border: "1px solid #e0e0e0",
                },
              }}
              aria-label="tabla de embargo"
              size="small"
            >
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      minWidth: 50,
                      backgroundColor: "#bdbdbd",
                      fontWeight: "bold",
                      border: "1px solid #bdbdbd",
                    }}
                    align="center"
                  >
                    Hoeveelheid
                  </TableCell>
                  <TableCell
                    sx={{
                      minWidth: 150,
                      backgroundColor: "#bdbdbd",
                      fontWeight: "bold",
                      border: "1px solid #bdbdbd",
                    }}
                    align="center"
                  >
                    Product/dienst
                  </TableCell>
                  <TableCell
                    sx={{
                      minWidth: 50,
                      backgroundColor: "#bdbdbd",
                      fontWeight: "bold",
                      border: "1px solid #bdbdbd",
                    }}
                    align="center"
                  >
                    Prijs per stuk
                  </TableCell>
                  <TableCell
                    sx={{
                      minWidth: 50,
                      backgroundColor: "#bdbdbd",
                      fontWeight: "bold",
                      border: "1px solid #bdbdbd",
                    }}
                    align="center"
                  >
                    ABB 6%
                  </TableCell>
                  <TableCell
                    sx={{
                      minWidth: 50,
                      backgroundColor: "#bdbdbd",
                      fontWeight: "bold",
                      border: "1px solid #bdbdbd",
                    }}
                    align="center"
                  >
                    Subtotaal
                  </TableCell>
                  <TableCell
                    sx={{
                      minWidth: 50,
                      backgroundColor: "#bdbdbd",
                      fontWeight: "bold",
                      border: "1px solid #bdbdbd",
                    }}
                    align="center"
                  />
                </TableRow>
              </TableHead>
              <TableBody>
                {fields.map((field, index) => (
                  <CustomRow
                    key={field.id}
                    item={field as BillingInvoiceDetailBase}
                    index={index}
                  />
                ))}
                <TableRow>
                  <TableCell colSpan={6} align="left">
                    <Button
                      variant="outlined"
                      onClick={() =>
                        append({
                          item_description: "",
                          item_quantity: 0,
                          item_unit_price: 0,
                          item_total_price: 0,
                          item_tax_rate: 6,
                          item_tax_amount: 0,
                          item_total_with_tax: 0,
                        })
                      }
                      sx={{ textTransform: "none" }}
                    >
                      + Item toevoegen
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Grid container spacing={2} sx={{ mt: 4 }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "stretch",
                  justifyContent: "space-between",
                  gap: 2,
                  height: "100%",
                  // minHeight: 100, // puedes ajustar este valor según tu diseño
                }}
              >
                {/* <Controller
                  name="description"
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <TextField
                      label="Omschrijving"
                      {...field}
                      value={field.value ?? ""}
                      sx={{ maxWidth: 600 }}
                      size="small"
                      error={!!errors.description}
                      helperText={errors.description?.message}
                      fullWidth
                      rows={2}
                      multiline
                    />
                  )}
                /> */}

                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  sx={{ maxWidth: 200, textTransform: "none" }}
                >
                  Houden
                </Button>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TotalComponent control={control} />
            </Grid>
          </Grid>
        </Box>
      </FormProvider>
    </Box>
  );
};

export default InvoiceFormPage;
