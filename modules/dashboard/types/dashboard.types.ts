import { TableSummaryResponse } from "@/modules/dashboard/types/report.types";

export interface DashboardStats {
  total: number;
  active: number;
  completed: number;
  blocked: number;
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
}
