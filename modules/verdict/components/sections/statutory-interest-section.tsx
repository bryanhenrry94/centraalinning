import React, { useEffect } from "react";
import { InterestType } from "@/modules/settings/services/interest-type.validators";
import { VerdictInterestDetailCreate } from "@/modules/verdict/services/verdict-interest-details.validators";
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Modal,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { IVerdictInterestCreate } from "@/modules/verdict/services/verdict-interest.validators";
import { getAllInterestTypes } from "@/modules/settings/actions/interest-type.actions";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import InterestCell from "../interest-cell";
import TotalCell from "../total-cell";
import TotalInterest from "../total-interest";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";

const StatutoryInterestSection: React.FC = () => {
  const [interesTipos, setInteresTipos] = React.useState<InterestType[]>([]);
  const [rowsInterest, setRowsInterest] = React.useState<
    VerdictInterestDetailCreate[]
  >([]);

  const [open, setOpen] = React.useState<boolean>(false);
  const handleClose = () => setOpen(false);

  const {
    control,
    formState: { errors },
  } = useFormContext<{
    verdict_interest: IVerdictInterestCreate[];
    total_interest?: number;
  }>();

  const { fields, append, remove } = useFieldArray<{
    verdict_interest: IVerdictInterestCreate[];
  }>({
    control,
    name: "verdict_interest",
  });

  useEffect(() => {
    // Fetch interest types from the service
    const fetchInterestTypes = async () => {
      const response = await getAllInterestTypes();
      setInteresTipos(response.interestTypes);
    };

    fetchInterestTypes();
  }, []);

  const handleShowDetail = (item: IVerdictInterestCreate) => {
    setOpen(true);
    setRowsInterest(item.details);
  };

  const CalculatedInterestCell = ({
    control,
    index,
  }: {
    control: any;
    index: number;
  }) => {
    const item = useWatch({
      control,
      name: `verdictInterest.${index}`,
    });

    return (
      <>
        {interesTipos.find((tipo) => tipo.id === item.interest_type)
          ?.calculation_type === "FIXED" ? (
          <Controller
            name={`verdict_interest.${index}.calculated_interest`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                fullWidth
                type="number"
                placeholder="0.00"
                inputProps={{ step: "any" }}
                error={!!errors.verdict_interest?.[index]?.calculated_interest}
                helperText={
                  errors.verdict_interest?.[index]?.calculated_interest?.message
                }
              />
            )}
          />
        ) : (
          <IconButton
            aria-label="edit"
            color="secondary"
            size="small"
            onClick={() => {
              handleShowDetail(item);
            }}
          >
            <VisibilityIcon />
          </IconButton>
        )}
      </>
    );
  };

  const columns: ListColumn<{ id: string; index: number }>[] = [
    {
      key: "interest_type",
      label: "Soort rente",
      render: ({ index }) => (
        <Controller
          name={`verdict_interest.${index}.interest_type`}
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              id="outlined-select-interest_type"
              select
              value={field.value ?? ""}
              fullWidth
              size="small"
              error={!!errors.verdict_interest?.[index]?.interest_type}
              helperText={
                errors.verdict_interest?.[index]?.interest_type?.message
              }
            >
              {interesTipos.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.name}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
      ),
    },
    {
      key: "calculation_start",
      label: "Berekenen vanaf",
      align: "center",
      render: ({ index }) => (
        <Controller
          name={`verdict_interest.${index}.calculation_start`}
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              type="date"
              fullWidth
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              error={!!errors.verdict_interest?.[index]?.calculation_start}
              helperText={
                errors.verdict_interest?.[index]?.calculation_start?.message
              }
              value={
                field.value
                  ? new Date(field.value).toISOString().slice(0, 10)
                  : ""
              }
              onChange={(e) => {
                field.onChange(
                  e.target.value ? new Date(e.target.value) : null
                );
              }}
            />
          )}
        />
      ),
    },
    {
      key: "calculation_end",
      label: "Berekenen tot en met",
      align: "center",
      render: ({ index }) => (
        <Controller
          name={`verdict_interest.${index}.calculation_end`}
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              type="date"
              fullWidth
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              error={!!errors.verdict_interest?.[index]?.calculation_end}
              helperText={
                errors.verdict_interest?.[index]?.calculation_end?.message
              }
              value={
                field.value
                  ? new Date(field.value).toISOString().slice(0, 10)
                  : ""
              }
              onChange={(e) => {
                field.onChange(
                  e.target.value ? new Date(e.target.value) : null
                );
              }}
            />
          )}
        />
      ),
    },
    {
      key: "base_amount",
      label: "Hoofdsom",
      align: "center",
      render: ({ index }) => (
        <Controller
          name={`verdict_interest.${index}.base_amount`}
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              size="small"
              fullWidth
              type="number"
              placeholder="0.00"
              inputProps={{ step: "any" }}
              error={!!errors.verdict_interest?.[index]?.base_amount}
              helperText={
                errors.verdict_interest?.[index]?.base_amount?.message
              }
              value={field.value ?? ""} // si es null/undefined → ""
              onChange={(e) => {
                const val = e.target.value;
                field.onChange(val === "" ? null : parseFloat(val));
              }}
            />
          )}
        />
      ),
    },
    {
      key: "total_interest",
      label: "Rente",
      align: "center",
      render: ({ index }) => <InterestCell control={control} index={index} />,
    },
    {
      key: "total",
      label: "Totaal",
      align: "center",
      render: ({ index }) => <TotalCell control={control} index={index} />,
    },
    {
      key: "actions",
      label: "Acties",
      align: "center",
      render: ({ index }) => (
        <Stack direction="row" spacing={1} justifyContent="center">
          <IconButton
            aria-label="delete"
            color="error"
            size="small"
            onClick={() => remove(index)}
          >
            <DeleteIcon />
          </IconButton>
        </Stack>
      ),
    },
  ];

  return (
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
          bgcolor: "secondary.main",
          color: "white",
          px: 2,
          py: 1.5,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          borderBottom: "1px solid #e0e0e0",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
            WETTELIJKE RENTE
          </Typography>

          <Box sx={{ mr: 2 }}>
            <TotalInterest control={control} />
          </Box>
        </Box>
      </Box>
      <Box sx={{ p: 2 }}>
        <Box>
          <ResponsiveListTable
            columns={columns}
            rows={fields.map((field, index) => ({ id: field.id, index }))}
            getRowKey={(row) => row.id}
            emptyMessage="Geen renteberekeningen toegevoegd."
          />
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              onClick={() =>
                append({
                  interest_type: "",
                  base_amount: 0,
                  calculated_interest: 0,
                  calculation_start: new Date(),
                  calculation_end: new Date(),
                  total_interest: 0,
                  details: [],
                })
              }
              sx={{ textTransform: "none" }}
            >
              Nieuwe renteberekening toevoegen
            </Button>
          </Box>

          {/* <FormHelperText sx={{ color: "error.main" }}>
        {Object.keys(errors).length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {Object.entries(errors).map(([key, value]) => {
              const renderMessages = (
                val: any,
                path: string[] = []
              ): React.ReactNode => {
                if (val?.message) {
                  return (
                    <li key={path.join(".")}>
                      {`${path.join(".")}: ${val.message}`}
                    </li>
                  );
                }
                if (typeof val === "object" && val !== null) {
                  return Object.entries(val).map(([k, v]) =>
                    renderMessages(v, [...path, k])
                  );
                }
                return null;
              };
              return renderMessages(value, [key]);
            })}
          </ul>
        )}
      </FormHelperText> */}

          <Modal
            open={open}
            onClose={handleClose}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
          >
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: { xs: "calc(100vw - 32px)", sm: "90vw", md: 1000 },
                maxWidth: 1000,
                bgcolor: "background.paper",
                boxShadow: 24,
                borderRadius: 1,
                p: 2,
                maxHeight: "90vh",
                overflowY: "auto",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 20px",
                  borderBottom: "1px solid #e0e0e0",
                  backgroundColor: "secondary.light",
                }}
              >
                <Typography
                  id="modal-modal-title"
                  variant="h6"
                  component="h2"
                  sx={{ fontWeight: 600, color: "#f5f5f5" }}
                >
                  Detalle de Interés
                </Typography>
                <IconButton
                  onClick={handleClose}
                  color="primary"
                  sx={{
                    backgroundColor: "#f5f5f5",
                    "&:hover": { backgroundColor: "#e0e0e0" },
                  }}
                  aria-label="Cerrar"
                >
                  <CloseIcon />
                </IconButton>
              </Box>
              {(() => {
                const detailColumns: ListColumn<VerdictInterestDetailCreate>[] = [
                  { key: "period", label: "Tramo", align: "center", render: (row) => row.period },
                  {
                    key: "period_start",
                    label: "Fecha Ini.",
                    align: "center",
                    render: (row) => row.period_start.toLocaleDateString("es-ES"),
                  },
                  {
                    key: "period_end",
                    label: "Fecha Fin",
                    align: "center",
                    render: (row) => row.period_end.toLocaleDateString("es-ES"),
                  },
                  { key: "days", label: "Dias", align: "center", render: (row) => row.days },
                  {
                    key: "annual_rate",
                    label: "Tasa Anual",
                    align: "center",
                    render: (row) => (
                      <TextField
                        type="number"
                        value={Number(row.annual_rate).toFixed(2)}
                        size="small"
                        fullWidth
                        disabled
                        inputProps={{ step: "any" }}
                      />
                    ),
                  },
                  {
                    key: "proportional_rate",
                    label: "Proporcional",
                    align: "center",
                    render: (row) => Number(row.proportional_rate).toFixed(8),
                  },
                  {
                    key: "base_amount",
                    label: "Monto",
                    align: "right",
                    render: (row) => `$ ${Number(row.base_amount).toFixed(2)}`,
                  },
                  {
                    key: "interest",
                    label: "Interes",
                    align: "right",
                    render: (row) => `$ ${Number(row.interest).toFixed(2)}`,
                  },
                  {
                    key: "total",
                    label: "Total",
                    align: "right",
                    render: (row) => `$ ${Number(row.total).toFixed(2)}`,
                  },
                ];

                return (
                  <ResponsiveListTable
                    columns={detailColumns}
                    rows={rowsInterest}
                    getRowKey={(row) => String(row.period)}
                  />
                );
              })()}
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleClose}
                >
                  Cerrar
                </Button>
              </Box>
            </Box>
          </Modal>
        </Box>
      </Box>
    </Paper>
  );
};

export default StatutoryInterestSection;
