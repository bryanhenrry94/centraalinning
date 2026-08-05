"use server";

import { JurisdictionService } from "@/modules/jurisdiction/services/jurisdiction.service";

export const getActiveJurisdictions = async () => {
  return JurisdictionService.getActive();
};

export const getAllJurisdictions = async () => {
  return JurisdictionService.getAll();
};
