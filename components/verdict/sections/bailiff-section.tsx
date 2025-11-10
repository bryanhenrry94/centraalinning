import { Autocomplete, Box, Grid, IconButton, TextField } from "@mui/material";
import { Controller } from "react-hook-form";
import { useFormContext } from "react-hook-form";
import PersonAddIcon from "@mui/icons-material/PersonAdd";

interface BailiffSectionProps {
  handleOpenModalBailiff: () => void;
  onSelectBailiff: (bailiff: any | null) => void;
  bailiffs: any[];
}

export const BailiffSection: React.FC<BailiffSectionProps> = ({
  handleOpenModalBailiff,
  onSelectBailiff,
  bailiffs,
}) => {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  return (
    <Grid container spacing={2} sx={{ mt: 1, mb: 1 }}>
      <Grid size={{ xs: 6, sm: 4, md: 4 }}>
        <Box sx={{ display: "flex", flexDirection: "row" }}>
          <Controller
            name="bailiff_id"
            control={control}
            render={({ field: { onChange, value, ref } }) => (
              <Autocomplete
                options={bailiffs}
                getOptionLabel={(option) => option?.fullname ?? ""}
                isOptionEqualToValue={(option, val) => option.id === val.id}
                value={bailiffs.find((bailiff) => bailiff.id === value) || null}
                onChange={(_, newValue) => {
                  onChange(newValue ? newValue.id : null);

                  onSelectBailiff(newValue);
                }}
                fullWidth
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    {option.fullname}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    inputRef={ref}
                    size="small"
                    label="Selecteer een Deurwaarder"
                    fullWidth
                    error={!!errors.bailiff_id}
                    helperText={errors.bailiff_id?.message?.toString()}
                  />
                )}
              />
            )}
          />
          <IconButton aria-label="toggle password visibility" edge="end">
            {/* <FaUserEdit onClick={onOpenModalDebtor} /> */}
            <PersonAddIcon onClick={handleOpenModalBailiff} />
          </IconButton>
        </Box>
      </Grid>
    </Grid>
  );
};
