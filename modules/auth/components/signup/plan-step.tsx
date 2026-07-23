"use client";

import { useEffect, useState } from "react";
import { Box, Button, Chip, Grid, Switch, Typography } from "@mui/material";
import { Person, Balance, Gavel } from "@mui/icons-material";
import { Plan } from "@/modules/settings/services/plan.validators";
import { getPlans } from "@/modules/settings/actions/plan.actions";
import { PlanCard } from "./plan-card";
import { STEP_HEADER_GAP, STEP_SECTION_GAP } from "./layout.constants";

const PRIMARY = "#0A3D91";

interface PlanStepProps {
  billingCycle: "MONTHLY" | "YEARLY";
  onChangeBillingCycle: (cycle: "MONTHLY" | "YEARLY") => void;
  onSelect: (planId: string, planName: string) => void;
  onBack: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  deelnemer: <Person sx={{ fontSize: 28 }} />,
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

  const recurringLabel =
    billingCycle === "MONTHLY"
      ? "Maandelijkse bijdrage"
      : "Jaarlijkse bijdrage";

  return (
    <Box sx={{ width: "100%" }}>
      <Typography
        variant="h5"
        sx={{ fontWeight: 700, color: PRIMARY, mb: STEP_HEADER_GAP }}
      >
        Kies uw registratieplan
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: STEP_SECTION_GAP }}
      >
        Word deelnemer van de CFSB-samenwerking en kies het registratieplan dat
        het beste aansluit bij uw organisatie.
      </Typography>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: STEP_SECTION_GAP,
        }}
      >
        <Typography
          sx={{
            fontWeight: billingCycle === "MONTHLY" ? 700 : 500,
            color: billingCycle === "MONTHLY" ? PRIMARY : "#6b7280",
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
            color: billingCycle === "YEARLY" ? PRIMARY : "#6b7280",
          }}
        >
          Jaarlijks
        </Typography>

        <Chip
          label="10% korting"
          size="small"
          sx={{
            bgcolor: "#dcfce7",
            color: "#16a34a",
            fontWeight: 700,
          }}
        />
      </Box>

      <Grid container spacing={3}>
        {plans.map((plan) => {
          const planNameLower = plan.name.toLowerCase();
          const icon = iconMap[planNameLower] || (
            <Person sx={{ fontSize: 28 }} />
          );

          return (
            <Grid size={12} key={plan.id}>
              <PlanCard
                icon={icon}
                title={plan.name}
                description={plan.description || ""}
                registrationPrice={plan.registration_price}
                recurringPrice={
                  billingCycle === "MONTHLY"
                    ? plan.monthly_price
                    : plan.yearly_price
                }
                recurringLabel={recurringLabel}
                features={
                  Array.isArray(plan.features)
                    ? plan.features
                    : Object.values(plan.features || {})
                }
                featured={planNameLower === "deelnemer"}
                onSelect={() => onSelect(plan.id, plan.name)}
              />
            </Grid>
          );
        })}
      </Grid>

      <Button
        variant="outlined"
        onClick={onBack}
        sx={{
          mt: 3,
          py: 1.25,
          px: 3,
          fontWeight: 600,
          textTransform: "none",
        }}
      >
        ← Terug
      </Button>
    </Box>
  );
};
