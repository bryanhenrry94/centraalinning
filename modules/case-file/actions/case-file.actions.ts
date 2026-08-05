"use server";

import { CaseFileService } from "@/modules/case-file/services/case-file.service";
import { requireAuthorizedForCaseFile } from "@/modules/case-file/services/case-file-guards";

export const getCaseFileForDebtClaim = async (debtClaimId: string) => {
  await requireAuthorizedForCaseFile(debtClaimId);
  return CaseFileService.getForDebtClaim(debtClaimId);
};
