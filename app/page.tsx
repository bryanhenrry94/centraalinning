"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import DashboardSuperAdmin from "@/modules/dashboard/components/legacy/superadmin/dashboard";
import { DashboardAdmin } from "@/modules/dashboard/components/legacy/admin/dashboard";
import DashboardDebtor from "@/modules/dashboard/components/legacy/debtor/dashboard";
import { DashboardBailiff } from "@/modules/dashboard/components/legacy/bailiff/dashboard";
import { UserRole } from "@/shared/constants/user-role";

const HomePage = () => {
  const { isAuthenticated, isLoading, user } = useAuthSession();
  const router = useRouter();

  console.log("User session:", { isAuthenticated, user });

  // El abogado todavía no tiene un dashboard propio (ver plan GOP, Fase 7):
  // lo enviamos directo a sus expedientes en vez de mostrar un rol
  // "no reconocido".
  useEffect(() => {
    if (user?.roles.includes(UserRole.LAWYER)) {
      router.replace("/legal-processes");
    }
  }, [user, router]);

  if (isLoading) {
    return <>Cargando...</>;
  }

  if (!isAuthenticated) return <>No autorizado. Por favor, inicie sesión.</>;

  if (user?.roles.includes(UserRole.PLATFORM_OWNER)) {
    return <DashboardSuperAdmin />;
  }

  if (user?.roles.includes(UserRole.TENANT_ADMIN)) {
    return <DashboardAdmin />;
  }

  if (user?.roles.includes(UserRole.DEBTOR)) {
    return <DashboardDebtor />;
  }

  if (user?.roles.includes(UserRole.BAILIFF)) {
    return <DashboardBailiff />;
  }

  if (user?.roles.includes(UserRole.LAWYER)) {
    return <>Doorverwijzen naar uw dossiers...</>;
  }

  return <>Rol de usuario no reconocido.</>;
};

export default HomePage;
