"use server";

import { DossierService } from "@/modules/dossier/services/dossier.service";
import { requireTenantStaff } from "@/modules/dossier/services/dossier-guards";

export const getMyDossiers = async () => {
  const session = await requireTenantStaff();
  return DossierService.getForTenant(session.user.tenant_id);
};
