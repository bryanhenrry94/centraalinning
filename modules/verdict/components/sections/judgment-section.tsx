import React from "react";
// MUI Components
import {
  Autocomplete,
  Box,
  Grid,
  IconButton,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { Controller, useFormContext } from "react-hook-form";
import AddIcon from "@mui/icons-material/Add";

import { DebtorInput, DebtorResponse } from "@/modules/collection/services/debtor.type";
import { VerdictJudgment } from "@/lib/validations/verdict";

interface JudgmentSectionProps {
  handleOpenModalDebtor: () => void;
  onSelectDebtor: (debtor: DebtorInput | null) => void;
  debtors: DebtorResponse[];
}

export const JudgmentSection: React.FC<JudgmentSectionProps> = ({
  handleOpenModalDebtor,
  onSelectDebtor,
  debtors,
}) => {
  const {
    control,
    formState: { errors },
  } = useFormContext<VerdictJudgment>();

  return (
    <Paper
      component="section"
      sx={{
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
        <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
          VONNIS INFORMATIE
        </Typography>
      </Box>
      <Box sx={{ p: 2 }}>
        <Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4, md: 12 }}>
              <Controller
                name="invoice_number"
                control={control}
                render={({ field }) => (
                  <TextField
                    label="Beschrijving Vonnis"
                    size="small"
                    fullWidth
                    {...field}
                    value={field.value ?? ""}
                    error={errors.invoice_number ? true : false}
                    helperText={errors.invoice_number?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 8, md: 3 }}>
              <Controller
                name="creditor_name"
                control={control}
                render={({ field }) => (
                  <TextField
                    label="Naam Schuldeiser"
                    size="small"
                    fullWidth
                    {...field}
                    value={field.value ?? ""}
                    error={!!errors.creditor_name}
                    helperText={errors.creditor_name?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 8, md: 3 }}>
              <Box sx={{ display: "flex", flexDirection: "row" }}>
                <Controller
                  name="debtor_id"
                  control={control}
                  render={({ field: { onChange, value, ref } }) => (
                    <Autocomplete
                      options={debtors}
                      getOptionLabel={(option) =>
                        `${option.person?.first_name || ""} ${option.person?.last_name || ""}`
                      }
                      isOptionEqualToValue={(option, val) =>
                        option.id === val.id
                      }
                      value={
                        debtors.find((debtor) => debtor.id === value) || null
                      }
                      onChange={(_, newValue) => {
                        onChange(newValue ? newValue.id : null);

                        if (newValue) {
                          const debtorSelected: DebtorInput = {
                            id: newValue?.id,
                            email: newValue?.email,
                            tenant_id: newValue?.tenant_id || "",
                            user_id: newValue?.user_id || "",
                            person_id: newValue?.person_id || "",
                            total_income: newValue?.total_income ?? 0,
                          };

                          onSelectDebtor(debtorSelected);
                        } else {
                          onSelectDebtor(null);
                        }
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
                          inputRef={ref}
                          size="small"
                          label="Naam Schuldenaar"
                          fullWidth
                          error={!!errors.debtor_id}
                          helperText={errors.debtor_id?.message}
                        />
                      )}
                    />
                  )}
                />
                <IconButton aria-label="toggle password visibility" edge="end">
                  <AddIcon onClick={handleOpenModalDebtor} />
                </IconButton>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 2 }}>
              <Controller
                name="registration_number"
                control={control}
                render={({ field }) => (
                  <TextField
                    label="Zaaknummer"
                    size="small"
                    fullWidth
                    {...field}
                    value={field.value ?? ""}
                    error={!!errors.registration_number}
                    helperText={errors.registration_number?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Controller
                name="sentence_amount"
                control={control}
                render={({ field }) => (
                  <TextField
                    label="Vorderingsbedrag"
                    size="small"
                    type="number"
                    fullWidth
                    {...field}
                    value={field.value ?? ""}
                    error={!!errors.sentence_amount}
                    helperText={errors.sentence_amount?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Controller
                name="sentence_date"
                control={control}
                render={({ field }) => (
                  <TextField
                    label="Datum Uitspraak"
                    type="date"
                    fullWidth
                    size="small"
                    {...field}
                    value={
                      field.value
                        ? new Date(field.value).toISOString().split("T")[0]
                        : ""
                    }
                    error={!!errors.sentence_date}
                    helperText={errors.sentence_date?.message}
                    slotProps={{
                      inputLabel: { shrink: true },
                    }}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <Controller
                name="procesal_cost"
                control={control}
                render={({ field }) => (
                  <TextField
                    label="Overige proceskosten"
                    size="small"
                    type="number"
                    fullWidth
                    {...field}
                    value={field.value ?? ""}
                    error={!!errors.procesal_cost}
                    helperText={errors.procesal_cost?.message}
                  />
                )}
              />
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Paper>
  );
};
