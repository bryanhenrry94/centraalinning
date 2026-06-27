// "use client";
// import { useAuthSession } from "@/hooks/useAuthSession";
// import DashboardSuperAdmin from "@/components/dashboard/superadmin/dashboard";
// import { DashboardAdmin } from "@/components/dashboard/admin/dashboard";
// import DashboardDebtor from "@/components/dashboard/debtor/dashboard";
// import { DashboardBailiff } from "@/components/dashboard/bailiff/dashboard";
// import { UserRole } from "@/constants/user-role";

// const HomePage = () => {
//   const { isAuthenticated, isLoading, user } = useAuthSession();

//   console.log("User session:", { isAuthenticated, user });

//   if (isLoading) {
//     return <>Cargando...</>;
//   }

//   if (!isAuthenticated) return <>No autorizado. Por favor, inicie sesión.</>;

//   if (user?.roles.includes(UserRole.PLATFORM_OWNER)) {
//     return <DashboardSuperAdmin />;
//   }

//   if (user?.roles.includes(UserRole.TENANT_ADMIN)) {
//     return <DashboardAdmin />;
//   }

//   if (user?.roles.includes(UserRole.DEBTOR)) {
//     return <DashboardDebtor />;
//   }

//   if (user?.roles.includes(UserRole.BAILIFF)) {
//     return <DashboardBailiff />;
//   }

//   return <>Rol de usuario no reconocido.</>;
// };

// export default HomePage;

import DashboardContent from "@/modules/dashboard/components/DashboardContent";
import { getDashboard } from "@/modules/dashboard/server/dashboard.service";

export default async function Page() {
  const dashboard = await getDashboard();

  return <DashboardContent dashboard={dashboard} />;
}
