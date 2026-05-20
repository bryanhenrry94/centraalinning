"use client";
import dynamic from "next/dynamic";

const TestAanmaningPage = dynamic(() => import("./TestAanmaningPage"), {
  ssr: false,
});

const TestSommatiePage = dynamic(() => import("./TestSommatiePage"), {
  ssr: false,
});

export default function TestPage() {
  return <TestSommatiePage />;
}
