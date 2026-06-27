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
        padding: 2,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        bgcolor: "white",
      }}
    >
      <Typography variant="h6" gutterBottom>
        Module overzicht
      </Typography>
      {modules.map((module) => (
        <Box key={module.name} sx={{ mb: 2 }}>
          <Stack direction="row" justifyContent="space-between">
            <Typography>{module.name}</Typography>
            <Typography>{module.value}</Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={Math.min(module.value, 100)}
            color="primary"
          />
        </Box>
      ))}
    </Paper>
  );
};
