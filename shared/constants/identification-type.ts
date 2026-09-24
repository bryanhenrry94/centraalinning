export enum IdentificationType {
  CEDULA = "CEDULA",
  KVK = "KVK",
  PASSPORT = "PASSPORT",
  RIJBEWIJS = "RIJBEWIJS",
}

export const IDENTIFICATION_TYPE_LABELS: Record<IdentificationType, string> = {
  [IdentificationType.CEDULA]: "Cédula",
  [IdentificationType.KVK]: "KvK-nummer",
  [IdentificationType.PASSPORT]: "Paspoort",
  [IdentificationType.RIJBEWIJS]: "Rijbewijs",
};