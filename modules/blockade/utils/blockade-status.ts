export type ChipColor =
  | "default"
  | "primary"
  | "warning"
  | "info"
  | "error"
  | "success";

export const BLOCKADE_STATUS_CONFIG: Record<
  string,
  { label: string; color: ChipColor }
> = {
  DRAFT: { label: "Concept", color: "default" },
  ACTIVE: { label: "Actief", color: "error" },
  SUSPENDED: { label: "Opgeschort", color: "warning" },
};

export function getBlockadeStatusInfo(status: string) {
  return (
    BLOCKADE_STATUS_CONFIG[status] ?? { label: status, color: "default" as ChipColor }
  );
}
