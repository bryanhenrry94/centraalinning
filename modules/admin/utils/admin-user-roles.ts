// Etiquetas/colores de Chip para de rollen van een gebruiker per deelnemer
// (CFSB Admin > Gebruikers & rollen). Dit is een identiteits-badge, geen
// status — daarom een eigen kleurset i.p.v. AdminChipColor (admin-status.ts):
// "secondary" is hier prima (geen state-oordeel zoals bij success/error voor
// workflow-statussen), maar "warning" blijft uit dezelfde reden als daar
// vermeden (geel in dit theme, past niet bij CFSB Admin).
export type RoleChipColor =
  | "default"
  | "primary"
  | "secondary"
  | "info"
  | "success"
  | "error";

export type RoleBadgeInfo = { label: string; color: RoleChipColor };

const ROLE_BADGES: Record<string, RoleBadgeInfo> = {
  // Binnen een Membership betekent PLATFORM_OWNER altijd de CFSB-platform-
  // beheerder (enige houder: de ADMIN_TENANT-membership) — niet "Klant" zoals
  // role-list.ts elders gebruikt voor de tenant-eigenaar bij signup, dat is
  // een ander gebruik van dezelfde enum-waarde (sponsor feedback 2026-09-29).
  PLATFORM_OWNER: { label: "Platformbeheerder", color: "default" },
  TENANT_ADMIN: { label: "Beheerder deelnemer", color: "success" },
  AGENT: { label: "Medewerker", color: "info" },
  EMPLOYEE: { label: "Werknemer", color: "default" },
  DEBTOR: { label: "Debiteur", color: "primary" },
  BAILIFF: { label: "Deurwaarder", color: "secondary" },
  LAWYER: { label: "Advocaat", color: "info" },
  BANK: { label: "Bank", color: "default" },
};

export function getRoleBadgeInfo(role: string): RoleBadgeInfo {
  return ROLE_BADGES[role] ?? { label: role, color: "default" };
}
