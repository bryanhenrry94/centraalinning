"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ParameterService } from "@/modules/settings/services/parameter/parameter.service";

export async function getParameterAction() {
  return ParameterService.getParameter();
}

// A diferencia de getParameterAction (Parameter global, sin resolver por
// isla/tenant), esta resuelve la jerarquía Setting(tenant) -> Setting(isla)
// -> Jurisdiction -> Parameter global. Usar esta en pantallas que muestran
// un precio/plazo que también se cobra o valida vía getParameterForTenant,
// para que lo mostrado nunca pueda divergir de lo cobrado.
export async function getParameterForTenantAction() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenant_id) {
    return null;
  }

  return ParameterService.getParameterForTenant(session.user.tenant_id);
}
