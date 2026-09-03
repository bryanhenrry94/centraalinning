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
  // análisis CFSB). El parámetro es el precio neto (excl. ABB); el usuario
  // final paga y ve siempre precio + 6% ABB encima, así que el precio que
  // queda registrado en el audit trail (BlockCheck.price) refleja lo que
  // realmente se cobró, no el valor neto del parámetro.
  const parameter = await ParameterService.getParameterForTenant(session.user.tenant_id);
  const basePrice = parameter?.blok_check_pricing ?? 0;
  const abbRate = parameter?.abb_rate ?? 0;
  const price = Number((basePrice * (1 + abbRate / 100)).toFixed(2));

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
