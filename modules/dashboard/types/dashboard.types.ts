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

  documents: Array<{
    id: string;
    source: string;
    date: Date;
    reference_number: string;
    name: string;
    amount: number;
    status: string;
  }>;
}
