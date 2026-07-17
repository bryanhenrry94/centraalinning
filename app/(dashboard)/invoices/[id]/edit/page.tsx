"use client";
import React, { useEffect } from "react";
import ActionToolbar from "@/shared/ui/breadcrums";
import { InvoiceProvider } from "@/modules/payment/contexts/invoice.context";
import InvoiceFormPage from "@/modules/payment/components/invoice-form";
import { useParams } from "next/navigation";
import { Box } from "@mui/material";

const InvoicePageEdit: React.FC = () => {
  const params = useParams();
  const id = (params.id as string) || "";

  useEffect(() => {
    if (!id) {
      console.error("ID is required to edit a invoice.");
      return;
    }
  }, [id]);

  return (
    <Box sx={{ m: { xs: 1.5, sm: 4 } }}>
      {/* <ActionToolbar
        title="Bewerk Factuur"
        navigation={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "Overzicht Facturen", href: "/dashboard/invoices" },
        ]}
      /> */}
      <Box>
        <InvoiceProvider>
          <InvoiceFormPage id={id} />
        </InvoiceProvider>
      </Box>
    </Box>
  );
};

export default InvoicePageEdit;
