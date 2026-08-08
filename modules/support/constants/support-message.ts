// Espejo TS de los enums Prisma SupportMessageType/SupportMessageStatus —
// mismo patrón que modules/legal-process/constants/legal-process-status.ts.
export enum SupportMessageType {
  SUGGESTION = "SUGGESTION",
  COMPLAINT = "COMPLAINT",
  TECHNICAL_ISSUE = "TECHNICAL_ISSUE",
}

export enum SupportMessageStatus {
  RECEIVED = "RECEIVED",
  IN_PROGRESS = "IN_PROGRESS",
  ANSWERED = "ANSWERED",
  CLOSED = "CLOSED",
}

export const OPEN_SUPPORT_MESSAGE_STATUSES = [
  SupportMessageStatus.RECEIVED,
  SupportMessageStatus.IN_PROGRESS,
  SupportMessageStatus.ANSWERED,
];
