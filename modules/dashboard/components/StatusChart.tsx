import { Paper, Typography, useTheme } from "@mui/material";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export const StatusChart = ({
  data,
}: {
  data: Array<{ name: string; value: number }>;
}) => {
  const theme = useTheme();

  const options = {
    chart: {
      toolbar: {
        show: false,
      },
    },

    labels: data
      ? data.map((item) => item.name)
      : ["Pendientes", "Pagados", "Anulados", "Vencidos"],

    legend: {
      position: "right" as const,
    },
  };

  const series = data ? data.map((item) => item.value) : [44, 15, 13, 28];

  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        height: "100%",
        padding: 1.5,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        bgcolor: "white",
      }}
    >
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        Status verdeling
      </Typography>

      <Chart
        options={options}
        series={series}
        type="donut"
        width="100%"
        height={220}
      />
    </Paper>
  );
};
