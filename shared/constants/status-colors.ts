// Paleta de estado aprobada (documento "CFSB – Volledig overzicht van alle
// statussen en kleuren"). Hex exactos — no coinciden con los colores
// semánticos por defecto de MUI (warning/error/success/info), así que los
// status configs que deben respetar esta paleta usan estos valores
// directamente en vez del prop `color` de <Chip>.
export const STATUS_HEX = {
  // Betaald, bevestigd, voltooid, geen blokkade
  green: "#16834B",
  // Lopend, verzonden, in behandeling
  blue: "#1467BB",
  // Gedeeltelijk betaald, aandacht of actie vereist
  orange: "#E76B0B",
  // Achterstallig, niet nagekomen, actieve blokkade
  red: "#C72C30",
  // Concept, geannuleerd, ingetrokken of overgedragen
  grey: "#8B8F98",
} as const;

export type StatusHexColor = (typeof STATUS_HEX)[keyof typeof STATUS_HEX];
