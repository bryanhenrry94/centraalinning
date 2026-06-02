"use client";
import { useAuthSession } from "@/hooks/useAuthSession";
import { DashboardAdmin } from "@/components/dashboard/admin/dashboard";

const ClientHomePage = () => {
  const { isAuthenticated, isLoading, user } = useAuthSession();

  if (isLoading) {
    return <>Cargando...</>;
  }

  if (!isAuthenticated) return <>No autorizado. Por favor, inicie sesión.</>;

  return <DashboardAdmin />;
};

export default ClientHomePage;
