"use client";

import React from "react";
import { Container } from "@mui/material";
import { FarRegistrationWizard } from "@/modules/financial-agreement/components/far-registration-wizard";

const NewFinancialAgreementPage: React.FC = () => {
  return (
    <Container
      maxWidth="md"
      disableGutters
      sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
    >
      <FarRegistrationWizard />
    </Container>
  );
};

export default NewFinancialAgreementPage;
