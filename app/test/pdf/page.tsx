"use client";
import dynamic from "next/dynamic";
import { InvoicePDF } from "@/templates/pdfs/InvoicePDF";
import AanmaningPDF from "@/templates/pdfs/AanmaningPDF";
import SommatiePDF from "@/templates/pdfs/SommatiePDF";
import IngebrekestellingPDF from "@/templates/pdfs/IngebrekestellingPDF";
import BlokkadePDF from "@/templates/pdfs/BlokkadePDF";
import VerdictCompanyPDF, {
  VerdictCompanyPDFProps,
} from "@/templates/pdfs/VerdictCompanyPDF";
import VerdictDebtorPDF, {
  VerdictDebtorPDFProps,
} from "@/templates/pdfs/VerdictDebtorPDF";
import VerdictCreditorPDF, {
  VerdictCreditorPDFProps,
} from "@/templates/pdfs/VerdictCreditorPDF";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => <p>Loading PDF viewer...</p>,
  }
);

const InvoiceComponent = () => {
  const params = {
    logoUrl: "/static/logo.png",
    invoice_number: "INV-1001",
    issue_date: "29/10/2025",
    customer_name: "Bryan Navarrete",
    customer_address: "Guayaquil, Ecuador",
    customer_island: "Bonaire",
    details: [
      {
        item_description: "Product A",
        item_quantity: 2,
        item_unit_price: 50,
        item_tax_rate: 0.1,
        item_subtotal: 110,
      },
      {
        item_description: "Product B",
        item_quantity: 1,
        item_unit_price: 100,
        item_tax_rate: 0.2,
        item_subtotal: 120,
      },
    ],
    total: 230,
    bank_name: "MCB",
    bank_account: "1234567890",
  };
  return <InvoicePDF {...params} />;
};

const AanmanningComponent = () => {
  const params = {
    logoUrl: "/static/logo.png",
    date: "19/10/2025",
    debtorName: "Bryan Navarrete",
    debtorAddress: "Guayaquil, Ecuador",
    island: "Bonaire",
    reference_number: "INV0001",
    total_amount: "250.00",
    bankName: "MCB",
    accountNumber: "1234567890",
    amount_original: "200.00",
    extraCosts: "30.00",
    calculatedABB: "20.00",
    tenantName: "DAZZSOFT S.A.S.",
  };
  return <AanmaningPDF {...params} />;
};

const SommatieComponent = () => {
  const params = {
    logoUrl: "/static/logo.png",
    date: "29/10/2025",
    debtorName: "Bryan Navarrete",
    debtorAddress: "Guayaquil, Ecuador",
    island: "Bonaire",
    invoice_number: "INV0001",
    invoiceAmount: "300.00",
  };
  return <SommatiePDF {...params} />;
};

const IngebrekestellingComponent = () => {
  const params = {
    logoUrl: "/static/logo.png",
    date: "29/10/2025",
    debtorName: "Bryan Navarrete",
    debtorAddress: "Guayaquil, Ecuador",
    island: "Bonaire",
    firstReminderDate: "10/10/2025",
    secondReminderDate: "30/10/2025",
    accountNumber: "1234567890",
    tenantName: "DAZZSOFT S.A.S.",
  };
  return <IngebrekestellingPDF {...params} />;
};

const BlokkadeComponent = () => {
  const params = {
    logoUrl: "/static/logo.png",
    date: "29/10/2025",
    debtorName: "Bryan Navarrete",
    debtorAddress: "Guayaquil, Ecuador",
    island: "Bonaire",
    total_amount: "400.00",
    amountRegister: "350.00",
    total: "450.00",
    bankName: "MCB",
    accountNumber: "1234567890",
  };
  return <BlokkadePDF {...params} />;
};

const VerdictCompanyComponent = () => {
  const params: VerdictCompanyPDFProps = {
    logoUrl: "/static/logo.png",
    sendDate: "29/10/2025",
    company_name: "DAZZSOFT S.A.S.",
    company_address: "Guayaquil, Ecuador",
    company_island: "Bonaire",
    companyCity: "Bonaire",
    debtorName: "Bryan Navarrete",
    vonnisDate: "15/10/2025",
    vonnisAmount: "500.00",
    collectionPercentage: "10%",
    calculatedCollection: "50.00",
    abbPercentage: "5%",
    calculatedABB: "25.00",
    daysLate: "30",
    interestAmount: "15.00",
    total_amount: "590.00",
    accountNumber: "1234567890",
    agentName: "Agent Name",
  };
  return <VerdictCompanyPDF {...params} />;
};

const VerdictDebtorComponent = () => {
  const params: VerdictDebtorPDFProps = {
    logoUrl: "/static/logo.png",
    debtorName: "Bryan Navarrete",
    reference: "VONNIS-1001",
    sentence_date: "15/10/2025",
    sentence_amount: "600.00",
    bankAccountNumber: "1234567890",
    date: "29/10/2025",
  };
  return <VerdictDebtorPDF {...params} />;
};

const VerdictCreditoComponent = () => {
  const params: VerdictCreditorPDFProps = {
    logoUrl: "/static/logo.png",
    invoice_number: "001",
    creditor_name: "Juan Perez",
    debtorName: "Abigail Smith",
    date: "29/10/2025",
    total_amount: "30.00", // factura de CI
    reference_number: "1234",
  };
  return <VerdictCreditorPDF {...params} />;
};

export default function PdfPage() {
  return (
    <PDFViewer width="100%" height="1000">
      {/* <VerdictCompanyComponent /> */}
      {/* <VerdictDebtorComponent /> */}
      <VerdictCreditoComponent />
      {/* <BlokkadeComponent /> */}
      {/* <AanmanningComponent /> */}
    </PDFViewer>
  );
}
