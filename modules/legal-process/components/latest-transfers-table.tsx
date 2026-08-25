"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  Box,
  Card,
  CardActionArea,
  Chip,
  IconButton,
  Paper,
  Stack,
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
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import {
  acceptCaseTransfer,
  getMyCaseTransfersAsLawyer,
} from "@/modules/legal-process/actions/case-transfer.actions";
import { getCaseTransferStatusInfo } from "@/modules/legal-process/utils/case-transfer-status";
import { RejectTransferDialog } from "@/modules/legal-process/components/reject-transfer-dialog";

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

  const handleAccept = async (id: string) => {
    try {
      await acceptCaseTransfer(id);
      notifySuccess("Dossier geaccepteerd");
      onChanged();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Actie mislukt");
    }
  };

  const debtorName = (item: CaseTransferListItem) =>
    item.debtClaim.debtor?.person
      ? `${item.debtClaim.debtor.person.first_name ?? ""} ${item.debtClaim.debtor.person.last_name ?? ""}`.trim()
      : "-";

  const columns: GridColDef<CaseTransferListItem>[] = [
    {
      field: "startedAt",
      headerName: "Datum",
      width: 100,
      flex: 1,
      valueGetter: (_, row) => row.createdAt,
      renderCell: (params) => formatDate(params.value.toString()),
    },
    {
      field: "referenceNumber",
      headerName: "Referentie",
      width: 130,
      flex: 1,
      valueGetter: (_, row) => row.debtClaim.reference,
    },
    {
      field: "debtor",
      headerName: "Debiteur",
      width: 180,
      flex: 1,
      valueGetter: (_, row) => debtorName(row),
    },
    {
      field: "amount",
      headerName: "Bedrag",
      width: 110,
      flex: 1,
      align: "right" as const,
      headerAlign: "right" as const,
      valueGetter: (_, row) => Number(row.debtClaim.principalAmount) || 0,
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: "status",
      headerName: "Status",
      width: 150,
      flex: 1,
      align: "center" as const,
      headerAlign: "center" as const,
      renderCell: (params) => {
        const statusInfo = getCaseTransferStatusInfo(params.row.status, {
          lawyerId: params.row.lawyerId,
          bailiffId: params.row.bailiffId,
        });
        return (
          <Chip
            label={statusInfo.label}
            color={statusInfo.color}
            variant="filled"
            size="small"
            sx={{ fontWeight: 600, width: "100%" }}
          />
        );
      },
    },
    {
      field: "actions",
      headerName: "Acties",
      width: 130,
      flex: 0.8,
      align: "center" as const,
      headerAlign: "center" as const,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Bekijken">
            <IconButton
              size="small"
              onClick={() =>
                router.push(`/legal-processes/transfers/${params.row.id}`)
              }
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Accepteren">
            <IconButton
              size="small"
              color="success"
              onClick={() => handleAccept(params.row.id)}
            >
              <CheckIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Afwijzen">
            <IconButton
              size="small"
              color="error"
              onClick={() => setRejectId(params.row.id)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

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
          const statusInfo = getCaseTransferStatusInfo(item.status, {
            lawyerId: item.lawyerId,
            bailiffId: item.bailiffId,
          });
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
                  onClick={() => handleAccept(item.id)}
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
        <DataGrid
          rows={items}
          columns={columns}
          hideFooter
          autoHeight
          disableColumnMenu
          disableRowSelectionOnClick
          sx={{
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: theme.palette.grey[100],
              borderBottom: `1px solid ${theme.palette.divider}`,
            },
            "& .MuiDataGrid-cell": {
              borderBottom: `1px solid ${theme.palette.divider}`,
            },
            bgcolor: "white",
          }}
        />
      )}

      <RejectTransferDialog
        open={!!rejectId}
        onClose={() => setRejectId(null)}
        caseTransferId={rejectId ?? ""}
        onRegistered={onChanged}
      />
    </>
  );
};
