"use client";

import React from "react";
import { PDFViewer } from "@react-pdf/renderer";

import IngebrekestellingPDF, {
  IngebrekestellingProps,
} from "@/modules/collection/templates/pdfs/IngebrekestellingPDF";

const TestIngebrekestellingPage = () => {
  const params: IngebrekestellingProps = {
    logoUrl:
      process.env.NEXT_PUBLIC_LOGO_URL ||
      "https://dummyimage.com/300x120/0f172a/ffffff&text=LOGO",

    date: "20-05-2026",

    debtorName: "John Doe",

    debtorAddress: "Kaya Industria 15",

    island: "Bonaire",

    referenceNumber: "CFSB-12052026",

    tenantName: "DAZZSOFT",

    aanmaningDate: "10-05-2026",

    sommatieDate: "25-05-2026",

    totalAmount: "1,621.16",
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
        <IngebrekestellingPDF {...params} />
      </PDFViewer>
    </div>
  );
};

export default TestIngebrekestellingPage;
