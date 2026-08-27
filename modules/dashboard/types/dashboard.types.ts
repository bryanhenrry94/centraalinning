import { TableSummaryResponse } from "@/modules/dashboard/types/report.types";

export interface DashboardStats {
  total: number;
  active: number;
  completed: number;
  blocked: number;
}

// Een concrete, al vertaalde beslissing die de deelnemer moet nemen — zie
// PendingActionsService.getForTenant. Geen technische status/enum: label is
// al de tekst die op het dashboard getoond wordt (feedback sponsor, sectie 12
// "Actie vereist").
export interface PendingAction {
  id: string;
  module: "AOP" | "COP" | "GOP";
  reference: string;
  label: string;
  href: string;
}

export interface DashboardResponse {
  stats: DashboardStats;

  status: Array<{
    name: string;
    value: number;
  }>;

  modules: Array<{
    name: string;
    value: number;
  }>;

  documents: TableSummaryResponse[];

  pendingActions: PendingAction[];
}
