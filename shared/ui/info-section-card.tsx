"use client";

import { ReactNode } from "react";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";

// Card de detalle con icono + título, usado en pantallas admin de solo
// lectura (advocaten, deurwaarders, ...) para agrupar InfoField relacionados.
export function InfoSectionCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              bgcolor: "primary.main",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Typography variant="subtitle1" fontWeight={700}>
            {title}
          </Typography>
        </Stack>
        <Stack spacing={2}>{children}</Stack>
      </CardContent>
    </Card>
  );
}
