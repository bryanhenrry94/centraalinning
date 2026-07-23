import { prisma } from "@/lib/prisma";
import { MembershipStatus } from "@prisma/client";

export class WorkspaceService {
  static async switchWorkspace(userId: string, tenantId: string) {
    const membership = await prisma.membership.findFirst({
      where: {
        user_id: userId,
        tenant_id: tenantId,
        status: MembershipStatus.ACTIVE,
      },
      include: { tenant: true, roles: true },
    });

    if (!membership) {
      throw new Error("U hebt geen toegang tot een werkruimte.");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { last_active_tenant_id: tenantId },
    });

    return {
      membership_id: membership.id,
      tenant_id: membership.tenant.id,
      company: membership.tenant.name,
      subdomain: membership.tenant.subdomain,
      status: membership.status,
      roles: membership.roles.map((role) => role.role),
    };
  }
}
