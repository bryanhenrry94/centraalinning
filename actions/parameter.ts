"use server";

import { ParameterService } from "@/services/parameter/parameter.service";

export async function getParameterAction() {
  return ParameterService.getParameter();
}
