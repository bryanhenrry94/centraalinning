"use client";
import React from "react";
import ActionToolbar from "@/components/ui/breadcrums";
import { Box } from "@mui/material";
import { InvoiceProvider } from "@/contexts/invoiceContext";
import InvoiceFormPage from "@/components/billing/invoice-form";

const InvoicePage: React.FC = () => {
  return (
    <Box sx={{ m: 4 }}>
      {/* <ActionToolbar
        title="Nieuwe Factuur"
        navigation={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "Overzicht Facturen", href: "/dashboard/invoices" },
        ]}
      /> */}
      <Box>
        <InvoiceProvider>
          <InvoiceFormPage />
        </InvoiceProvider>
      </Box>
    </Box>
  );
};

export default InvoicePage;
