"use client";

import React from "react";
import { PDFViewer } from "@react-pdf/renderer";

import FinancialSummaryPDF, {
  FinancialSummaryPDFProps,
} from "@/components/pdf/FinancialSummaryPDF";
import QRCode from "qrcode";

const FinancialSummaryPage = async () => {
  const qrCode = await QRCode.toDataURL(
    "https://sbxcentraalinning.com/verify/",
  );

  const params: FinancialSummaryPDFProps = {
    logoUrl:
      process.env.NEXT_PUBLIC_LOGO_URL ||
      "https://dummyimage.com/300x120/0f172a/ffffff&text=LOGO",

    issueDate: "20-05-2026",

    validUntil: "20-06-2026",

    referenceNumber: "FS-2026-001",

    // PERSONAL INFO
    idNumber: "123456789",

    fullName: "John Doe",

    address: "Kaya Industria 15, Bonaire",

    // FINANCIAL SUMMARY
    openObligations: "3",

    totalOutstandingAmount: "2,450.00",

    activePaymentPlans: "1",

    overduePaymentPlans: "0",

    // BLOCK STATUS
    economicBlockRegistered: "Nee",

    // SUMMARY
    summary: "Actieve betalingsregelingen worden correct nagekomen.",
    qrCode: qrCode,
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
        <FinancialSummaryPDF {...params} />
      </PDFViewer>
    </div>
  );
};

export default FinancialSummaryPage;
