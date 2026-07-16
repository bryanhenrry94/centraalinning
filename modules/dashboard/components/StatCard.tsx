"use client";

import { formatCurrency } from "@/shared/utils/formatters";
import { Avatar, Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  color?: string;
  type?: "text" | "number";
  href?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
  type = "text",
  href,
}: StatCardProps) {
  const theme = useTheme();
  const router = useRouter();

  const cardColor = color ?? theme.palette.primary.main;

  return (
    <Paper
      elevation={0}
      onClick={href ? () => router.push(href) : undefined}
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        height: "100%",
        padding: 2,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        bgcolor: "white",
        cursor: href ? "pointer" : "default",
        transition: "box-shadow 0.2s, border-color 0.2s",
        ...(href && {
          "&:hover": {
            boxShadow: theme.shadows[2],
            borderColor: cardColor,
          },
        }),
      }}
    >
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Avatar
          sx={{
            width: 56,
            height: 56,
            bgcolor: alpha(cardColor, 0.15),
            color: cardColor,
            fontSize: "1.5rem",
            flexShrink: 0,
          }}
        >
          {icon}
        </Avatar>

        <Stack spacing={0.5} flex={1}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            fontWeight={500}
          >
            {title}
          </Typography>

          <Typography variant="h5" fontWeight={700} lineHeight={1.2}>
            {type === "number" ? formatCurrency(Number(value)) : value}
          </Typography>

          {subtitle && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: "0.75rem", marginTop: 0.5 }}
            >
              {subtitle}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}
