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

  const parameter = await ParameterService.getParameter();
  const price = parameter?.blok_check_pricing ?? 30;

  return BlockCheckService.existsBlockCheck(search, {
    tenantId: session.user.tenant_id,
    userId: session.user.id,
    price,
  });
};
