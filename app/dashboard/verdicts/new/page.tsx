"use client";
import React from "react";
import VerdictFormPage from "@/components/verdict/verdict-form";
import { VerdictProvider } from "@/contexts/verdictContext";
import { Box } from "@mui/material";

const VerdictPage: React.FC = () => {
  const defaultValues = {
    invoice_number: "",
    creditor_name: "",
    debtor_id: "",
    registration_number: "",
    sentence_amount: 0,
    sentence_date: new Date(),
    procesal_cost: 0,
    bailiff_id: null,
    verdict_interest: [],
    verdict_embargo: [],
    bailiff_services: [],
  };

  return (
    <Box sx={{ m: 4 }}>
      <Box>
        <VerdictProvider>
          <VerdictFormPage defaultValues={defaultValues} modeEdit={false} />
        </VerdictProvider>
      </Box>
    </Box>
  );
};

export default VerdictPage;
