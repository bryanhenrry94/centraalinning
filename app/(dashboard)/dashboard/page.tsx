import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/shared/constants/user-role";
import DashboardDebtor from "@/modules/dashboard/components/legacy/debtor/dashboard";
import { DashboardLawyer } from "@/modules/dashboard/components/legacy/lawyer/dashboard";
import { DashboardBailiff } from "@/modules/dashboard/components/legacy/bailiff/dashboard";
import DashboardContent from "@/modules/dashboard/components/DashboardContent";
import { getDashboard } from "@/modules/dashboard/server/dashboard.service";
import { AdminDashboard } from "@/modules/admin/components/admin-dashboard";

export default async function Page() {
  const session = await getServerSession(authOptions);

  if (session?.user?.roles?.includes(UserRole.DEBTOR)) {
    return <DashboardDebtor />;
  }

  if (session?.user?.roles?.includes(UserRole.LAWYER)) {
    return <DashboardLawyer />;
  }

  if (session?.user?.roles?.includes(UserRole.BAILIFF)) {
    return <DashboardBailiff />;
  }

  // PLATFORM_OWNER krijgt het cross-tenant admin-dashboard, nooit het
  // dashboard van een deelnemer (dat was de bug: zonder deze tak viel
  // PLATFORM_OWNER terug op DashboardContent hieronder, tenant-scoped op
  // welke tenant zijn sessie toevallig had).
  if (session?.user?.roles?.includes(UserRole.PLATFORM_OWNER)) {
    return <AdminDashboard />;
  }

  const dashboard = await getDashboard();

  return <DashboardContent dashboard={dashboard} />;
}
