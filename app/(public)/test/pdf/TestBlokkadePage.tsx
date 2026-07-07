"use client";

import React from "react";
import { PDFViewer } from "@react-pdf/renderer";

import BlokkadePDF, { BlokkadePDFProps } from "@/modules/blockade/templates/pdfs/BlokkadePDF";

const TestBlokkadePage = () => {
  const params: BlokkadePDFProps = {
    logoUrl:
      process.env.NEXT_PUBLIC_LOGO_URL ||
      "https://dummyimage.com/300x120/0f172a/ffffff&text=LOGO",

    date: "20-05-2026",
    referenceNumber: "REF-123456789",

    debtorName: "John Doe",

    debtorAddress: "Kaya Industria 15",

    island: "Bonaire",

    tenantName: "DAZZSOFT S.A.S",
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
        <BlokkadePDF {...params} />
      </PDFViewer>
    </div>
  );
};

export default TestBlokkadePage;
