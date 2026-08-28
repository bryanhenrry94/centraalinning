import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import { Button } from "@mui/material";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";

interface Data {
  id: number;
  calories: number;
  carbs: number;
  fat: number;
  name: string;
  protein: number;
}

function createData(
  id: number,
  name: string,
  calories: number,
  fat: number,
  carbs: number,
  protein: number
): Data {
  return {
    id,
    name,
    calories,
    fat,
    carbs,
    protein,
  };
}

const rows = [
  createData(1, "Cupcake", 305, 3.7, 67, 4.3),
  createData(2, "Donut", 452, 25.0, 51, 4.9),
  createData(3, "Eclair", 262, 16.0, 24, 6.0),
  createData(4, "Frozen yoghurt", 159, 6.0, 24, 4.0),
  createData(5, "Gingerbread", 356, 16.0, 49, 3.9),
  createData(6, "Honeycomb", 408, 3.2, 87, 6.5),
  createData(7, "Ice cream sandwich", 237, 9.0, 37, 4.3),
  createData(8, "Jelly Bean", 375, 0.0, 94, 0.0),
  createData(9, "KitKat", 518, 26.0, 65, 7.0),
  createData(10, "Lollipop", 392, 0.2, 98, 0.0),
  createData(11, "Marshmallow", 318, 0, 81, 2.0),
  createData(12, "Nougat", 360, 19.0, 9, 37.0),
  createData(13, "Oreo", 437, 18.0, 63, 4.0),
];

const columns: ListColumn<Data>[] = [
  { key: "name", label: "Dessert (100g serving)", render: (row) => row.name },
  { key: "calories", label: "Calories", align: "right", render: (row) => row.calories },
  { key: "fat", label: "Fat (g)", align: "right", render: (row) => row.fat, hideOnMobile: true },
  { key: "carbs", label: "Carbs (g)", align: "right", render: (row) => row.carbs, hideOnMobile: true },
  { key: "protein", label: "Protein (g)", align: "right", render: (row) => row.protein },
];

export default function PaymentList() {
  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            OVERZICHT VAN INNINGEN
          </Typography>
          <Typography variant="subtitle2">
            Overzicht van alle inningen in het systeem
          </Typography>
        </Box>
        <Box>
          <Button
            variant="contained"
            color="primary"
            size="small"
            sx={{ fontWeight: "bold" }}
          >
            Document zoeken
          </Button>
        </Box>
      </Box>

      <Paper sx={{ width: "100%", mb: 2, p: 2 }}>
        <ResponsiveListTable columns={columns} rows={rows} getRowKey={(row) => String(row.id)} />
      </Paper>
    </Box>
  );
}
