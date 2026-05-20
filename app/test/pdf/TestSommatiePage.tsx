"use client";

import React from "react";
import { PDFViewer } from "@react-pdf/renderer";

import SommatiePDF, { SommatiePDFProps } from "@/components/pdf/SommatiePDF";

const TestSommatiePage = () => {
  const params: SommatiePDFProps = {
    logoUrl:
      process.env.NEXT_PUBLIC_LOGO_URL ||
      "https://dummyimage.com/300x120/0f172a/ffffff&text=LOGO",

    date: "20-05-2026",

    debtorName: "John Doe",

    debtorAddress: "Kaya Industria 15",

    island: "Bonaire",

    reference_number: "SOM-2026-001",

    total_amount: "1,845.50",

    amount_original: "1,250.00",

    calculatedABB: "75.50",

    tenantName: "DAZZSOFT",

    administrativeCosts: "150.00",

    additionalCosts: "250.00",

    additionalABB: "15.00",
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
        <SommatiePDF {...params} />
      </PDFViewer>
    </div>
  );
};

export default TestSommatiePage;
