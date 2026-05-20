"use client";
import dynamic from "next/dynamic";

const TestAanmaningPage = dynamic(() => import("./TestAanmaningPage"), {
  ssr: false,
});

export default function TestPage() {
  return <TestAanmaningPage />;
}
