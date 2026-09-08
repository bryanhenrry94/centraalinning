"use client";

import React from "react";
import { Box, Container, Typography } from "@mui/material";

import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import { FarRegistrationWizard } from "@/modules/financial-agreement/components/far-registration-wizard";

const NewFinancialAgreementPage: React.FC = () => {
  return (
    <Container maxWidth="md" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs
        items={[
          { label: "FAR — Financiële Afspraken Registreren", href: "/financial-agreements" },
          { label: "Nieuw" },
        ]}
      />

      <Box mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Nieuwe FAR registreren
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Registro independiente de un acuerdo financiero. No inicia ningún seguimiento
          administrativo (AOP) — eso, si hace falta, se inicia después como un expediente nuevo.
        </Typography>
      </Box>

      <FarRegistrationWizard />
    </Container>
  );
};

export default NewFinancialAgreementPage;
