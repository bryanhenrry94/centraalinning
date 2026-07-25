import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/shared/constants/user-role";
import DashboardDebtor from "@/modules/dashboard/components/legacy/debtor/dashboard";
import DashboardContent from "@/modules/dashboard/components/DashboardContent";
import { getDashboard } from "@/modules/dashboard/server/dashboard.service";

export default async function Page() {
  const session = await getServerSession(authOptions);

  if (session?.user?.roles?.includes(UserRole.DEBTOR)) {
    return <DashboardDebtor />;
  }

  const dashboard = await getDashboard();

  return <DashboardContent dashboard={dashboard} />;
}
