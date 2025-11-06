import { useEffect, useState } from "react";
import { Controller, useWatch, useFormContext } from "react-hook-form";
import { TextField } from "@mui/material";
import { calculateInterestDetail } from "@/app/actions/verdict";
import { IVerdictInterestCreate } from "@/lib/validations/verdict-interest";

interface InterestCellProps {
  control: any;
  index: number;
}

const InterestCell: React.FC<InterestCellProps> = ({ control, index }) => {
  const item = useWatch({
    control,
    name: `verdict_interest.${index}`,
  });

  const [total_interest, setTotalInterest] = useState(0);
  const {
    setValue,
    formState: { errors },
  } = useFormContext<{
    verdict_interest: IVerdictInterestCreate[];
  }>(); // ⬅️ para acceder a setValue desde context

  useEffect(() => {
    const calculate = async () => {
      if (
        !item ||
        !item.base_amount ||
        !item.interest_type ||
        !item.calculation_start ||
        !item.calculation_end
      )
        return;

      const details = await calculateInterestDetail(
        item.interest_type,
        item.base_amount,
        item.calculated_interest,
        item.calculation_start,
        item.calculation_end
      );

      const total = details?.reduce((acc, curr) => acc + curr.interest, 0) || 0;

      setValue(`verdict_interest.${index}.details`, details);
      setValue(`verdict_interest.${index}.total_interest`, total);

      setTotalInterest(total); // para mostrar en el campo
    };

    calculate();
  }, [index, item.base_amount, setValue]);

  return (
    <Controller
      name={`verdict_interest.${index}.total_interest`}
      control={control}
      render={({ field }) => (
        <TextField
          {...field}
          value={total_interest.toFixed(2)}
          size="small"
          error={!!errors.verdict_interest?.[index]?.total_interest}
          helperText={errors.verdict_interest?.[index]?.total_interest?.message}
          InputProps={{
            readOnly: true,
          }}
          disabled
        />
      )}
    />
  );
};

export default InterestCell;
