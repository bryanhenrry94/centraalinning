export interface ActivationInvoiceInput {
  tenant_id: string;
  island: string;
  address?: string | null;
  fee_amount: number;
  abb_amount: number;
  digital_file_costs: number;
}
