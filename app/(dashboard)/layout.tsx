"use client";
import { ReactNode } from "react";
import { AdminLayout } from "@/shared/ui/layout/admin-layout";

export default function AdminLayoutWrapper({ children }: { children: ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
