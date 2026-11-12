export interface TableSummaryResponse {
  id: string;
  source: string;
  date: Date;
  reference_number: string;
  name: string;
  amount: number;
  status: string;
  // Kan een MUI-semantische kleur zijn ("default"/"warning"/...) of een hex
  // uit de CFSB-paleta (zie shared/constants/status-colors.ts) — zie
  // StatusChip voor hoe dit gerenderd wordt.
  statusColor: string;
  href: string;
}
