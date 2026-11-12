import { LegalProcessStatus } from "@/modules/legal-process/constants/legal-process-status";
import { STATUS_HEX } from "@/shared/constants/status-colors";

export const OPEN_LEGAL_PROCESS_STATUSES = [
  LegalProcessStatus.GOP_ACTIVE,
  LegalProcessStatus.GOP_INACTIVE,
] as const;

export const COMPLETED_LEGAL_PROCESS_STATUSES = [LegalProcessStatus.CLOSED] as const;

// GOP_INACTIVE staat voor "In onderzoek naar executiemogelijkheden": geen
// actuele beslagmogelijkheid sluit het dossier nooit vanzelf — zie
// LegalProcessService.markInactive.
// Paleta CFSB aprobada (zie shared/constants/status-colors.ts): blauw =
// lopend/in afwachting, oranje = aandacht/actie vereist, groen = afgerond.
const LEGAL_PROCESS_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  // Label corto (CCP-beslissing, ajuste sponsor): de deurwaarder ya completó
  // la registratie, solo faltan los pagos que liberan GOP_ACTIVE. El número
  // GOP (secuencia única, ver CaseTransferService.generateGopNumber) ya
  // existe desde antes — nunca se reasigna ni se oculta en este estado.
  GOP_DRAFT: { label: "Wacht op betaling", color: STATUS_HEX.blue },
  GOP_ACTIVE: { label: "GOP actief", color: STATUS_HEX.blue },
  GOP_INACTIVE: {
    label: "In onderzoek naar executiemogelijkheden",
    color: STATUS_HEX.orange,
  },
  CLOSED: { label: "Afgerond", color: STATUS_HEX.green },
};

export function getLegalProcessStatusInfo(status: string) {
  return (
    LEGAL_PROCESS_STATUS_CONFIG[status] ?? {
      label: status,
      color: STATUS_HEX.grey,
    }
  );
}

const GOP_INACTIVE_REASON_LABELS: Record<string, string> = {
  NO_SEIZABLE_ASSETS: "Geen beslagbare goederen",
  DEBTOR_ABROAD: "Debiteur woont in het buitenland",
  NO_INCOME: "Geen inkomen",
  NO_ATTACHABLE_PROPERTY: "Geen beslagbaar vermogen",
  OTHER: "Andere reden",
};

export function getGopInactiveReasonLabel(reason: string) {
  return GOP_INACTIVE_REASON_LABELS[reason] ?? reason;
}
