export type DebtorSummary = {
  id: string;
  type: string;
  debtor_id: string;
  tenant_id: string;
  tenant_name: string;
  person_id: string;
  source_type: string;
  source_id: string;
  source_status: string;
  principal_amount: number;
  total_paid: number | null;
  total_fined: number | null;
  // Desglose de `total_paid` — cuánto de lo pagado fue al participante vs
  // directamente a CFSB (pagos directos + consolidados vía PaymentAllocation).
  paid_to_participant: number;
  paid_to_cfsb: number;
  balance: number;
  // Desglose de `balance` — ver script_mysql.sql (vw_debtor_summary,
  // obligations_summary): lo que el deudor le debe al participante y lo
  // que le debe a CFSB por separado (dos rutas de pago independientes).
  debtor_to_participant_balance: number;
  debtor_to_cfsb_balance: number;
  status: string;
  created_at: Date;
  updated_at: Date;
  reference: string | null;
  issue_date: Date | null;
  due_date: Date | null;
  amount: number | null;
  agreement_total_amount: number | null;
  agreement_installment_amount: number | null;
  agreement_installments_count: number | null;
  agreement_start_date: Date | null;
  agreement_end_date: Date | null;
  agreement_status: string | null;
};
