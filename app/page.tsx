"use client";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import DashboardSuperAdmin from "@/modules/dashboard/components/legacy/superadmin/dashboard";
import { DashboardAdmin } from "@/modules/dashboard/components/legacy/admin/dashboard";
import DashboardDebtor from "@/modules/dashboard/components/legacy/debtor/dashboard";
import { DashboardBailiff } from "@/modules/dashboard/components/legacy/bailiff/dashboard";
import { DashboardLawyer } from "@/modules/dashboard/components/legacy/lawyer/dashboard";
import { UserRole } from "@/shared/constants/user-role";

const HomePage = () => {
  const { isAuthenticated, isLoading, user } = useAuthSession();

  console.log("User session:", { isAuthenticated, user });

  if (isLoading) {
    return <>Laden...</>;
  }

  if (!isAuthenticated) return <>Niet geautoriseerd. Log alstublieft in.</>;

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
    return <DashboardLawyer />;
  }

  return <>Gebruikersrol niet herkend.</>;
};

export default HomePage;
