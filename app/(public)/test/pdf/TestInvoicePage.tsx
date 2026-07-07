"use client";

import React from "react";
import { PDFViewer } from "@react-pdf/renderer";

import SommatiePDF, { SommatiePDFProps } from "@/modules/collection/templates/pdfs/SommatiePDF";
import { InvoicePDF, InvoicePDFProps } from "@/templates/pdfs";

const TestInvoicePage = () => {
  const params: InvoicePDFProps = {
    logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "",
    invoice_number: "INV-2026-000003",
    issue_date: "2026-05-20",
    customer_name: "John Doe",
    customer_address: "Kaya Industria 15",
    customer_island: "Bonaire",
    bank_name: "MCB",
    bank_account: "418.825.10",
    isPaid: true,
    details: [
      {
        item_description: "Financiële afspraakregistratie",
        item_quantity: 1,
        item_unit_price: 100,
        item_tax_rate: 0,
        item_subtotal: 100,
      },
    ],
    total: 100,
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: "#E5E7EB",
      }}
    >
      <PDFViewer
        width="100%"
        height="100%"
        style={{
          border: "none",
        }}
      >
        <InvoicePDF {...params} />
      </PDFViewer>
    </div>
  );
};

export default TestInvoicePage;
