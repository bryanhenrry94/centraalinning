"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Container, Typography, Grid, Paper, Switch } from "@mui/material";
import {
  Person,
  Balance,
  Gavel,
  AccountBalance,
  VerifiedUser,
} from "@mui/icons-material";
import { Plan } from "@/lib/validations/plan";
import { getPlans } from "@/actions/plan";
import { PlanCard } from "./PlanCard";

export default function RegistrationPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [cycle, setCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");

  const handleSelectPlan = (planId: string) => {
    router.push(
      `/signup/confirm?plan=${encodeURIComponent(planId)}&cycle=${cycle}`,
    );
  };

  const handleChangeCycle = (newCycle: "MONTHLY" | "YEARLY") => {
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
          bgcolor: "#1a365d",
          borderTop: "1px solid #e0e0e0",
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
                fontWeight: cycle === "MONTHLY" ? 700 : 500,
                color: cycle === "MONTHLY" ? "#1a365d" : "#6b7280",
                transition: "all .2s ease",
                fontSize: "1.5rem",
              }}
            >
              Maandelijks
            </Typography>

            <Switch
              checked={cycle === "YEARLY"}
              onChange={(e) =>
                handleChangeCycle(e.target.checked ? "YEARLY" : "MONTHLY")
              }
              color="primary"
              size="medium"
            />

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                sx={{
                  fontWeight: cycle === "YEARLY" ? 700 : 500,
                  color: cycle === "YEARLY" ? "#1a365d" : "#6b7280",
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
                    cycle === "MONTHLY" ? plan.monthly_price : plan.yearly_price
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
