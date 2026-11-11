"use server";

import { DossierService } from "@/modules/dossier/services/dossier.service";
import { requireTenantStaff } from "@/modules/dossier/services/dossier-guards";
import { BlockCheckService } from "@/modules/block-check/services/block-check.service";

export const getMyDossiers = async () => {
  const session = await requireTenantStaff();
  return DossierService.getForTenant(session.user.tenant_id);
};

export const sendBlockCheckInvitation = async (blockCheckId: string) => {
  const session = await requireTenantStaff();
  return BlockCheckService.inviteForFinancialDeclaration(blockCheckId, {
    tenantId: session.user.tenant_id,
    actorUserId: session.user.id,
  });
};
