import React, { useEffect } from "react";
import { InterestType } from "@/modules/settings/services/interest-type.validators";
import { VerdictInterestDetailCreate } from "@/modules/verdict/services/verdict-interest-details.validators";
import {
  Alert,
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
import { NumericFormat } from "react-number-format";
import { IVerdictInterestCreate } from "@/modules/verdict/services/verdict-interest.validators";
import { getAllInterestTypes } from "@/modules/settings/actions/interest-type.actions";
import { formatCurrency } from "@/shared/utils/formatters";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import InterestCell from "../interest-cell";
import TotalCell from "../total-cell";
import TotalInterest from "../total-interest";
import {
  ListColumn,
  ResponsiveListTable,
} from "@/shared/ui/responsive-list-table";

const StatutoryInterestSection: React.FC = () => {
  const [interesTipos, setInteresTipos] = React.useState<InterestType[]>([]);
  const [rowsInterest, setRowsInterest] = React.useState<
    VerdictInterestDetailCreate[]
  >([]);

  const [open, setOpen] = React.useState<boolean>(false);
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);
  const handleClose = () => {
    setOpen(false);
    setOpenIndex(null);
  };

  const {
    control,
    setValue,
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

  const [detailInterestTypeName, setDetailInterestTypeName] =
    React.useState<string>("");

  // "Soort rente" toont enkel het relevante onderscheid (consument/bedrijf)
  // in plaats van de volledige wettelijke naam — die blijft wel zichtbaar in
  // CFSB Admin (Wettelijke rente-instellingen).
  const shortInterestTypeLabel = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("consument")) return "Consument";
    if (lower.includes("bedrijf") || lower.includes("handelstransacties"))
      return "Bedrijf";
    return name;
  };

  const handleShowDetail = (item: IVerdictInterestCreate, index: number) => {
    setDetailInterestTypeName(
      interesTipos.find((tipo) => tipo.id === item.interest_type)?.name ?? "",
    );
    setRowsInterest(item.details ?? []);
    setOpenIndex(index);
    setOpen(true);
  };

  // De rechtbank kan een ander rentepercentage vaststellen dan het systeemtarief;
  // de alguacil past het dan hier per tranche aan en de totalen herberekenen mee.
  const handleTrancheRateChange = (period: string, rateInput: string) => {
    const newRate = Number(rateInput);
    if (openIndex === null || rateInput === "" || Number.isNaN(newRate)) return;

    const updated = rowsInterest.map((row) => {
      if (row.period !== period) return row;
      const proportional_rate = (newRate / 365) * row.days;
      const interest =
        Math.round(row.base_amount * (proportional_rate / 100) * 100) / 100;
      const total = Math.round((row.base_amount + interest) * 100) / 100;
      return {
        ...row,
        annual_rate: newRate,
        proportional_rate,
        interest,
        total,
      };
    });

    const newTotalInterest =
      Math.round(updated.reduce((acc, row) => acc + row.interest, 0) * 100) /
      100;

    setRowsInterest(updated);
    setValue(`verdict_interest.${openIndex}.details`, updated, {
      shouldDirty: true,
    });
    setValue(`verdict_interest.${openIndex}.total_interest`, newTotalInterest, {
      shouldDirty: true,
    });
  };

  const ViewCalculationButton = ({
    control,
    index,
  }: {
    control: any;
    index: number;
  }) => {
    const item = useWatch({
      control,
      name: `verdict_interest.${index}`,
    });

    const hasDetails = Array.isArray(item?.details) && item.details.length > 0;

    return (
      <IconButton
        aria-label="Bekijk berekening"
        size="small"
        disabled={!hasDetails}
        onClick={() => handleShowDetail(item, index)}
      >
        <VisibilityIcon fontSize="small" />
      </IconButton>
    );
  };

  const columns: ListColumn<{ id: string; index: number }>[] = [
    {
      key: "interest_type",
      label: "Soort rente",
      width: 140,
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
                  {shortInterestTypeLabel(option.name)}
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
      width: 150,
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
                  e.target.value ? new Date(e.target.value) : null,
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
      width: 160,
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
                  e.target.value ? new Date(e.target.value) : null,
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
      width: 160,
      render: ({ index }) => (
        <Controller
          name={`verdict_interest.${index}.base_amount`}
          control={control}
          render={({ field }) => (
            <NumericFormat
              customInput={TextField}
              size="small"
              fullWidth
              value={field.value ?? ""}
              thousandSeparator
              decimalScale={2}
              fixedDecimalScale
              allowNegative={false}
              prefix="$ "
              onValueChange={(values) =>
                field.onChange(
                  values.value === "" ? null : Number(values.value),
                )
              }
              error={!!errors.verdict_interest?.[index]?.base_amount}
              helperText={
                errors.verdict_interest?.[index]?.base_amount?.message
              }
              // sx={{ "& .MuiInputBase-input": { fontSize: "1rem", fontWeight: 600 } }}
            />
          )}
        />
      ),
    },
    {
      key: "total_interest",
      label: "Rente",
      align: "center",
      width: 140,
      render: ({ index }) => <InterestCell control={control} index={index} />,
    },
    {
      key: "total",
      label: "Totaal",
      align: "center",
      width: 140,
      render: ({ index }) => <TotalCell control={control} index={index} />,
    },
    {
      key: "actions",
      label: "Acties",
      align: "center",
      width: 100,
      render: ({ index }) => (
        <Stack direction="row" spacing={1} justifyContent="center">
          <ViewCalculationButton control={control} index={index} />
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
                width: { xs: "calc(100vw - 32px)", sm: "95vw" },
                maxWidth: 1000,
                bgcolor: "background.paper",
                boxShadow: 24,
                borderRadius: 1,
                overflow: "hidden",
                maxHeight: "90vh",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 2,
                  py: 1.5,
                  bgcolor: "secondary.main",
                  color: "white",
                }}
              >
                <Typography
                  id="modal-modal-title"
                  variant="h6"
                  component="h2"
                  sx={{ fontWeight: 600 }}
                >
                  Berekening wettelijke rente
                  {detailInterestTypeName ? ` — ${detailInterestTypeName}` : ""}
                </Typography>
                <IconButton
                  onClick={handleClose}
                  sx={{ color: "white" }}
                  aria-label="Sluiten"
                >
                  <CloseIcon />
                </IconButton>
              </Box>
              <Box sx={{ p: 2, overflowY: "auto" }}>
              {(() => {
                const detailColumns: ListColumn<VerdictInterestDetailCreate>[] =
                  [
                    {
                      key: "period",
                      label: "Tranche",
                      align: "center",
                      width: 90,
                      render: (row) => row.period,
                    },
                    {
                      key: "period_start",
                      label: "Vanaf",
                      align: "center",
                      width: 120,
                      render: (row) =>
                        row.period_start.toLocaleDateString("nl-NL"),
                    },
                    {
                      key: "period_end",
                      label: "Tot en met",
                      align: "center",
                      width: 120,
                      render: (row) =>
                        row.period_end.toLocaleDateString("nl-NL"),
                    },
                    {
                      key: "days",
                      label: "Dagen",
                      align: "center",
                      width: 90,
                      render: (row) => row.days,
                    },
                    {
                      key: "annual_rate",
                      label: "Jaartarief (%)",
                      align: "center",
                      width: 150,
                      render: (row) => (
                        <TextField
                          type="number"
                          size="small"
                          defaultValue={Number(row.annual_rate)}
                          inputProps={{ step: "any" }}
                          onBlur={(e) =>
                            handleTrancheRateChange(row.period, e.target.value)
                          }
                          sx={{ width: 100 }}
                        />
                      ),
                    },
                    {
                      key: "proportional_rate",
                      label: "Proportioneel",
                      align: "center",
                      width: 160,
                      render: (row) =>
                        `${Number(row.proportional_rate).toFixed(8)}%`,
                    },
                    {
                      key: "base_amount",
                      label: "Hoofdsom",
                      align: "right",
                      width: 150,
                      render: (row) => formatCurrency(Number(row.base_amount)),
                    },
                    {
                      key: "interest",
                      label: "Rente",
                      align: "right",
                      width: 150,
                      render: (row) => formatCurrency(Number(row.interest)),
                    },
                    {
                      key: "total",
                      label: "Totaal",
                      align: "right",
                      width: 150,
                      render: (row) => formatCurrency(Number(row.total)),
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
                  Sluiten
                </Button>
              </Box>
              </Box>
            </Box>
          </Modal>
        </Box>
      </Box>
    </Paper>
  );
};

export default StatutoryInterestSection;
