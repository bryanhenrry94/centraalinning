import {
  Autocomplete,
  Box,
  Grid,
  IconButton,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
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
          DEURWAARDER INFORMATIE
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ mt: 1, mb: 1, p: 2 }}>
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
                  value={
                    bailiffs.find((bailiff) => bailiff.id === value) || null
                  }
                  onChange={(_, newValue) => {
                    onChange(newValue ? newValue.id : "");

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
    </Paper>
  );
};
