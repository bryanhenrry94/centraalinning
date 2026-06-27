import { formatCurrency, formatDate } from "@/utils/formatters";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Chip, Paper, Typography, useTheme } from "@mui/material";

interface LatestDocumentsTableProps {
  rows: Array<{
    id: string;
    source: string;
    date: Date;
    reference_number: string;
    name: string;
    amount: number;
    status: string;
  }>;
}

export const LatestDocumentsTable = ({ rows }: LatestDocumentsTableProps) => {
  const theme = useTheme();

  const columns: GridColDef<(typeof rows)[number]>[] = [
    { field: "id", headerName: "Id", width: 0 },
    { field: "source", headerName: "Modulo", width: 150 },
    {
      field: "date",
      headerName: "Datum",
      width: 150,
      editable: true,
      renderCell: (params) => {
        return formatDate(params.value);
      },
    },
    {
      field: "reference_number",
      headerName: "Referentie",
      width: 150,
      editable: true,
    },
    {
      field: "name",
      headerName: "Naam",
      width: 150,
      editable: true,
    },
    {
      field: "amount",
      headerName: "Totaal",
      width: 160,
      align: "right" as const,
      headerAlign: "right" as const,
      renderCell: (params) => {
        return formatCurrency(params.value);
      },
    },
    {
      field: "status",
      headerName: "Status",
      width: 210,
      align: "center" as const,
      headerAlign: "center" as const,
      renderCell: (params) => {
        const status = params.value as string;

        const statusConfig: {
          [key: string]: {
            color:
              | "default"
              | "primary"
              | "secondary"
              | "error"
              | "info"
              | "success"
              | "warning";
            label: string;
          };
        } = {
          PAID: {
            color: "success",
            label: "Pagado",
          },
          OPEN: {
            color: "warning",
            label: "Abierto",
          },
          default: {
            color: "default",
            label: status,
          },
        };

        const config = statusConfig[status] || statusConfig.default;

        return (
          <Chip
            label={config.label}
            color={config.color}
            variant="outlined"
            size="small"
          />
        );
      },
    },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        height: "100%",
        padding: 2,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        bgcolor: "white",
      }}
    >
      <Typography variant="h6" gutterBottom>
        Laatste documenten
      </Typography>
      <DataGrid
        rows={rows}
        columns={columns}
        hideFooter
        disableColumnMenu
        disableRowSelectionOnClick
      />
    </Paper>
  );
};
