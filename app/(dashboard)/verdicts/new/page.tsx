"use client";
import React from "react";
import VerdictFormPage from "@/modules/verdict/components/verdict-form";
import { VerdictProvider } from "@/modules/verdict/contexts/verdict.context";
import { Box } from "@mui/material";
import { VerdictCreate } from "@/modules/verdict/services/verdict.validators";

const VerdictPage: React.FC = () => {
  const defaultValues: VerdictCreate = {
    invoice_number: "",
    creditor_name: "",
    debtor_id: "",
    registration_number: "",
    sentence_amount: 0,
    sentence_date: new Date(),
    procesal_cost: 0,
    bailiff_id: "",
    verdict_interest: [],
    verdict_embargo: [],
    bailiff_services: [],
    status: "DRAFT",
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
