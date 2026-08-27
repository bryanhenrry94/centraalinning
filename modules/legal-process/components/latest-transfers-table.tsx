"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Card,
  CardActionArea,
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";

import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { getMyCaseTransfersAsLawyer } from "@/modules/legal-process/actions/case-transfer.actions";
import { getCaseTransferStatusInfo } from "@/modules/legal-process/utils/case-transfer-status";
import { RejectTransferDialog } from "@/modules/legal-process/components/reject-transfer-dialog";
import { AcceptTransferDialog } from "@/modules/legal-process/components/accept-transfer-dialog";

// Mismo estilo que HEAD_SX en collection-table.tsx (tabla de consulta AOP):
// una <Table> nativa, no DataGrid, con header secondary.main + letra blanca.
const HEAD_SX = {
  backgroundColor: "secondary.main",
  color: "#fff",
  fontWeight: "bold",
  whiteSpace: "nowrap" as const,
};

type CaseTransferListItem = Awaited<
  ReturnType<typeof getMyCaseTransfersAsLawyer>
>[number];

interface LatestTransfersTableProps {
  items: CaseTransferListItem[];
  onChanged: () => void;
}

export const LatestTransfersTable = ({
  items,
  onChanged,
}: LatestTransfersTableProps) => {
  const theme = useTheme();
  const router = useRouter();
  const isDesktop = useMediaQuery(theme.breakpoints.up("sm"));
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [acceptId, setAcceptId] = useState<string | null>(null);

  const debtorName = (item: CaseTransferListItem) =>
    item.debtClaim.debtor?.person
      ? `${item.debtClaim.debtor.person.first_name ?? ""} ${item.debtClaim.debtor.person.last_name ?? ""}`.trim()
      : "-";

  return (
    <>
      {/* Mobiel: kaartenlijst, zelfde patroon als LatestDocumentsTable. */}
      <Stack spacing={1.5} sx={{ display: { xs: "flex", sm: "none" } }}>
        {items.length === 0 && (
          <Paper
            elevation={0}
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              p: 3,
              textAlign: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Geen nieuwe dossieroverdrachten.
            </Typography>
          </Paper>
        )}

        {items.map((item) => {
          const statusInfo = getCaseTransferStatusInfo(item.status);
          return (
            <Card
              key={item.id}
              elevation={0}
              sx={{ border: `1px solid ${theme.palette.divider}` }}
            >
              <CardActionArea
                onClick={() =>
                  router.push(`/legal-processes/transfers/${item.id}`)
                }
              >
                <Box sx={{ p: 2 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    spacing={1}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        component="div"
                      >
                        {item.debtClaim.reference}
                      </Typography>
                      <Typography variant="subtitle2" fontWeight={700} noWrap>
                        {debtorName(item)}
                      </Typography>
                    </Box>
                    <Chip
                      label={statusInfo.label}
                      color={statusInfo.color}
                      size="small"
                      sx={{ fontWeight: 600, flexShrink: 0 }}
                    />
                  </Stack>

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    mt={1.5}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(item.createdAt.toString())}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {formatCurrency(
                          Number(item.debtClaim.principalAmount) || 0,
                        )}
                      </Typography>
                      <ChevronRightRoundedIcon
                        fontSize="small"
                        sx={{ color: theme.palette.text.disabled }}
                      />
                    </Stack>
                  </Stack>
                </Box>
              </CardActionArea>
              <Stack direction="row" spacing={1} sx={{ px: 2, pb: 1.5 }}>
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => setAcceptId(item.id)}
                >
                  <CheckIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => setRejectId(item.id)}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Card>
          );
        })}
      </Stack>

      {isDesktop && (
        <TableContainer>
          <Table size="small" stickyHeader aria-label="latest transfers table">
            <TableHead>
              <TableRow>
                <TableCell sx={HEAD_SX}>Datum</TableCell>
                <TableCell sx={HEAD_SX}>Referentie</TableCell>
                <TableCell sx={{ ...HEAD_SX, minWidth: 150 }}>Debiteur</TableCell>
                <TableCell sx={{ ...HEAD_SX, textAlign: "right" }}>Bedrag</TableCell>
                <TableCell sx={{ ...HEAD_SX, textAlign: "center" }}>Status</TableCell>
                <TableCell sx={{ ...HEAD_SX, textAlign: "center" }}>Acties</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      Geen nieuwe dossieroverdrachten.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {items.map((item) => {
                const statusInfo = getCaseTransferStatusInfo(item.status);
                return (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {formatDate(item.createdAt.toString())}
                    </TableCell>
                    <TableCell>{item.debtClaim.reference}</TableCell>
                    <TableCell>{debtorName(item)}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      {formatCurrency(Number(item.debtClaim.principalAmount) || 0)}
                    </TableCell>
                    <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                      <Chip
                        label={statusInfo.label}
                        color={statusInfo.color}
                        variant="filled"
                        size="small"
                        sx={{ fontWeight: 600, minWidth: 150 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="Bekijken">
                          <IconButton
                            size="small"
                            onClick={() =>
                              router.push(`/legal-processes/transfers/${item.id}`)
                            }
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Accepteren">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => setAcceptId(item.id)}
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Afwijzen">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setRejectId(item.id)}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <RejectTransferDialog
        open={!!rejectId}
        onClose={() => setRejectId(null)}
        caseTransferId={rejectId ?? ""}
        onRegistered={onChanged}
      />
      <AcceptTransferDialog
        open={!!acceptId}
        onClose={() => setAcceptId(null)}
        caseTransferId={acceptId ?? ""}
        onRegistered={onChanged}
      />
    </>
  );
};
