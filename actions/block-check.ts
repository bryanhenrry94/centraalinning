"use server";

import { BlockCheckService } from "@/services/block-check/block-check.service";

export const existsBlockCheck = async (search: string) => {
  const res = await BlockCheckService.existsBlockCheck(search);
  return res;
};
