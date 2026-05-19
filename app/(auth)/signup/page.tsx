"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Stack,
  Paper,
  createTheme,
  Switch,
} from "@mui/material";
import {
  Person,
  Balance,
  Gavel,
  AccountBalance,
  Check,
  ArrowForward,
  Lock,
  VerifiedUser,
  Shield,
  Description,
  Help,
} from "@mui/icons-material";
import { Plan } from "@/lib/validations/plan";
import { getPlans } from "@/actions/plan";
import { formatCurrency } from "@/utils/formatters";

const theme = createTheme({
  palette: {
    primary: {
      main: "#E67E22",
    },
    secondary: {
      main: "#1a365d",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

interface PlanCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  price: number;
  features: string[];
  onSelect?: () => void;
}

function PlanCard({
  icon,
  title,
  description,
  price,
  features,
  onSelect,
}: PlanCardProps) {
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
}

export default function RegistrationPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");

  const handleSelectPlan = (planId: string) => {
    router.push(
      `/signup/confirm?plan=${encodeURIComponent(planId)}&cycle=${cycle}`,
    );
  };

  const handleChangeCycle = (newCycle: "monthly" | "yearly") => {
    setCycle(newCycle);
  };

  const fetchPlans = async () => {
    try {
      const data = await getPlans();
      setPlans(data);
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#fafafa" }}>
      {/* Header */}
      <Box
        component="header"
        sx={{
          bgcolor: "white",
          borderBottom: "1px solid #e0e0e0",
          py: 2,
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}></Box>
          </Box>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: 2 }}>
        {/* Title Section */}
        <Box sx={{ textAlign: "center", mb: 6 }}>
          <Box
            sx={{
              width: 40,
              height: 4,
              mx: "auto",
              mb: 2,
              borderRadius: 2,
            }}
          />
          <Typography
            variant="h3"
            component="h1"
            sx={{ fontWeight: 700, color: "#1a365d", mb: 2 }}
          >
            Registratieplan
          </Typography>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ maxWidth: 650, mx: "auto", fontSize: "1rem" }}
          >
            Elke registratie is gekoppeld aan een registratieplan dat aansluit
            bij uw organisatie of rol.
          </Typography>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              my: 8,
            }}
          >
            <Typography
              sx={{
                fontWeight: cycle === "monthly" ? 700 : 500,
                color: cycle === "monthly" ? "#1a365d" : "#6b7280",
                transition: "all .2s ease",
                fontSize: "1.5rem",
              }}
            >
              Maandelijks
            </Typography>

            <Switch
              checked={cycle === "yearly"}
              onChange={(e) =>
                handleChangeCycle(e.target.checked ? "yearly" : "monthly")
              }
              color="primary"
              size="medium"
            />

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                sx={{
                  fontWeight: cycle === "yearly" ? 700 : 500,
                  color: cycle === "yearly" ? "#1a365d" : "#6b7280",
                  transition: "all .2s ease",
                  fontSize: "1.5rem",
                }}
              >
                Jaarlijks
              </Typography>

              {/* <Chip
                  label="-20%"
                  size="small"
                  sx={{
                    backgroundColor: "#dcfce7",
                    color: "#166534",
                    fontWeight: 700,
                  }}
                /> */}
            </Box>
          </Box>
        </Box>

        {/* Pricing Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {plans.map((plan, index) => {
            const iconMap: Record<string, React.ReactNode> = {
              klant: <Person sx={{ fontSize: 28 }} />,
              advocaat: <Balance sx={{ fontSize: 28 }} />,
              rechter: <Gavel sx={{ fontSize: 28 }} />,
              organisatie: <AccountBalance sx={{ fontSize: 28 }} />,
            };
            const planNameLower = plan.name.toLowerCase();
            const icon = iconMap[planNameLower] || (
              <Person sx={{ fontSize: 28 }} />
            );

            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                <PlanCard
                  icon={icon}
                  title={plan.name}
                  description={plan.description || ""}
                  price={
                    cycle === "monthly" ? plan.monthly_price : plan.yearly_price
                  }
                  features={
                    Array.isArray(plan.features)
                      ? plan.features
                      : Object.values(plan.features || {})
                  }
                  onSelect={() => handleSelectPlan(plan.id)}
                />
              </Grid>
            );
          })}
        </Grid>

        {/* Info Boxes */}
        <Paper
          sx={{
            p: 3,
            border: "1px solid #e0e0e0",
            borderRadius: 2,
            mx: "auto",
            textAlign: "center",
          }}
          elevation={0}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.5,
              mb: 1,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                bgcolor: "rgba(230, 126, 34, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <VerifiedUser sx={{ color: "#E67E22", fontSize: 22 }} />
            </Box>

            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, color: "#1a365d" }}
            >
              Veilig en vertrouwd
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary">
            Uw gegevens zijn veilig en worden alleen gebruikt voor toegestane
            doeleinden.
          </Typography>
        </Paper>
      </Container>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          bgcolor: "#1a365d",
          borderTop: "1px solid #e0e0e0",
          py: 3,
          mt: "auto",
          bottom: 0,
          left: 0,
          right: 0,
          width: "100%",
          zIndex: 100,
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Typography variant="caption" sx={{ color: "white" }}>
              © 2026 CFSB Group. Alle rechten voorbehouden.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
