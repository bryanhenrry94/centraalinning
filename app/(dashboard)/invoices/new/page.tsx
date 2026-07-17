"use client";
import React from "react";
import ActionToolbar from "@/shared/ui/breadcrums";
import { Box } from "@mui/material";
import { InvoiceProvider } from "@/modules/payment/contexts/invoice.context";
import InvoiceFormPage from "@/modules/payment/components/invoice-form";

const InvoicePage: React.FC = () => {
  return (
    <Box sx={{ m: { xs: 1.5, sm: 4 } }}>
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
