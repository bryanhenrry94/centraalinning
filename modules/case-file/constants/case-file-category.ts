// Categorías del expediente digital centralizado — agrupa documentos y
// registros de todos los servicios (FAR/AOP/BLC/BLK/COP/Overdracht/GOP) que
// hoy viven en tablas separadas por módulo. Ver docs/plan-alineacion-cfsb.md
// sección 2.7: servicio de agregación virtual, sin tabla física nueva.
export enum CaseFileCategory {
  CONTRACT = "CONTRACT",
  FAR = "FAR",
  AOP_LETTER = "AOP_LETTER",
  BLOCKADE = "BLOCKADE",
  COP = "COP",
  TRANSFER = "TRANSFER",
  LEGAL_PROCESS = "LEGAL_PROCESS",
  VERDICT = "VERDICT",
  LAWYER_INVOICE = "LAWYER_INVOICE",
  BAILIFF_INVOICE = "BAILIFF_INVOICE",
  PAYMENT_PROOF = "PAYMENT_PROOF",
}

export const CASE_FILE_CATEGORY_LABEL: Record<CaseFileCategory, string> = {
  [CaseFileCategory.CONTRACT]: "Overeenkomst",
  [CaseFileCategory.FAR]: "FAR",
  [CaseFileCategory.AOP_LETTER]: "AOP-brief",
  [CaseFileCategory.BLOCKADE]: "Blokkade",
  [CaseFileCategory.COP]: "Collectieve opvolging",
  [CaseFileCategory.TRANSFER]: "Overdracht",
  [CaseFileCategory.LEGAL_PROCESS]: "Gerechtelijk document",
  [CaseFileCategory.VERDICT]: "Vonnis",
  [CaseFileCategory.LAWYER_INVOICE]: "Advocaatfactuur",
  [CaseFileCategory.BAILIFF_INVOICE]: "Deurwaarderfactuur",
  [CaseFileCategory.PAYMENT_PROOF]: "Betalingsbewijs",
};
