"use client";

import { Box, Typography } from "@mui/material";
import React from "react";

// Par label/valor reutilizado en pantallas de detalle en toda la app
// (dossiers, registros admin, etc.) — antes se reimplementaba localmente en
// cada página (collections/[id], legal-processes/[id], blocks/[id], ...).
export function InfoField({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          textTransform: "uppercase",
          letterSpacing: 0.4,
          display: "block",
          wordBreak: "break-word",
        }}
      >
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ wordBreak: "break-word" }}>
        {value ?? "-"}
      </Typography>
    </Box>
  );
}
