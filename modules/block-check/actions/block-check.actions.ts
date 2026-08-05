"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BlockCheckService } from "@/modules/block-check/services/block-check.service";
import { ParameterService } from "@/modules/settings/services/parameter/parameter.service";

export const existsBlockCheck = async (search: string) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenant_id) {
    return { success: false };
  }

  // Precio del Blok-Check por isla/jurisdicción del tenant (punto 13 del
  // análisis CFSB).
  const parameter = await ParameterService.getParameterForTenant(session.user.tenant_id);
  const price = parameter?.blok_check_pricing ?? 0;

  return BlockCheckService.existsBlockCheck(search, {
    tenantId: session.user.tenant_id,
    userId: session.user.id,
    price,
  });
};
