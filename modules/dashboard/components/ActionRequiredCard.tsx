"use client";

import { useState } from "react";
import {
  Avatar,
  Box,
  Chip,
  Divider,
  Paper,
  Popover,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useRouter } from "next/navigation";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

import { PendingAction } from "../types/dashboard.types";

interface ActionRequiredCardProps {
  actions: PendingAction[];
}

export default function ActionRequiredCard({ actions }: ActionRequiredCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const color = theme.palette.warning.main;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleSelect = (href: string) => {
    setAnchorEl(null);
    router.push(href);
  };

  return (
    <>
      <Paper
        elevation={0}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          height: "100%",
          padding: 2,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          bgcolor: "white",
          cursor: "pointer",
          transition: "box-shadow 0.2s, border-color 0.2s",
          "&:hover": {
            boxShadow: theme.shadows[2],
            borderColor: color,
          },
        }}
      >
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: alpha(color, 0.15),
              color,
              fontSize: "1.5rem",
              flexShrink: 0,
            }}
          >
            <WarningAmberRoundedIcon />
          </Avatar>

          <Stack spacing={0.5} flex={1}>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={500}>
              Actie vereist
            </Typography>

            <Typography variant="h5" fontWeight={700} lineHeight={1.2}>
              {actions.length}
            </Typography>
          </Stack>
        </Stack>
      </Paper>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ width: 340, maxHeight: 400, overflowY: "auto" }}>
          {actions.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              Geen acties vereist op dit moment.
            </Typography>
          ) : (
            actions.map((action, index) => (
              <Box key={action.id}>
                {index > 0 && <Divider />}
                <Box
                  onClick={() => handleSelect(action.href)}
                  sx={{
                    px: 2,
                    py: 1.5,
                    cursor: "pointer",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Chip label={action.module} size="small" sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      {action.reference}
                    </Typography>
                  </Stack>
                  <Typography variant="body2">{action.label}</Typography>
                </Box>
              </Box>
            ))
          )}
        </Box>
      </Popover>
    </>
  );
}
