import { useEffect, useRef } from "react";
import { Controller, useWatch, useFormContext } from "react-hook-form";
import { TextField } from "@mui/material";
import { calculateInterestDetail } from "@/modules/verdict/actions/verdict.actions";
import { IVerdictInterestCreate } from "@/modules/verdict/services/verdict-interest.validators";
import { formatAmount } from "@/shared/utils/formatters";

interface InterestCellProps {
  control: any;
  index: number;
}

const InterestCell: React.FC<InterestCellProps> = ({ control, index }) => {
  const item = useWatch({
    control,
    name: `verdict_interest.${index}`,
  });

  const {
    setValue,
    formState: { errors },
  } = useFormContext<{
    verdict_interest: IVerdictInterestCreate[];
  }>(); // ⬅️ para acceder a setValue desde context

  const didInitRef = useRef(false);

  useEffect(() => {
    // Bij het laden van een bestaand vonnis staan details/total_interest al
    // gevuld (mogelijk met een door de alguacil aangepast tarief). Niet
    // overschrijven bij deze eerste mount — alleen herberekenen zodra de
    // gebruiker nadien zelf bedrag/periode/rentetype wijzigt.
    const skipInitialRecalculation =
      !didInitRef.current &&
      Array.isArray(item?.details) &&
      item.details.length > 0;
    didInitRef.current = true;
    if (skipInitialRecalculation) return;

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
        item.calculation_end,
      );

      const total = details?.reduce((acc, curr) => acc + curr.interest, 0) || 0;

      setValue(`verdict_interest.${index}.details`, details);
      setValue(`verdict_interest.${index}.total_interest`, total);
    };

    calculate();
    // Herberekenen zodra de periode (start/einde) of het rentetype wijzigt, niet
    // alleen de hoofdsom — anders blijft de rente staan op een oude periode.
    // Let op: vergelijk data via getTime(), niet via objectreferentie — RHF
    // kloneert Date-objecten bij elke useWatch-update (bv. na een handmatige
    // tariefcorrectie), waardoor een referentievergelijking hier telkens een
    // "wijziging" zag en de override alweer overschreef met het systeemtarief.
  }, [
    index,
    item?.base_amount,
    item?.interest_type,
    item?.calculation_start?.getTime?.(),
    item?.calculation_end?.getTime?.(),
    setValue,
  ]);

  return (
    <Controller
      name={`verdict_interest.${index}.total_interest`}
      control={control}
      render={({ field }) => (
        <TextField
          {...field}
          value={formatAmount(item?.total_interest ?? 0)}
          size="small"
          error={!!errors.verdict_interest?.[index]?.total_interest}
          helperText={errors.verdict_interest?.[index]?.total_interest?.message}
          InputProps={{
            readOnly: true,
          }}
          disabled
          // sx={{ "& .MuiInputBase-input": { fontSize: "1rem", fontWeight: 600 } }}
        />
      )}
    />
  );
};

export default InterestCell;
