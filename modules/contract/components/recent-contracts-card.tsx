import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Divider,
  Stack,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/shared/utils/formatters";

export interface Contract {
  id: string;
  contractNumber: string;
  debtorName: string;
  createdAt: string;
  totalAmount: number;
  status: "DRAFT" | "REGISTERED" | "PAID";
}

interface RecentContractsCardProps {
  contracts: Contract[];
}

export default function RecentContractsCard({
  contracts,
}: RecentContractsCardProps) {
  const router = useRouter();

  const getStatusColor = (
    status: Contract["status"],
  ): "default" | "success" | "warning" => {
    switch (status) {
      case "PAID":
        return "success";
      case "REGISTERED":
        return "success";
      default:
        return "warning";
    }
  };

  return (
    <Card
      sx={{
        borderRadius: 2,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        bgcolor: "background.paper",
      }}
    >
      <CardContent sx={{ padding: 3 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{ color: "text.primary" }}
          >
            Últimos Contratos
          </Typography>

          <Button
            size="small"
            endIcon={<ArrowForwardIcon />}
            onClick={() => router.push("/contracts")}
            sx={{ textTransform: "none", fontWeight: 500 }}
          >
            Ver más
          </Button>
        </Box>

        <Stack divider={<Divider sx={{ my: 1 }} />} spacing={0}>
          {contracts.map((contract) => (
            <Box
              key={contract.id}
              display="flex"
              justifyContent="space-between"
              alignItems="flex-start"
              py={2}
              sx={{
                transition: "background-color 0.2s",
                "&:hover": {
                  bgcolor: "action.hover",
                  borderRadius: 1,
                  px: 1,
                },
              }}
            >
              <Box flex={1}>
                <Typography
                  fontWeight={600}
                  sx={{ color: "text.primary", mb: 0.5 }}
                >
                  {contract.contractNumber}
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  {new Date(contract.createdAt).toLocaleDateString()}
                </Typography>
              </Box>

              <Box textAlign="right" sx={{ ml: 2 }}>
                <Chip
                  size="small"
                  label={contract.status}
                  color={getStatusColor(contract.status)}
                  variant="filled"
                  sx={{ fontWeight: 500, mb: 1 }}
                />

                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{ color: "text.primary" }}
                >
                  {formatCurrency(contract.totalAmount)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
