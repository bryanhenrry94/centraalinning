"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BlockCheckService } from "@/modules/block-check/services/block-check.service";
import { ParameterService } from "@/modules/settings/services/parameter/parameter.service";
import { sendBlockCheckResultMail } from "@/modules/block-check/services/block-check-mail.service";

export const existsBlockCheck = async (search: string) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenant_id) {
    return { success: false };
  }

  // Precio del Blok-Check por isla/jurisdicción del tenant (punto 13 del
  // análisis CFSB).
  const parameter = await ParameterService.getParameterForTenant(session.user.tenant_id);
  const price = parameter?.blok_check_pricing ?? 0;

  const result = await BlockCheckService.existsBlockCheck(search, {
    tenantId: session.user.tenant_id,
    userId: session.user.id,
    price,
  });

  // Esta acción solo se invoca tras confirmar el pago (ver createService()
  // en app/(dashboard)/block-check/page.tsx), así que aquí enviamos siempre
  // el resultado por correo al cliente que pagó la consulta.
  if (result.success && result.data && session.user.email) {
    await sendBlockCheckResultMail(
      session.user.email,
      session.user.fullname || session.user.email,
      result.data,
    );
  }

  return result;
};
