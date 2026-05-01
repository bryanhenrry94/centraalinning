import { Typography } from "@mui/material";
import { useWatch } from "react-hook-form";

const TotalInterest: React.FC<{ control: any }> = ({ control }) => {
  interface VerdictInterestItem {
    total_interest?: number;
    [key: string]: any;
  }

  const verdictInterest: VerdictInterestItem[] = useWatch({
    control,
    name: "verdict_interest",
  });

  const total: number =
    verdictInterest?.reduce(
      (sum: number, item: VerdictInterestItem) =>
        sum + (item?.total_interest ?? 0),
      0,
    ) ?? 0;

  return (
    <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
      Totaal ${Number(total).toFixed(2)}
    </Typography>
  );
};

export default TotalInterest;
