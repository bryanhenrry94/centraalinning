import { Typography } from "@mui/material";
import { useWatch } from "react-hook-form";

const TotalBailiff: React.FC<{ control: any }> = ({ control }) => {
  const bailiff_services = useWatch({ control, name: "bailiff_services" });
  interface VerdictBailiffItem {
    service_cost?: number;
    // Add other properties if needed
  }

  const total =
    (bailiff_services as VerdictBailiffItem[] | undefined)?.reduce(
      (sum: number, item: VerdictBailiffItem) => sum + (Number(item?.service_cost) || 0),
      0
    ) ?? 0;

  return (
    <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
      Totaal ${Number(total).toFixed(2)}
    </Typography>
  );
};

export default TotalBailiff;
