"use server";

import { ParameterService } from "@/modules/settings/services/parameter/parameter.service";

export async function getParameterAction() {
  return ParameterService.getParameter();
}
