"use client";

import { Chip, ChipProps } from "@mui/material";

export interface StatusChipProps extends Omit<ChipProps, "color"> {
  // Acepta tanto los colores semánticos de MUI ("default"/"warning"/...) como
  // un hex exacto (paleta CFSB aprobada, zie shared/constants/status-colors.ts)
  // — los status configs del sistema mezclan ambos según el caso.
  color: string;
}

export function StatusChip({ color, variant, sx, ...props }: StatusChipProps) {
  const isHex = color.startsWith("#");

  if (!isHex) {
    return (
      <Chip variant={variant} color={color as ChipProps["color"]} sx={sx} {...props} />
    );
  }

  const hexSx =
    variant === "outlined"
      ? { color, borderColor: color }
      : { bgcolor: color, color: "#fff" };

  return <Chip variant={variant} sx={{ ...hexSx, ...sx }} {...props} />;
}
