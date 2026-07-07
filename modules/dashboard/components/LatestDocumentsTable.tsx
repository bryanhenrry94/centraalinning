import { formatCurrency, formatDate } from "@/shared/utils/formatters";
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
    {
      field: "date",
      headerName: "Datum",
      width: 100,
      flex: 1,
      renderCell: (params) => {
        return formatDate(params.value);
      },
    },
    {
      field: "reference_number",
      headerName: "Referentie",
      width: 120,
      flex: 1,
    },
    {
      field: "name",
      headerName: "Naam",
      width: 200,
      flex: 1,
    },
    {
      field: "amount",
      headerName: "Totaal",
      width: 110,
      flex: 1,
      align: "right" as const,
      headerAlign: "right" as const,
      renderCell: (params) => {
        return formatCurrency(params.value);
      },
    },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      flex: 1,
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
            bgColor: string;
          };
        } = {
          PAID: {
            color: "success",
            label: "Pagado",
            bgColor: "#e8f5e9",
          },
          OPEN: {
            color: "warning",
            label: "Abierto",
            bgColor: "#fff3e0",
          },
          ACTIVE: {
            color: "error",
            label: "Actief",
            bgColor: "#ffebee",
          },
          REGISTERED: {
            color: "success",
            label: "Geregistreerd",
            bgColor: "#e8f5e9",
          },
          AANMANING: {
            color: "warning",
            label: "Aanmaning",
            bgColor: "#fff3e0",
          },
          default: {
            color: "default",
            label: status,
            bgColor: "#f5f5f5",
          },
        };

        const config = statusConfig[status] || statusConfig.default;

        return (
          <Chip
            label={config.label}
            color={config.color}
            variant="filled"
            size="small"
            sx={{
              fontWeight: 600,
              width: "100%",
              textTransform: "capitalize",
            }}
          />
        );
      },
    },
    {
      field: "actions",
      headerName: "Actie",
      width: 80,
      flex: 0.5,
      align: "center" as const,
      headerAlign: "center" as const,
      sortable: false,
      filterable: false,
      renderCell: () => "⋯",
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
    </Paper>
  );
};
