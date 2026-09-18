"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ParameterService } from "@/modules/settings/services/parameter/parameter.service";

// Resuelve la jerarquía Setting(tenant) -> Setting(isla) -> Jurisdiction ->
// default fijo (ver ParameterService.getParameterForTenant). Es la única
// forma soportada de leer estos parámetros — así lo mostrado en pantalla
// nunca puede divergir de lo que efectivamente se cobra/valida.
export async function getParameterForTenantAction() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenant_id) {
    return null;
  }

  return ParameterService.getParameterForTenant(session.user.tenant_id);
}
