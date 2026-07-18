"use client";

import { useEffect, useState } from "react";
import { Box, Button, Grid, Switch, Typography } from "@mui/material";
import { Person, Balance, Gavel } from "@mui/icons-material";
import { Plan } from "@/modules/settings/services/plan.validators";
import { getPlans } from "@/modules/settings/actions/plan.actions";
import { PlanCard } from "./plan-card";

interface PlanStepProps {
  billingCycle: "MONTHLY" | "YEARLY";
  onChangeBillingCycle: (cycle: "MONTHLY" | "YEARLY") => void;
  onSelect: (planId: string) => void;
  onBack: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  klant: <Person sx={{ fontSize: 28 }} />,
  advocaat: <Balance sx={{ fontSize: 28 }} />,
  deurwaarder: <Gavel sx={{ fontSize: 28 }} />,
};

export const PlanStep = ({
  billingCycle,
  onChangeBillingCycle,
  onSelect,
  onBack,
}: PlanStepProps) => {
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await getPlans();
        setPlans(data);
      } catch (error) {
        console.error("Error fetching plans:", error);
      }
    };

    fetchPlans();
  }, []);

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a365d", mb: 0.5 }}>
        Kies uw registratieplan
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Elke registratie is gekoppeld aan een registratieplan dat aansluit bij
        uw rol.
      </Typography>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 3,
        }}
      >
        <Typography
          sx={{
            fontWeight: billingCycle === "MONTHLY" ? 700 : 500,
            color: billingCycle === "MONTHLY" ? "#1a365d" : "#6b7280",
          }}
        >
          Maandelijks
        </Typography>

        <Switch
          checked={billingCycle === "YEARLY"}
          onChange={(e) =>
            onChangeBillingCycle(e.target.checked ? "YEARLY" : "MONTHLY")
          }
          color="primary"
        />

        <Typography
          sx={{
            fontWeight: billingCycle === "YEARLY" ? 700 : 500,
            color: billingCycle === "YEARLY" ? "#1a365d" : "#6b7280",
          }}
        >
          Jaarlijks
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {plans.map((plan) => {
          const planNameLower = plan.name.toLowerCase();
          const icon = iconMap[planNameLower] || <Person sx={{ fontSize: 28 }} />;

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={plan.id}>
              <PlanCard
                icon={icon}
                title={plan.name}
                description={plan.description || ""}
                price={
                  billingCycle === "MONTHLY" ? plan.monthly_price : plan.yearly_price
                }
                features={
                  Array.isArray(plan.features)
                    ? plan.features
                    : Object.values(plan.features || {})
                }
                onSelect={() => onSelect(plan.id)}
              />
            </Grid>
          );
        })}
      </Grid>

      <Button variant="outlined" onClick={onBack} sx={{ mt: 3 }}>
        Terug
      </Button>
    </Box>
  );
};
