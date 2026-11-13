import { DossierServiceType } from "@/modules/dossier/types/dossier.types";

// Zelfde routes als de "newLink" waarden in app/(dashboard)/workstation/page.tsx
// — hier als statische data gedupliceerd (geen gedeelde import) om die
// pagina ongemoeid te laten.
export const DOSSIER_SERVICE_SHORTCUTS: {
  type: DossierServiceType;
  label: string;
  href: string;
}[] = [
  { type: "FAR", label: "FAR", href: "/financial-agreements/new" },
  { type: "BLC", label: "BLC", href: "/block-check" },
  { type: "AOP", label: "AOP", href: "/collections/new" },
  { type: "BLK", label: "BLK", href: "/blocks/new" },
  { type: "COP", label: "COP", href: "/collective-follow-up/new" },
  { type: "GOP", label: "GOP", href: "/legal-processes/new" },
];
