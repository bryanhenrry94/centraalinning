import { Box, Stack, Typography } from "@mui/material";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function DashboardHeader({
  title,
  subtitle,
  actions,
}: DashboardHeaderProps) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      gap={1}
      mb={3}
    >
      <Box>
        <Typography variant="h4" fontWeight={700}>
          {title}
        </Typography>

        {/* <Typography color="text.secondary">
          {"Wlokm terug, DAZZSOFT SAS"}
        </Typography> */}
      </Box>

      {actions}
    </Stack>
  );
}
