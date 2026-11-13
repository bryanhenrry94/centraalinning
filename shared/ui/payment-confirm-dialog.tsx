"use client";

import { ReactNode } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { formatCurrency } from "@/shared/utils/formatters";

export interface PaymentConfirmLineItem {
  label: string;
  amount: number;
}

interface PaymentConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  // Si se omiten (p.ej. cuando el total real solo se conoce del lado del
  // servidor, al confirmar), no se renderiza el Paper de desglose — ver
  // FinalizeLawyerWorkDialog.
  lineItems?: PaymentConfirmLineItem[];
  total?: number;
  // Label de la fila final en negrita — "Totaal" por defecto; algunos
  // servicios (AOP) no quieren desglose y prefieren que esa única fila lleve
  // directamente el nombre del concepto (p.ej. "CFSB-kosten").
  totalLabel?: string;
  helperText?: string;
  // El botón de pago (típicamente <PaymentIntent />) — se recibe como nodo
  // en vez de importarse acá para no invertir la dependencia shared/ ->
  // modules/payment (ver modules/*/CLAUDE.md: shared/ no depende de módulos).
  payAction: ReactNode;
  cancelLabel?: string;
  // Contenido extra entre el desglose y el texto de ayuda — p.ej. los campos
  // de un formulario que el usuario completa antes de confirmar el pago
  // (ver FinalizeBailiffWorkDialog/FinalizeLawyerWorkDialog).
  children?: ReactNode;
}

// Chrome compartido de todos los diálogos de confirmación de pago Sentoo —
// extraído de app/(dashboard)/block-check/page.tsx, el diseño de referencia.
export const PaymentConfirmDialog = ({
  open,
  onClose,
  title = "Betaling bevestigen",
  lineItems,
  total,
  totalLabel = "Totaal",
  helperText,
  payAction,
  cancelLabel = "Annuleren",
  children,
}: PaymentConfirmDialogProps) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
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
          justifyContent: "space-between",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <Box flexGrow={1} textAlign="center">
            <Typography variant="h5" fontWeight={700} color="white">
              {title}
            </Typography>
          </Box>

          <IconButton onClick={onClose} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      <DialogContent sx={{ p: { xs: 2, sm: 4 } }}>
        <Stack spacing={4}>
          {lineItems && total !== undefined && (
            <Paper
              variant="outlined"
              sx={{
                width: "100%",
                p: 2,
                borderRadius: 2,
                bgcolor: "background.default",
              }}
            >
              <Stack spacing={1}>
                {lineItems.map((item, index) => (
                  <Stack
                    key={`${item.label}-${index}`}
                    direction="row"
                    justifyContent="space-between"
                  >
                    <Typography variant="body2" color="text.secondary">
                      {item.label}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatCurrency(item.amount)}
                    </Typography>
                  </Stack>
                ))}

                {lineItems.length > 0 && <Divider />}

                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="subtitle1" fontWeight={700}>
                    {totalLabel}
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight={700}
                    color="primary.main"
                  >
                    {formatCurrency(total)}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          )}

          {children}

          {helperText && (
            <Typography variant="body2" color="text.secondary">
              {helperText}
            </Typography>
          )}

          <Stack direction="row" spacing={2} width="100%">
            <Button
              fullWidth
              variant="outlined"
              color="inherit"
              startIcon={<CloseIcon />}
              onClick={onClose}
              sx={{ textTransform: "none" }}
            >
              {cancelLabel}
            </Button>

            {payAction}
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
