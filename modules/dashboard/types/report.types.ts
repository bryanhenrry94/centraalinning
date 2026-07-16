export interface TableSummaryResponse {
  id: string;
  source: string;
  date: Date;
  reference_number: string;
  name: string;
  amount: number;
  status: string;
  statusColor:
    | "default"
    | "primary"
    | "secondary"
    | "error"
    | "info"
    | "success"
    | "warning";
  href: string;
}
