"use client";

import React from "react";
import { PDFViewer } from "@react-pdf/renderer";
import AanmaningPDF, { AanmaningPDFProps } from "@/modules/collection/templates/pdfs/AanmaningPDF";

const TestAanmaningPage = () => {
  const params: AanmaningPDFProps = {
    logoUrl:
      process.env.NEXT_PUBLIC_LOGO_URL ||
      "https://dummyimage.com/300x120/0f172a/ffffff&text=LOGO",

    date: "19-05-2026",

    debtorName: "John Doe",

    debtorAddress: "Kaya Industria 15",

    island: "Bonaire",

    reference_number: "REF-2026-001",

    digitalFileCosts: "15.00",

    total_amount: "1,245.50",

    bankName: "MCB Bank",

    accountNumber: "123456789",

    amount_original: "950.00",

    extraCosts: "250.00",

    calculatedABB: "45.50",

    tenantName: "ABC Construction B.V.",
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
        <AanmaningPDF {...params} />
      </PDFViewer>
    </div>
  );
};

export default TestAanmaningPage;
