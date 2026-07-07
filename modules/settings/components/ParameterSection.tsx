import { Box, Typography, Divider } from "@mui/material";
import { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
}

export default function ParameterSection({
  title,
  description,
  children,
}: Props) {
  return (
    <Box mb={5}>
      <Typography variant="h6">{title}</Typography>

      {description && (
        <Typography variant="body2" color="text.secondary" mb={2}>
          {description}
        </Typography>
      )}

      <Divider sx={{ mb: 3 }} />

      {children}
    </Box>
  );
}
