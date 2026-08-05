import { CaseTransferStatus } from "@prisma/client";

export { CaseTransferStatus };

// Estados en los que un CaseTransfer todavía puede llevar a un GOP (no está
// cerrado/rechazado/cancelado).
export const OPEN_CASE_TRANSFER_STATUSES = [
  CaseTransferStatus.PENDING_PAYMENT,
  CaseTransferStatus.PENDING_ACCEPTANCE,
  CaseTransferStatus.ACCEPTED,
  CaseTransferStatus.WORK_COMPLETED,
];

// Estados desde los que se puede registrar el primer vonnis (el que crea el
// LegalProcess): el bailiff-directo ya aceptó (ACCEPTED), o el abogado ya
// finalizó su trabajo y transfirió a un alguacil (WORK_COMPLETED).
export const CASE_TRANSFER_VERDICT_REGISTRABLE_STATUSES: CaseTransferStatus[] = [
  CaseTransferStatus.ACCEPTED,
  CaseTransferStatus.WORK_COMPLETED,
];
