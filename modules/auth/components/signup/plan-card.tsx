import { formatCurrency } from "@/shared/utils/formatters";
import { ArrowForward, Check, Star } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";

const PRIMARY = "#0A3D91";
const ACCENT = "#F7931E";

export interface PlanCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  registrationPrice: number;
  recurringPrice: number;
  recurringLabel: string;
  features: string[];
  featured?: boolean;
  onSelect?: () => void;
}

export const PlanCard = ({
  icon,
  title,
  description,
  registrationPrice,
  recurringPrice,
  recurringLabel,
  features,
  featured = false,
  onSelect,
}: PlanCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        overflow: "visible",
        border: isHovered ? `2px solid ${PRIMARY}` : "1px solid #e5e7eb",
        borderRadius: "16px",
        position: "relative",
        cursor: "pointer",
        boxShadow: "0 2px 10px rgba(10, 61, 145, 0.08)",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          boxShadow: "0 8px 24px rgba(10, 61, 145, 0.16)",
        },
      }}
      elevation={0}
    >
      {featured && (
        <Chip
          icon={<Star sx={{ fontSize: 16, color: "white !important" }} />}
          label="Aanbevolen"
          size="small"
          sx={{
            position: "absolute",
            top: -14,
            right: 16,
            bgcolor: ACCENT,
            color: "white",
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        />
      )}

      <CardContent
        sx={{
          p: 3,
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              flexShrink: 0,
              borderRadius: "50%",
              border: `2px solid ${PRIMARY}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: PRIMARY,
              transition: "all 0.2s ease-in-out",
            }}
          >
            {icon}
          </Box>

          <Box>
            <Typography
              variant="h6"
              component="h3"
              sx={{
                fontWeight: 700,
                color: PRIMARY,
                lineHeight: 1.2,
                transition: "color 0.2s ease-in-out",
              }}
            >
              {title}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 3,
            py: 2,
            mb: 2,
            borderTop: "1px solid #f0f0f0",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Box sx={{ textAlign: "center" }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, color: PRIMARY, lineHeight: 1.2 }}
            >
              {formatCurrency(registrationPrice)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Registratiekosten
            </Typography>
          </Box>

          <Box sx={{ textAlign: "center" }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, color: PRIMARY, lineHeight: 1.2 }}
            >
              {formatCurrency(recurringPrice)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {recurringLabel}
            </Typography>
          </Box>
        </Box>

        <Stack spacing={1.25} sx={{ flexGrow: 1, mb: 2.5 }}>
          {features.map((feature, index) => (
            <Box
              key={index}
              sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}
            >
              <Check sx={{ color: ACCENT, fontSize: 20, mt: 0.2 }} />
              <Typography variant="body2" color="text.secondary">
                {feature}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Button
          variant="contained"
          endIcon={<ArrowForward />}
          onClick={onSelect}
          fullWidth
          sx={{
            py: 1.25,
            borderRadius: "10px",
            textTransform: "none",
            fontWeight: 600,
            bgcolor: PRIMARY,
            "&:hover": { bgcolor: "#082f70" },
          }}
        >
          Aansluiten
        </Button>
      </CardContent>
    </Card>
  );
};
