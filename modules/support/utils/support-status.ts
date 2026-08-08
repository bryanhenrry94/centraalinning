import { SupportMessageStatus, SupportMessageType } from "@/modules/support/constants/support-message";

type StatusColor = "default" | "info" | "warning" | "success" | "error";

const SUPPORT_MESSAGE_STATUS_CONFIG: Record<string, { label: string; color: StatusColor }> = {
  RECEIVED: { label: "Ontvangen", color: "info" },
  IN_PROGRESS: { label: "In behandeling", color: "warning" },
  ANSWERED: { label: "Beantwoord", color: "success" },
  CLOSED: { label: "Gesloten", color: "default" },
};

export function getSupportMessageStatusInfo(status: string) {
  return (
    SUPPORT_MESSAGE_STATUS_CONFIG[status] ?? {
      label: status,
      color: "default" as StatusColor,
    }
  );
}

const SUPPORT_MESSAGE_TYPE_LABELS: Record<string, string> = {
  SUGGESTION: "Tip",
  COMPLAINT: "Klacht",
  TECHNICAL_ISSUE: "Technisch probleem",
};

export function getSupportMessageTypeLabel(type: string) {
  return SUPPORT_MESSAGE_TYPE_LABELS[type] ?? type;
}

// Kleuren van het bestaande systeempalet (shared/theme/ThemeProvider.tsx) —
// geen losse hexwaarden, zodat dit consistent blijft met de rest van de app.
// "warning" is hier het gele accent (theme.palette.warning.main = geel/amber
// uit shared/theme/colors.ts) — icoon/titel worden in het component in bijna
// zwart getekend voor voldoende contrast (geel is te licht als tekstkleur).
type TypeAccent = "primary" | "secondary" | "error" | "warning";

const SUPPORT_MESSAGE_TYPE_META: Record<
  string,
  { description: string; accent: TypeAccent }
> = {
  SUGGESTION: {
    description: "Heeft u een idee of suggestie die CFSB kan verbeteren?",
    accent: "warning",
  },
  COMPLAINT: {
    description: "Niet tevreden over onze dienstverlening? Laat het ons weten.",
    accent: "error",
  },
  TECHNICAL_ISSUE: {
    description: "Ervaart u een technisch probleem in het systeem?",
    accent: "secondary",
  },
};

export const SUPPORT_MESSAGE_TYPE_OPTIONS = Object.values(SupportMessageType).map((type) => ({
  value: type,
  label: getSupportMessageTypeLabel(type),
  ...SUPPORT_MESSAGE_TYPE_META[type],
}));

export const SUPPORT_MESSAGE_STATUS_OPTIONS = Object.values(SupportMessageStatus).map((status) => ({
  value: status,
  ...getSupportMessageStatusInfo(status),
}));
