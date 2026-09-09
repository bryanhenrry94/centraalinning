"use client";

import React from "react";
import { Box, Container, Typography } from "@mui/material";

import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import { FarRegistrationWizard } from "@/modules/financial-agreement/components/far-registration-wizard";

const NewFinancialAgreementPage: React.FC = () => {
  return (
    <Container
      maxWidth="md"
      disableGutters
      sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
    >
      <AppBreadcrumbs
        items={[
          {
            label: "FAR — Financiële Afspraken Registreren",
            href: "/financial-agreements",
          },
          { label: "Nieuw" },
        ]}
      />

      <FarRegistrationWizard />
    </Container>
  );
};

export default NewFinancialAgreementPage;
