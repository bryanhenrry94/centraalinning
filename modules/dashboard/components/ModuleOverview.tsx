import {
  Box,
  LinearProgress,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";

interface ModuleOverviewProps {
  modules: Array<{
    name: string;
    value: number;
  }>;
}

export const ModuleOverview = ({ modules }: ModuleOverviewProps) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        height: "100%",
        maxHeight: 268,
        padding: 1.5,
        display: "flex",
        flexDirection: "column",
        bgcolor: "white",
        overflow: "hidden",
      }}
    >
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        Module overzicht
      </Typography>
      <Box sx={{ overflowY: "auto" }}>
        {modules.map((module) => (
          <Box key={module.name} sx={{ mb: 1 }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2">{module.name}</Typography>
              <Typography variant="body2">{module.value}</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.min(module.value, 100)}
              color="primary"
            />
          </Box>
        ))}
      </Box>
    </Paper>
  );
};
