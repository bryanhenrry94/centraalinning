"use client";
import dynamic from "next/dynamic";

const TestAanmaningPage = dynamic(() => import("./TestAanmaningPage"), {
  ssr: false,
});

const TestSommatiePage = dynamic(() => import("./TestSommatiePage"), {
  ssr: false,
});

const TestIngebrekestellingPage = dynamic(
  () => import("./TestIngebrekestellingPage"),
  {
    ssr: false,
  },
);

const TestBlokkadePage = dynamic(() => import("./TestBlokkadePage"), {
  ssr: false,
});

const FinancialSummaryPage = dynamic(() => import("./FinancialSummaryPage"), {
  ssr: false,
});

const TestInvoicePage = dynamic(() => import("./TestInvoicePage"), {
  ssr: false,
});

export default function TestPage() {
  return <TestInvoicePage />;
}
