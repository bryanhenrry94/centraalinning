"use client";
import React from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import LoadingUI from "@/components/ui/loading-ui";
import DashboardSuperAdmin from "@/components/dashboard/superadmin/dashboard";
import { DashboardAdmin } from "@/components/dashboard/admin/dashboard";
import DashboardDebtor from "@/components/dashboard/debtor/dashboard";
import { $Enums } from "@prisma/client";
import { DashboardBailiff } from "@/components/dashboard/bailiff/dashboard";

const CompanyHomePage = () => {
  const { isAuthenticated, isLoading, user } = useAuthSession();

  if (isLoading) {
    return <LoadingUI />;
  }

  if (!isAuthenticated) return <>No autorizado. Por favor, inicie sesión.</>;

  if ((user as any)?.role === $Enums.UserRole.PLATFORM_OWNER) {
    return <DashboardSuperAdmin />;
  }

  if ((user as any)?.role === $Enums.UserRole.TENANT_ADMIN) {
    return <DashboardAdmin />;
  }

  if ((user as any)?.role === $Enums.UserRole.DEBTOR) {
    return <DashboardDebtor />;
  }

  if ((user as any)?.role === $Enums.UserRole.BAILIFF) {
    return <DashboardBailiff />;
  }

  return <div>Rol de usuario no reconocido.</div>;
};

export default CompanyHomePage;
