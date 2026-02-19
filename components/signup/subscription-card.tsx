"use client";

import React, { useEffect } from "react";
import { Box, TextField, MenuItem, Typography, Divider } from "@mui/material";
import { ITenantSignUp } from "@/lib/validations/signup";
import { formatCurrency } from "@/utils/formatters";
import { PRICING } from "@/constants/pricing";

interface SetFormData {
  (data: ITenantSignUp): void;
  (updater: (prev: ITenantSignUp) => ITenantSignUp): void;
}

interface SubscriptionCardProps {
  initial: ITenantSignUp;
  setFormData: SetFormData;
}

interface BillingOption {
  value: "monthly" | "yearly";
  label: string;
  description: string;
}

const REGISTRATION_FEE = 150;

export const BILLING_OPTIONS: BillingOption[] = [
  {
    value: "monthly",
    label: "Maandelijks",
    description: "Automatische maandelijkse facturering",
  },
  {
    value: "yearly",
    label: "Jaarlijks",
    description: "Eén betaling, account actief voor 12 maanden",
  },
];

export default function SubscriptionCard({
  initial,
  setFormData,
}: SubscriptionCardProps) {
  const role = initial.company.role || "PLATFORM_OWNER";
  const billing = initial.subscription.subscription_type || "monthly";

  const subscriptionPrice =
    PRICING[role as keyof typeof PRICING]?.[
      billing as keyof (typeof PRICING)[typeof role]
    ] || 0;

  const totalToday = REGISTRATION_FEE + (subscriptionPrice as number);

  useEffect(() => {
    if (!initial.subscription.subscription_type) return;

    setFormData((prev: ITenantSignUp) => ({
      ...prev,
      total_price: totalToday,
    }));
  }, [subscriptionPrice, totalToday]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 4 }}>
      {/* ACTIVATION */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          1. Systeemactivering
        </Typography>

        <TextField
          fullWidth
          value={formatCurrency(REGISTRATION_FEE)}
          InputProps={{ readOnly: true }}
        />

        <Typography variant="caption" color="text.secondary">
          Eenmalige betaling voor het aanmaken en activeren van uw account.
        </Typography>
      </Box>

      <Divider />

      {/* SUBSCRIPTION */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          2. Serviceplan
        </Typography>

        <TextField
          select
          fullWidth
          value={billing}
          onChange={(e) => {
            const selectedBilling = e.target.value;

            const price =
              (PRICING[role as keyof typeof PRICING]?.[
                selectedBilling as keyof (typeof PRICING)[typeof role]
              ] as number) || 0;

            setFormData({
              ...initial,
              subscription: {
                ...initial.subscription,
                subscription_type: selectedBilling,
                subscription_price: price,
              },
              total_price: REGISTRATION_FEE + price,
            });
          }}
        >
          {BILLING_OPTIONS.map((option) => {
            const price =
              (PRICING[role as keyof typeof PRICING]?.[
                option.value as keyof (typeof PRICING)[typeof role]
              ] as number) || 0;

            return (
              <MenuItem key={option.value} value={option.value}>
                <Box>
                  <Typography>
                    {option.label} — {formatCurrency(price)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.description}
                  </Typography>
                </Box>
              </MenuItem>
            );
          })}
        </TextField>
      </Box>

      <Divider />

      {/* TOTAL */}
      <Box sx={{ mt: 1 }}>
        <Typography variant="subtitle2">
          Totaal om vandaag te betalen
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          {formatCurrency(totalToday)}
        </Typography>

        <Typography variant="caption" color="text.secondary">
          {billing === "monthly"
            ? "De service wordt daarna maandelijks gefactureerd."
            : "Eenmalige betaling voor 12 maanden toegang."}
        </Typography>
      </Box>
    </Box>
  );
}
