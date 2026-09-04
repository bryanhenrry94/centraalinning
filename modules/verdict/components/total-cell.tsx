import { useEffect, useState } from "react";
import { useWatch } from "react-hook-form";
import { TextField } from "@mui/material";
import { formatAmount } from "@/shared/utils/formatters";

const TotalCell = ({ control, index }: { control: any; index: number }) => {
  const item = useWatch({
    control,
    name: `verdict_interest.${index}`,
  });

  const [total, setTotal] = useState(0);

  useEffect(() => {
    const total = Number(item.base_amount ?? 0) + Number(item.interest ?? 0);
    setTotal(total);
  }, [item.base_amount, item.interest]);

  return (
    <TextField
      value={formatAmount(total)}
      size="small"
      InputProps={{
        readOnly: true,
      }}
      disabled
    />
  );
};

export default TotalCell;
