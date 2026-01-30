"use client";

import React from "react";
import {
  Box,
  Button,
  Dialog,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useSession } from "next-auth/react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createEmployee,
  deleteEmployee,
  getAllEmployeesByTenantId,
  updateEmployee,
} from "@/actions/employee";
import {
  CreateEmployee,
  createEmployeeSchema,
  Employee,
} from "@/lib/validations/employee";
import { AlertService } from "@/lib/alerts";
import { EmployeeImportDialog } from "./employee-import-dialog";

export const EmployeeForm = () => {
  const { data: session } = useSession();
  const [open, setOpen] = React.useState(false);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedEmployee, setSelectedEmployee] =
    React.useState<Employee | null>(null);
  const [importDialogOpen, setImportDialogOpen] = React.useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateEmployee>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      identification: "",
      first_name: "",
      last_name: "",
      email: "",
      address: "",
      phone: "",
    },
  });

  // ✅ Fetch employees once tenant is available
  React.useEffect(() => {
    if (session?.user?.tenant_id) {
      fetchEmployees();
    }
  }, [session]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      if (!session?.user?.tenant_id) {
        setEmployees([]);
        return;
      }

      const response = await getAllEmployeesByTenantId(
        session!.user?.tenant_id
      );
      if (response.success && response.data) {
        setEmployees(response.data);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (employee?: Employee) => {
    if (employee) {
      setSelectedEmployee(employee);
      reset(employee); // ✅ Prellena el formulario en modo edición
    } else {
      setSelectedEmployee(null);
      reset({
        identification: "",
        first_name: "",
        last_name: "",
        email: "",
        address: "",
        phone: "",
      }); // ✅ Limpia el formulario en modo creación
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    reset();
    setSelectedEmployee(null);
  };

  const handleImportDialogOpen = () => {
    setImportDialogOpen(true);
  };

  const handleImportDialogClose = () => {
    setImportDialogOpen(false);
  };

  const onSubmit = async (data: CreateEmployee) => {
    try {
      const response = selectedEmployee
        ? await updateEmployee(selectedEmployee.id, data)
        : await createEmployee(data, session!.user!.tenant_id);

      if (!response.success) throw new Error(response.error);

      await fetchEmployees();
      handleClose();
    } catch (error) {
      console.error("Error saving employee:", error);
    }
  };

  const handleDelete = async (id: string) => {
    const confirm = await AlertService.showConfirm(
      "Medewerker Verwijderen",
      "Weet je zeker dat je deze medewerker wilt verwijderen?",
      "Ja",
      "Annuleren"
    );

    if (!confirm) return;
    try {
      const response = await deleteEmployee(id);
      if (!response.success) throw new Error(response.error);
      await fetchEmployees();
    } catch (error) {
      console.error("Error deleting employee:", error);
    }
  };

  const handleImportSuccess = async () => {
    await fetchEmployees();
  };

  return (
    <Box>
      <Box mb={2}>
        <Typography variant="h6" fontWeight="bold">
          Medewerkers
        </Typography>
        <Stack direction="row" spacing={2} mt={1}>
          <Button variant="contained" onClick={() => handleOpen()}>
            Nieuwe Medewerker
          </Button>
          <Button variant="outlined" onClick={handleImportDialogOpen}>
            Medewerkers importeren
          </Button>
        </Stack>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer>
          <Table
            stickyHeader
            size="small"
            sx={{
              "& .MuiTableCell-root": { border: "1px solid #e0e0e0" },
            }}
          >
            <TableHead>
              <TableRow>
                {[
                  "Identiteitskaart",
                  "Naam",
                  "Achternaam",
                  "Email",
                  "Adres",
                  "Telefoon",
                  "Acties",
                ].map((header) => (
                  <TableCell
                    key={header}
                    align="center"
                    sx={{
                      backgroundColor: "secondary.main",
                      color: "#fff",
                      fontWeight: "bold",
                      border: "1px solid #bdbdbd",
                    }}
                  >
                    {header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.length > 0 ? (
                employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell align="center">
                      {employee.identification}
                    </TableCell>
                    <TableCell align="center">{employee.first_name}</TableCell>
                    <TableCell align="center">{employee.last_name}</TableCell>
                    <TableCell align="center">{employee.email}</TableCell>
                    <TableCell align="center">{employee.address}</TableCell>
                    <TableCell align="center">{employee.phone}</TableCell>
                    <TableCell align="center">
                      <IconButton
                        color="secondary"
                        size="small"
                        onClick={() => handleOpen(employee)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => handleDelete(employee.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Geen medewerkers gevonden.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog for Create/Edit */}
      <Dialog open={open} onClose={handleClose}>
        <Box p={3} minWidth={400}>
          <Typography variant="h6" gutterBottom>
            {selectedEmployee ? "Medewerker Bewerken" : "Nieuwe Medewerker"}
          </Typography>

          <Box
            component="form"
            noValidate
            autoComplete="off"
            onSubmit={handleSubmit(onSubmit)}
          >
            <Stack spacing={2}>
              <Controller
                name={"identification"}
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={capitalizeLabel("identification")}
                    fullWidth
                    value={field.value || ""}
                    error={!!errors["identification"]}
                    helperText={errors["identification"]?.message || ""}
                  />
                )}
              />
              <Controller
                name={"first_name"}
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={capitalizeLabel("first_name")}
                    fullWidth
                    value={field.value || ""}
                    error={!!errors["first_name"]}
                    helperText={errors["first_name"]?.message || ""}
                  />
                )}
              />
              <Controller
                name={"last_name"}
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={capitalizeLabel("last_name")}
                    fullWidth
                    value={field.value || ""}
                    error={!!errors["last_name"]}
                    helperText={errors["last_name"]?.message || ""}
                  />
                )}
              />
              <Controller
                name={"email"}
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={capitalizeLabel("email")}
                    fullWidth
                    value={field.value || ""}
                    error={!!errors["email"]}
                    helperText={errors["email"]?.message || ""}
                  />
                )}
              />
              <Controller
                name={"address"}
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={capitalizeLabel("address")}
                    fullWidth
                    value={field.value || ""}
                    error={!!errors["address"]}
                    helperText={errors["address"]?.message || ""}
                  />
                )}
              />
              <Controller
                name={"phone"}
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={capitalizeLabel("phone")}
                    fullWidth
                    value={field.value || ""}
                    error={!!errors["phone"]}
                    helperText={errors["phone"]?.message || ""}
                  />
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
      <EmployeeImportDialog
        open={importDialogOpen}
        onClose={handleImportDialogClose}
        onSuccess={handleImportSuccess}
      />
    </Box>
  );
};

// Helper to capitalize labels dynamically
const capitalizeLabel = (field: string): string => {
  const labels: Record<string, string> = {
    identification: "Identiteitskaart",
    first_name: "Naam",
    last_name: "Achternaam",
    email: "Email",
    address: "Adres",
    phone: "Telefoon",
  };
  return labels[field] || field;
};
