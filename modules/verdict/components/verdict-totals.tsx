import { formatCurrency } from "@/shared/utils/formatters";
import { Box, Paper, Typography } from "@mui/material";
import { useFormContext, useWatch } from "react-hook-form";

interface VerdictTotalsProps {
  // Tarifa CFSB del participante (gop_fee_rate) — base de la línea "Costo
  // administrativo CFSB recuperable" (punto 5 del análisis CFSB). Opcional
  // para no romper otros usos de este componente (p.ej. la vista de un
  // vonnis ya registrado, sin ese contexto); sin ella no se muestra la línea.
  gopFeeRatePercent?: number;
}

const VerdictTotals: React.FC<VerdictTotalsProps> = ({ gopFeeRatePercent }) => {
  const { control } = useFormContext();

  // const verdictInterest = useWatch({ control, name: "verdictInterest" });
  const sentence_amount = useWatch({ control, name: "sentence_amount" });
  // const verdictEmbargo = useWatch({ control, name: "verdictEmbargo" });
  const procesal_cost = useWatch({ control, name: "procesal_cost" });

  interface VerdictInterestItem {
    total_interest?: number;
    // add other fields if needed
  }

  interface VerdictEmbargoItem {
    total_amount?: number;
    // add other fields if needed
  }

  interface VerdictBailiffItem {
    service_cost?: number;
    // add other fields if needed
  }

  const verdictInterest: VerdictInterestItem[] = useWatch({
    control,
    name: "verdict_interest",
  });
  const verdictEmbargo: VerdictEmbargoItem[] = useWatch({
    control,
    name: "verdict_embargo",
  });

  const bailiff_services: VerdictBailiffItem[] = useWatch({
    control,
    name: "bailiff_services",
  });

  const total_interest: number =
    verdictInterest?.reduce(
      (sum: number, item: VerdictInterestItem) =>
        sum + (item?.total_interest ?? 0),
      0
    ) ?? 0;

  const totalEmbargoAmount =
    verdictEmbargo?.reduce(
      (sum, item) => sum + (Number(item?.total_amount) ?? 0),
      0
    ) ?? 0;

  const totalBailiffAmount =
    bailiff_services?.reduce(
      (sum, item) => sum + (Number(item?.service_cost) ?? 0),
      0
    ) ?? 0;

  // Costo administrativo CFSB recuperable (punto 4/5 del análisis CFSB): 5%
  // (gop_fee_rate) sobre el monto decidido por la corte + intereses legales
  // — lo que el participante paga a CFSB para activar el GOP, y que luego se
  // registra como obligación separada, recuperable, contra el deudor. No se
  // oculta dentro del monto principal — línea independiente.
  const recoverableCfsbCost =
    gopFeeRatePercent !== undefined
      ? ((Number(sentence_amount) || 0) + total_interest) * (gopFeeRatePercent / 100)
      : 0;

  return (
    <Box
      sx={{
        mt: { xs: 3, sm: 8.5 },
        display: "flex",
        justifyContent: "right",
        width: "100%",
      }}
    >
      <Paper
        component="section"
        sx={{
          mt: 2,
          elevation: 1,
          borderRadius: 1,
          overflow: "hidden",
          mb: 2,
          width: "100%",
        }}
      >
        <Box
          sx={{
            bgcolor: "#eeeeee",
            // color: "white",
            px: 2,
            py: 1.5,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            borderBottom: "1px solid #e0e0e0",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Typography
            variant="h6"
            component="h3"
            sx={{ fontWeight: 600, width: "100%", textAlign: "center" }}
          >
            Overzicht
          </Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 2,
              mt: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                gridColumn: "span 2",
              }}
            >
              <Typography>Hoofdsom:</Typography>
              <Typography fontWeight="600">
                {sentence_amount
                  ? formatCurrency(Number(sentence_amount))
                  : "$0.00"}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                gridColumn: "span 2",
              }}
            >
              <Typography>Rente:</Typography>
              <Typography fontWeight="600">
                {total_interest
                  ? formatCurrency(Number(total_interest))
                  : "$0.00"}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                gridColumn: "span 2",
              }}
            >
              <Typography>Overige Proceskosten:</Typography>
              <Typography fontWeight="600">
                {procesal_cost
                  ? formatCurrency(Number(procesal_cost))
                  : "$0.00"}
              </Typography>
            </Box>
            {gopFeeRatePercent !== undefined && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  gridColumn: "span 2",
                }}
              >
                <Typography>
                  Terugvorderbare CFSB-administratiekosten ({gopFeeRatePercent}%):
                </Typography>
                <Typography fontWeight="600">
                  {formatCurrency(recoverableCfsbCost)}
                </Typography>
              </Box>
            )}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                gridColumn: "span 2",
              }}
            >
              <Typography>Deurwaarder kosten:</Typography>
              <Typography fontWeight="600">
                {totalBailiffAmount
                  ? formatCurrency(Number(totalBailiffAmount))
                  : "$0.00"}
              </Typography>
            </Box>
            <Box
              sx={{
                gridColumn: "span 2",
                borderTop: 1,
                borderColor: "divider",
                pt: 2,
                mt: 1,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: "bold",
                }}
              >
                <Typography variant="h6">Totaal:</Typography>
                <Typography variant="h6" fontWeight="bold">
                  {formatCurrency(
                    Number(sentence_amount ?? 0) +
                      Number(total_interest ?? 0) +
                      Number(totalBailiffAmount ?? 0) +
                      Number(totalEmbargoAmount ?? 0) +
                      Number(procesal_cost ?? 0) +
                      recoverableCfsbCost
                  )}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default VerdictTotals;
