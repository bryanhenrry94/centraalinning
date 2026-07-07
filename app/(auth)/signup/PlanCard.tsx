import { formatCurrency } from "@/shared/utils/formatters";
import { ArrowForward, Check } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";

export interface PlanCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  price: number;
  features: string[];
  onSelect?: () => void;
}

export const PlanCard = ({
  icon,
  title,
  description,
  price,
  features,
  onSelect,
}: PlanCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        height: "100%",
        border: isHovered ? "2px solid #E67E22" : "1px solid #e0e0e0",
        borderRadius: 2,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          boxShadow: 4,
        },
      }}
      elevation={0}
    >
      <CardContent sx={{ flexGrow: 1, p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mb: 2,
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: isHovered ? "2px solid #E67E22" : "2px solid #1a365d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isHovered ? "#E67E22" : "#1a365d",
              transition: "all 0.2s ease-in-out",
            }}
          >
            {icon}
          </Box>
        </Box>

        <Typography
          variant="h6"
          component="h3"
          align="center"
          sx={{
            fontWeight: 700,
            color: isHovered ? "#E67E22" : "#1a365d",
            mb: 1,
            transition: "color 0.2s ease-in-out",
          }}
        >
          {title}
        </Typography>

        <Typography
          variant="body2"
          align="center"
          color="text.secondary"
          sx={{ mb: 3, minHeight: 40 }}
        >
          {description}
        </Typography>

        <Typography
          variant="h3"
          align="center"
          sx={{
            fontWeight: 700,
            color: isHovered ? "#E67E22" : "#1a365d",
            mb: 0.5,
            transition: "color 0.2s ease-in-out",
          }}
        >
          {formatCurrency(price)}
        </Typography>

        <Typography
          variant="body2"
          align="center"
          color="text.secondary"
          sx={{ mb: 3 }}
        >
          Eenmalige registratie
        </Typography>

        <Stack spacing={1.5}>
          {features.map((feature, index) => (
            <Box
              key={index}
              sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}
            >
              <Check sx={{ color: "#E67E22", fontSize: 20, mt: 0.2 }} />
              <Typography variant="body2" color="text.secondary">
                {feature}
              </Typography>
            </Box>
          ))}
        </Stack>
      </CardContent>

      <Box sx={{ p: 3, pt: 0 }}>
        <Button
          variant={isHovered ? "contained" : "outlined"}
          fullWidth
          endIcon={<ArrowForward />}
          onClick={onSelect}
          sx={{
            py: 1.5,
            borderRadius: 1,
            textTransform: "none",
            fontWeight: 600,
            transition: "all 0.2s ease-in-out",
            ...(isHovered
              ? {
                  bgcolor: "#E67E22",
                  color: "white",
                  "&:hover": { bgcolor: "#d35400" },
                }
              : {
                  borderColor: "#1a365d",
                  color: "#1a365d",
                  "&:hover": {
                    borderColor: "#1a365d",
                    bgcolor: "rgba(26, 54, 93, 0.04)",
                  },
                }),
          }}
        >
          Kies dit plan
        </Button>
      </Box>
    </Card>
  );
};
